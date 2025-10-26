"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type Diagram = {
  id: string;
  name: string;
  ownerEmail?: string;
};

export default function Tabla() {
  const { data: session } = useSession();
  const [ownDiagrams, setOwnDiagrams] = useState<Diagram[]>([]);
  const [sharedDiagrams, setSharedDiagrams] = useState<Diagram[]>([]);
  const [shareModal, setShareModal] = useState<{
    isOpen: boolean;
    diagramId: string;
    diagramName: string;
  }>({
    isOpen: false,
    diagramId: '',
    diagramName: ''
  });
  const [shareEmail, setShareEmail] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareMessage, setShareMessage] = useState<{
    type: 'success' | 'error' | '';
    text: string;
  }>({ type: '', text: '' });

  // Estados para el modal de crear diagrama
  const [createModal, setCreateModal] = useState(false);
  const [createDiagramName, setCreateDiagramName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Estados para el modal de editar nombre
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    diagramId: string;
    currentName: string;
  }>({
    isOpen: false,
    diagramId: '',
    currentName: ''
  });
  const [editDiagramName, setEditDiagramName] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    const fetchDiagrams = async () => {
      if (!session?.user?.token) return; // Esperar a que haya token
      const token = session.user.token;

      // Diagramas propios
      const resOwn = await fetch("/api/diagrams", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const own = await resOwn.json();
      setOwnDiagrams(
        own.map((d: any) => ({
          id: d.id.toString(),
          name: d.name,
        }))
      );

      // Diagramas compartidos
      const resShared = await fetch("/api/diagrams/shared", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const shared = await resShared.json();
      setSharedDiagrams(
        shared.map((d: any) => ({
          id: d.id.toString(),
          name: d.name,
          ownerEmail: d.owner?.email || "",
        }))
      );
    };

    fetchDiagrams();
  }, [session]); // 📌 dependemos de session para asegurar token

  const handleRedirect = (id: string) => {
    window.location.href = `/diagrama/${id}`;
  };

  const handleAddDiagram = () => {
    setCreateModal(true);
    setCreateDiagramName('');
  };

  const handleCreateDiagram = async () => {
    if (!createDiagramName.trim() || !session?.user?.token) return;
    
    setCreateLoading(true);

    try {
      const token = session.user.token;

      const res = await fetch("/api/diagrams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: createDiagramName.trim() }),
      });

      if (!res.ok) {
        throw new Error('Error al crear el diagrama');
      }

      const newDiagram = await res.json();
      setCreateModal(false);
      handleRedirect(newDiagram.id.toString());
    } catch (error) {
      console.error('Error creating diagram:', error);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleOpenEditModal = (diagramId: string, currentName: string) => {
    setEditModal({
      isOpen: true,
      diagramId,
      currentName
    });
    setEditDiagramName(currentName);
  };

  const handleEditDiagram = async () => {
    if (!editDiagramName.trim() || !session?.user?.token) return;
    
    setEditLoading(true);

    try {
      const token = session.user.token;
      console.log(editModal.diagramId);
      const res = await fetch(`/api/diagrams/${editModal.diagramId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: editDiagramName.trim() }),
      });

      if (!res.ok) {
        throw new Error('Error al actualizar el diagrama');
      }

      // Actualizar la lista local
      setOwnDiagrams(prev => 
        prev.map(diagram => 
          diagram.id === editModal.diagramId 
            ? { ...diagram, name: editDiagramName.trim() }
            : diagram
        )
      );

      setEditModal({
        isOpen: false,
        diagramId: '',
        currentName: ''
      });
    } catch (error) {
      console.error('Error updating diagram:', error);
    } finally {
      setEditLoading(false);
    }
  };

  const handleOpenShareModal = (diagramId: string, diagramName: string) => {
    setShareModal({
      isOpen: true,
      diagramId,
      diagramName
    });
    setShareEmail('');
    setShareMessage({ type: '', text: '' });
  };

  const handleCloseShareModal = () => {
    setShareModal({
      isOpen: false,
      diagramId: '',
      diagramName: ''
    });
    setShareEmail('');
    setShareMessage({ type: '', text: '' });
    setShareLoading(false);
  };

  const handleShareDiagram = async () => {
    if (!shareEmail.trim() || !session?.user?.token) return;
    
    setShareLoading(true);
    setShareMessage({ type: '', text: '' });

    try {
      const token = session.user.token;
      
      // Primero, obtener el ID del usuario por email
      const userResponse = await fetch(`/api/users/${encodeURIComponent(shareEmail)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!userResponse.ok) {
        throw new Error('Usuario no encontrado');
      }

      const userData = await userResponse.json();
      const userId = userData.id;

      // Compartir el diagrama
      const shareResponse = await fetch(`/api/diagrams/${shareModal.diagramId}/share/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!shareResponse.ok) {
        const errorData = await shareResponse.json();
        throw new Error(errorData.message || 'Error al compartir el diagrama');
      }

      setShareMessage({
        type: 'success',
        text: `Diagrama compartido exitosamente con ${shareEmail}`
      });

      // Limpiar el email después de 2 segundos
      setTimeout(() => {
        setShareEmail('');
        setShareMessage({ type: '', text: '' });
      }, 2000);

    } catch (error: any) {
      setShareMessage({
        type: 'error',
        text: error.message || 'Error al compartir el diagrama'
      });
    } finally {
      setShareLoading(false);
    }
  };

  const DiagramTable = ({
    diagrams,
    type,
  }: {
    diagrams: Diagram[];
    type: "own" | "shared";
  }) => (
    <div className="mb-4 grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="relative flex flex-col bg-clip-border rounded-xl bg-gray-200 text-gray-700 shadow-md overflow-hidden xl:col-span-2">
        <div className="relative bg-clip-border rounded-xl overflow-hidden bg-transparent text-gray-700 shadow-none m-0 flex items-center justify-between p-6">
          <div>
            <h6 className="block antialiased tracking-normal font-sans text-base font-semibold leading-relaxed text-blue-gray-900 mb-1">
              {type === "own" ? "Mis Proyectos" : "Proyectos Compartidos"}
            </h6>
            <p className="antialiased font-sans text-sm leading-normal flex items-center gap-1 font-normal text-blue-gray-600">
              <strong>{diagrams.length} proyectos</strong>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {type === "own" && (
              <button
                onClick={handleAddDiagram}
                className="font-sans font-medium text-xs text-white bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded-lg"
              >
                Añadir Diagrama
              </button>
            )}
          </div>
        </div>

        <div className="p-6 overflow-x-scroll px-0 pt-0 pb-2">
          <table className="w-full min-w-[640px] table-auto">
            <thead>
              <tr>
                <th className="border-b border-blue-gray-50 py-3 px-6 text-left">
                  <p className="block antialiased font-sans text-[11px] font-medium uppercase text-blue-gray-400">
                    Nombre
                  </p>
                </th>
                {type === "shared" && (
                  <th className="border-b border-blue-gray-50 py-3 px-6 text-left">
                    <p className="block antialiased font-sans text-[11px] font-medium uppercase text-blue-gray-400">
                      Propietario
                    </p>
                  </th>
                )}
                <th className="border-b border-blue-gray-50 py-3 px-6 text-left">
                  <p className="block antialiased font-sans text-[11px] font-medium uppercase text-blue-gray-400">
                    Acción
                  </p>
                </th>
              </tr>
            </thead>
            <tbody>
              {diagrams.map((d) => (
                <tr key={d.id}>
                  <td className="py-3 px-5 border-b border-blue-gray-50">
                    <div className="flex items-center gap-4">
                      <p className="block antialiased font-sans text-sm leading-normal text-blue-gray-900 font-bold">
                        {d.name}
                      </p>
                    </div>
                  </td>
                  {type === "shared" && (
                    <td className="py-3 px-5 border-b border-blue-gray-50">
                      <p className="block antialiased font-sans text-xs font-medium text-blue-gray-600">
                        {d.ownerEmail}
                      </p>
                    </td>
                  )}
                  <td className="py-3 px-5 border-b border-blue-gray-50">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRedirect(d.id)}
                        className={`${
                          type === "own"
                            ? "bg-blue-500 hover:bg-blue-600"
                            : "bg-green-500 hover:bg-green-600"
                        } text-white px-3 py-1 rounded text-xs font-medium transition-colors`}
                      >
                        Abrir
                      </button>
                      {type === "own" && (
                        <>
                          <button
                            onClick={() => handleOpenEditModal(d.id, d.name)}
                            className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleOpenShareModal(d.id, d.name)}
                            className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                          >
                            Compartir
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <main className="p-4">
      <DiagramTable diagrams={ownDiagrams} type="own" />
      <DiagramTable diagrams={sharedDiagrams} type="shared" />

      {/* Modal para compartir */}
      {shareModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Compartir Diagrama
              </h3>
              <button
                onClick={handleCloseShareModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Compartir "<strong>{shareModal.diagramName}</strong>" con:
              </p>
              <input
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="Ingresa el email del usuario"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={shareLoading}
              />
            </div>

            {shareMessage.text && (
              <div className={`mb-4 p-3 rounded-md ${
                shareMessage.type === 'success' 
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-red-100 text-red-700 border border-red-300'
              }`}>
                {shareMessage.text}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCloseShareModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                disabled={shareLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleShareDiagram}
                disabled={!shareEmail.trim() || shareLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 rounded-md transition-colors"
              >
                {shareLoading ? 'Compartiendo...' : 'Compartir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para crear diagrama */}
      {createModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Crear Nuevo Diagrama
              </h3>
              <button
                onClick={() => setCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del diagrama:
              </label>
              <input
                type="text"
                value={createDiagramName}
                onChange={(e) => setCreateDiagramName(e.target.value)}
                placeholder="Ingresa el nombre del diagrama"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={createLoading}
                autoFocus
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setCreateModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                disabled={createLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateDiagram}
                disabled={!createDiagramName.trim() || createLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 rounded-md transition-colors"
              >
                {createLoading ? 'Creando...' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar nombre */}
      {editModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Editar Nombre del Diagrama
              </h3>
              <button
                onClick={() => setEditModal({ isOpen: false, diagramId: '', currentName: '' })}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del diagrama:
              </label>
              <input
                type="text"
                value={editDiagramName}
                onChange={(e) => setEditDiagramName(e.target.value)}
                placeholder="Ingresa el nuevo nombre"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={editLoading}
                autoFocus
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setEditModal({ isOpen: false, diagramId: '', currentName: '' })}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                disabled={editLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleEditDiagram}
                disabled={!editDiagramName.trim() || editLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 rounded-md transition-colors"
              >
                {editLoading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}