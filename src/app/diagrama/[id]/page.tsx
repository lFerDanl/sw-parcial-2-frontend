// page.tsx
"use client";

import React, { useRef, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useDiagramSocket } from "@/hooks/useDiagramSocket";
import { useJointJS } from "@/hooks/useJointJs";
import { useDiagramClasses } from "@/hooks/useDiagramClasses";
import { useDiagramRelations } from "@/hooks/useDiagramRelations";
import { useDiagramPromptGeneration } from "@/hooks/usePromptGeneration";
import VoiceTextPrompt from "@/app/diagrama/components/voiceTextPromptProps";
import { useImageGeneration } from "@/hooks/useImageGeneration";

export default function DiagramPage() {
  const params = useParams() as { id?: string };
  const diagramId = params.id ? Number(params.id) : null;
  
  const paperRef = useRef<HTMLDivElement | null>(null);
  const selectedElementRef = useRef<any | null>(null);
  const selectedRelationRef = useRef<any | null>(null);
  const createClassModeRef = useRef(false);
  const removedCellsRef = useRef<Set<string>>(new Set());
  const isLoadingDiagramRef = useRef(false); // ✅ Flag para evitar emitir removes durante la carga
  
  const [createClassMode, setCreateClassMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<any | null>(null);
  const [selectedRelation, setSelectedRelation] = useState<any | null>(null);
  const [nameEdit, setNameEdit] = useState("");
  const [attributes, setAttributes] = useState<{ name: string; type: string }[]>([]);
  const [relationEdit, setRelationEdit] = useState({ type: '', label: '' });

  const DATA_TYPES = [
    'String',
    'Integer',
    'Long',
    'Double',
    'BigDecimal',
    'Boolean',
    'LocalDate',
    'LocalDateTime',
    'Byte',
    'Short',
    'Character',
  ];

  const { joint, graphRef, paperInstanceRef, shapesRef, isInitialized } = useJointJS(paperRef);
  const { socket, isConnected, hasJoined } = useDiagramSocket(diagramId, isInitialized);
  
  const { generateFromPrompt, isGenerating, error } = useDiagramPromptGeneration(
    diagramId,
    socket
  );

  const { generateFromImage, isGenerating: isGeneratingImage, error: imageError } = useImageGeneration(
    diagramId,
    socket
  );

  useEffect(() => {
    createClassModeRef.current = createClassMode;
  }, [createClassMode]);

  useEffect(() => {
    if (isInitialized && hasJoined) {
      console.log('✅ JointJS y Socket listos');
    }
  }, [isInitialized, hasJoined]);
  
  const {
    RELATION_TYPES,
    getRelationStyle,
    updateRelationType,
    getClassNameById
  } = useDiagramRelations(diagramId, socket, graphRef);
  
  const updateElementSizeAndLabel = (element: any) => {
    const data = element.get("classData") || {};
    const name = data.name || "Clase";
    const attrs = data.attributes || [];
    const attrText = attrs.map((a: any) => `${a.name}: ${a.type}`).join("\n");
    const fullText = name + (attrs.length ? "\n" + attrText : "");
    element.attr("label/text", fullText);
    element.resize(160, Math.max(60, 40 + attrs.length * 20));
  };

  const {
    createClassElement,
    createClassAt,
    updateClassName,
    removeClass,
    addAttribute,
    updateAttribute,
    removeAttribute
  } = useDiagramClasses(
    diagramId,
    socket,
    graphRef,
    shapesRef,
    updateElementSizeAndLabel
  );

  const clearSelection = () => {
    setSelectedElement(null);
    setSelectedRelation(null);
    selectedElementRef.current = null;
    selectedRelationRef.current = null;
    setNameEdit("");
    setAttributes([]);
    setRelationEdit({ type: '', label: '' });
  };

  const handleElementSelection = (cell: any) => {
    clearSelection();
    setSelectedElement(cell);
    selectedElementRef.current = cell;
    const data = cell.get("classData") || {};
    setNameEdit(data.name || "");
    setAttributes(data.attributes || []);
  };

  const handleRelationSelection = (cell: any) => {
    clearSelection();
    setSelectedRelation(cell);
    selectedRelationRef.current = cell;
    const relationType = cell.get('relationType') || 'OneToMany';
    setRelationEdit({ 
      type: relationType, 
      label: RELATION_TYPES[relationType as keyof typeof RELATION_TYPES]?.label || relationType 
    });
  };

  useEffect(() => {
    if (!isInitialized || !socket || !joint || !graphRef.current || !paperInstanceRef.current || !hasJoined) return;

    const graph = graphRef.current;
    const paper = paperInstanceRef.current;
    const { dia } = joint;

    paper.options.defaultLink = () => new dia.Link({
      attrs: getRelationStyle('OneToMany'),
      connector: { name: "rounded" },
      router: { name: "manhattan" },
      labels: [{ position: 0.5, attrs: { text: { text: "OneToMany", fontSize: 12, fill: '#333' } } }]
    });

    paper.on("element:pointerclick", (cellView: any, evt: any) => {
      evt.stopPropagation();
      handleElementSelection(cellView.model);
    });

    paper.on("link:pointerclick", (cellView: any, evt: any) => {
      evt.stopPropagation();
      handleRelationSelection(cellView.model);
    });

    paper.on("blank:pointerclick", (evt: any, x: number, y: number) => {
      if (createClassModeRef.current) {
        createClassAt(x, y);
      } else {
        clearSelection();
      }
    });

    paper.on('link:connect', function(linkView: any) {
      if (isLoadingDiagramRef.current) {
        return;
      }
      
      const link = linkView.model;
      const source = link.get('source');
      const target = link.get('target');
      
      if (!link.get('relationType')) {
        const defaultType = 'OneToMany';
        link.set('relationType', defaultType);
        link.attr(getRelationStyle(defaultType));
        
        const displayLabels = [{ 
          position: 0.5, 
          attrs: { 
            text: { 
              text: defaultType, 
              fontSize: 12, 
              fill: '#333' 
            } 
          } 
        }];
        link.labels(displayLabels);
        
        const linkData = {
          from: source.id,
          to: target.id,
          type: defaultType,
          vertices: link.get('vertices') || [],
          labels: [{ position: 0.5, text: defaultType }],
          attrs: getRelationStyle(defaultType),
          router: { name: "manhattan" },
          connector: { name: "rounded" }
        };

        socket.emit("relation:add", {
          diagramId,
          relationId: link.id,
          data: linkData
        });
      }
    });

    paper.on('link:pointermove link:pointerup', function(linkView: any) {
      if(isLoadingDiagramRef.current) {
        return;
      }

      const link = linkView.model;
      
      if (!graph.getCell(link.id)) {
        return;
      }
      
      const vertices = link.get('vertices') || [];
      socket.emit("relation:update", {
        diagramId,
        relationId: link.id,
        data: { vertices }
      });
    });

    graph.on('remove', function(cell: any) {
      if (isLoadingDiagramRef.current) {
        return;
      }
      
      if (removedCellsRef.current.has(cell.id)) {
        return;
      }
      removedCellsRef.current.add(cell.id);
      
      setTimeout(() => {
        removedCellsRef.current.delete(cell.id);
      }, 1000);
      
      if (cell.isLink && cell.isLink()) {
        socket.emit("relation:remove", { diagramId, relationId: cell.id });
        if (selectedRelationRef.current?.id === cell.id) clearSelection();
      } else if (cell.isElement && cell.isElement()) {
        if (selectedElementRef.current?.id === cell.id) clearSelection();
      }
    });

    paper.on("element:pointermove", (cellView: any) => {
      const cell = cellView.model;
      if (cell) {
        socket.emit("element:moving", { 
          diagramId, 
          elementId: cell.id, 
          position: cell.position() 
        });
      }
    });

    paper.on("element:pointerup", (cellView: any) => {
      const cell = cellView.model;
      if (cell) {
        socket.emit("element:moved", { 
          diagramId, 
          elementId: cell.id, 
          position: cell.position() 
        });
      }
    });

    socket.on("diagram:init", (payload: any) => {
      console.log('🔥 Diagrama recibido:', payload);
      const diagram = payload.diagram || payload;
      
      isLoadingDiagramRef.current = true;

      graph.startBatch('loading');
      
      graph.clear();

      Object.entries(diagram.elements || {}).forEach(([id, elem]: any) => {
        const element = createClassElement(id, elem);
        if (element) {
          graph.addCell(element);
          updateElementSizeAndLabel(element);
        }
      });

      Object.entries(diagram.relations || {}).forEach(([rid, rel]: any) => {
        const displayLabels = rel.labels?.map((label: any) => {
          if (label.attrs) return label;
          return {
            position: label.position || 0.5,
            attrs: {
              text: {
                text: label.text || rel.type || "OneToMany",
                fontSize: 12,
                fill: '#333'
              }
            }
          };
        }) || [{ 
          position: 0.5, 
          attrs: { 
            text: { 
              text: rel.type || "OneToMany", 
              fontSize: 12, 
              fill: '#333' 
            } 
          } 
        }];

        const link = new dia.Link({
          id: rid,
          source: { id: rel.from },
          target: { id: rel.to },
          vertices: rel.vertices || [],
          labels: displayLabels,
          attrs: rel.attrs || getRelationStyle(rel.type || 'OneToMany'),
          router: rel.router || { name: "manhattan" },
          connector: rel.connector || { name: "rounded" }
        });
        link.set('relationType', rel.type || 'OneToMany');
        graph.addCell(link);
      });
      
      // ✅ Desactivar flag después de un pequeño delay
      setTimeout(() => {
        isLoadingDiagramRef.current = false;
      }, 100);
    });

    socket.on("element:moving", ({ elementId, position }: any) => {
      const cell = graph.getCell(elementId);
      if (cell && cell !== selectedElementRef.current) {
        cell.position(position.x, position.y);
      }
    });

    socket.on("element:moved", ({ elementId, position }: any) => {
      const cell = graph.getCell(elementId);
      if (cell && cell !== selectedElementRef.current) {
        cell.position(position.x, position.y);
      }
    });

    socket.on("attribute:add", ({ classId, attribute }: any) => {
      const cell = graph.getCell(classId);
      if (!cell) return;
      const data = cell.get("classData") || {};
      const updatedAttrs = [...(data.attributes || []), attribute];
      cell.set("classData", { ...data, attributes: updatedAttrs });
      if (selectedElementRef.current?.id === classId) setAttributes(updatedAttrs);
      updateElementSizeAndLabel(cell);
    });

    socket.on("attribute:update", ({ classId, attrIndex, newData }: any) => {
      const cell = graph.getCell(classId);
      if (!cell) return;
      const data = cell.get("classData") || {};
      const updatedAttrs = [...(data.attributes || [])];
      updatedAttrs[attrIndex] = { ...updatedAttrs[attrIndex], ...newData };
      cell.set("classData", { ...data, attributes: updatedAttrs });
      if (selectedElementRef.current?.id === classId) setAttributes(updatedAttrs);
      updateElementSizeAndLabel(cell);
    });

    socket.on("attribute:remove", ({ classId, attrIndex }: any) => {
      const cell = graph.getCell(classId);
      if (!cell) return;
      const data = cell.get("classData") || {};
      const updatedAttrs = [...(data.attributes || [])];
      updatedAttrs.splice(attrIndex, 1);
      cell.set("classData", { ...data, attributes: updatedAttrs });
      if (selectedElementRef.current?.id === classId) setAttributes(updatedAttrs);
      updateElementSizeAndLabel(cell);
    });

    socket.on("class:add", ({ classId, classData }: any) => {
      if (graph.getCell(classId)) return;
      const element = createClassElement(classId, classData);
      if (element) {
        graph.addCell(element);
        updateElementSizeAndLabel(element);
      }
    });

    socket.on("class:update", ({ classId, newData }: any) => {
      const cell = graph.getCell(classId);
      if (!cell) return;
      const data = cell.get("classData") || {};
      const updatedData = { ...data, ...newData };
      cell.set("classData", updatedData);
      updateElementSizeAndLabel(cell);
      if (selectedElementRef.current?.id === classId) setNameEdit(updatedData.name || "");
    });

    socket.on("class:remove", ({ classId }: any) => {
      const cell = graph.getCell(classId);
      if (cell) cell.remove();
      if (selectedElementRef.current?.id === classId) clearSelection();
    });

    socket.on("relation:add", ({ relationId, data }: any) => {
      if (graph.getCell(relationId)) return;
      
      const displayLabels = data.labels?.map((label: any) => {
        if (label.attrs) return label;
        return {
          position: label.position || 0.5,
          attrs: {
            text: {
              text: label.text || data.type,
              fontSize: 12,
              fill: '#333'
            }
          }
        };
      }) || [{ 
        position: 0.5, 
        attrs: { 
          text: { 
            text: data.type, 
            fontSize: 12, 
            fill: '#333' 
          } 
        } 
      }];
      
      const link = new dia.Link({
        id: relationId,
        source: { id: data.from },
        target: { id: data.to },
        vertices: data.vertices || [],
        labels: displayLabels,
        attrs: data.attrs || getRelationStyle(data.type),
        router: data.router || { name: "manhattan" },
        connector: data.connector || { name: "rounded" }
      });
      link.set('relationType', data.type);
      graph.addCell(link);
    });

    socket.on("relation:update", ({ relationId, data }: any) => {
      const link = graph.getCell(relationId);
      if (!link || !link.isLink()) return;
      
      if (data.vertices !== undefined) link.set('vertices', data.vertices);
      if (data.from !== undefined && data.to !== undefined) {
        link.set('source', { id: data.from });
        link.set('target', { id: data.to });
      }
      if (data.type !== undefined) {
        link.set('relationType', data.type);
        link.attr(getRelationStyle(data.type));
        link.set('labels', [{ position: 0.5, attrs: { text: { text: data.type, fontSize: 12, fill: '#333' } } }]);
        if (selectedRelationRef.current?.id === relationId) {
          setRelationEdit({ type: data.type, label: data.type });
        }
      }
    });

    socket.on("relation:remove", ({ relationId }: any) => {
      const link = graph.getCell(relationId);
      if (link && link.isLink()) {
        link.remove();
        if (selectedRelationRef.current?.id === relationId) clearSelection();
      }
    });

    socket.on("diagram:generated", ({ content, mode }: any) => {
      console.log('🤖 Diagrama generado con IA:', content, 'Modo:', mode);
    
      isLoadingDiagramRef.current = true;
      
      clearSelection();
    
      if (mode === 'replace') {
        graph.clear();
      }
      
      Object.entries(content.elements || {}).forEach(([id, elem]: any) => {
        const existingCell = graph.getCell(id);
        
        if (existingCell) {
          const data = existingCell.get("classData") || {};
          const updatedData = {
            ...data,
            name: elem.name || data.name,
            attributes: elem.attributes || data.attributes || []
          };
          existingCell.set("classData", updatedData);
          
          if (elem.position) {
            existingCell.position(elem.position.x, elem.position.y);
          }
          
          updateElementSizeAndLabel(existingCell);
        } else {
          const element = createClassElement(id, elem);
          if (element) {
            graph.addCell(element);
            updateElementSizeAndLabel(element);
          }
        }
      });
    
      Object.entries(content.relations || {}).forEach(([rid, rel]: any) => {
        const existingLink = graph.getCell(rid);
        
        if (existingLink && existingLink.isLink()) {
          existingLink.set('source', { id: rel.from });
          existingLink.set('target', { id: rel.to });
          existingLink.set('relationType', rel.type || 'OneToMany');
          existingLink.set('vertices', rel.vertices || []);
          existingLink.attr(rel.attrs || getRelationStyle(rel.type || 'OneToMany'));
          
          const displayLabels = rel.labels?.map((label: any) => {
            if (label.attrs) return label;
            return {
              position: label.position || 0.5,
              attrs: {
                text: {
                  text: label.text || rel.type || "OneToMany",
                  fontSize: 12,
                  fill: '#333'
                }
              }
            };
          }) || [{ 
            position: 0.5, 
            attrs: { 
              text: { 
                text: rel.type || "OneToMany", 
                fontSize: 12, 
                fill: '#333' 
              } 
            } 
          }];
          
          existingLink.set('labels', displayLabels);
        } else if (!existingLink) {
          const displayLabels = rel.labels?.map((label: any) => {
            if (label.attrs) return label;
            return {
              position: label.position || 0.5,
              attrs: {
                text: {
                  text: label.text || rel.type || "OneToMany",
                  fontSize: 12,
                  fill: '#333'
                }
              }
            };
          }) || [{ 
            position: 0.5, 
            attrs: { 
              text: { 
                text: rel.type || "OneToMany", 
                fontSize: 12, 
                fill: '#333' 
              } 
            } 
          }];
    
          const link = new dia.Link({
            id: rid,
            source: { id: rel.from },
            target: { id: rel.to },
            vertices: rel.vertices || [],
            labels: displayLabels,
            attrs: rel.attrs || getRelationStyle(rel.type || 'OneToMany'),
            router: rel.router || { name: "manhattan" },
            connector: rel.connector || { name: "rounded" }
          });
          link.set('relationType', rel.type || 'OneToMany');
          graph.addCell(link);
        }
      });
      
      setTimeout(() => {
        isLoadingDiagramRef.current = false;
      }, 100);
    });

    return () => {
      paper.off();
      graph.off();
      socket.off("diagram:init");
      socket.off("element:moving");
      socket.off("element:moved");
      socket.off("attribute:add");
      socket.off("attribute:update");
      socket.off("attribute:remove");
      socket.off("class:add");
      socket.off("class:update");
      socket.off("class:remove");
      socket.off("relation:add");
      socket.off("relation:update");
      socket.off("relation:remove");
      socket.off("diagram:generated");
    };
  }, [isInitialized, socket, joint, hasJoined]);

  const handleUpdateName = (newName: string) => {
    if (selectedElementRef.current) {
      updateClassName(selectedElementRef.current.id, newName);
      setNameEdit(newName);
    }
  };

  const handleAddAttribute = () => {
    if (selectedElementRef.current) {
      const updated = addAttribute(selectedElementRef.current.id);
      if (updated) setAttributes(updated);
    }
  };

  const handleUpdateAttribute = (index: number, attr: { name: string; type: string }) => {
    if (selectedElementRef.current) {
      const updated = updateAttribute(selectedElementRef.current.id, index, attr);
      if (updated) setAttributes(updated);
    }
  };

  const handleRemoveAttribute = (index: number) => {
    if (selectedElementRef.current) {
      const updated = removeAttribute(selectedElementRef.current.id, index);
      if (updated) setAttributes(updated);
    }
  };

  const handleUpdateRelationType = (newType: string) => {
    if (selectedRelationRef.current) {
      updateRelationType(selectedRelationRef.current.id, newType);
      setRelationEdit({ 
        type: newType, 
        label: RELATION_TYPES[newType as keyof typeof RELATION_TYPES]?.label || newType 
      });
    }
  };

  const handleDeleteClass = () => {
    if (selectedElementRef.current) {
      removeClass(selectedElementRef.current.id);
      clearSelection();
    }
  };

  const handlePromptSubmit = (prompt: string): void => {
    if (prompt && prompt.trim()) {
      generateFromPrompt(prompt);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
  
    // Validar que sea imagen
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido');
      return;
    }
  
    const additionalPrompt = window.prompt(
      'Contexto adicional (opcional):\nEjemplo: "Este es un sistema de gestión de biblioteca"',
      ''
    );
  
    const mode = window.confirm(
      '¿Quieres AGREGAR al diagrama existente?\n\n' +
      'OK = Agregar (merge)\n' +
      'Cancelar = Reemplazar todo (replace)'
    ) ? 'merge' : 'replace';
  
    await generateFromImage(file, additionalPrompt || '', mode);
    
    // Limpiar el input para permitir cargar la misma imagen de nuevo
    event.target.value = '';
  };

  const handleGenerateSpringBoot = async () => {
    if (!diagramId) {
      alert('No hay diagrama seleccionado');
      return;
    }
  
    const projectName = window.prompt('Nombre del proyecto:', `diagram-${diagramId}-project`);
    if (!projectName) return;
  
    const basePackage = window.prompt('Paquete base (ej: com.example.demo):', 'com.example.demo');
    if (!basePackage) return;
  
    try {
      const params = new URLSearchParams({
        projectName,
        basePackage
      });
  
      const response = await fetch(`/api/diagrams/${diagramId}/generate-code?${params}`, {
        method: 'POST',
      });
  
      if (!response.ok) {
        throw new Error('Error al generar el código');
      }
  
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
  
      alert('✅ Código Spring Boot generado exitosamente');
    } catch (error) {
      console.error('Error generando código:', error);
      alert('❌ Error al generar el código Spring Boot');
    }
  };

  return (
    <main className="flex w-full h-screen">
      <div className="absolute top-4 left-4 z-20 flex gap-2 bg-white p-2 rounded shadow border">
        <button 
          className={`px-4 py-2 border rounded transition-colors ${
            createClassMode 
              ? "bg-blue-500 text-white border-blue-500" 
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`} 
          onClick={() => setCreateClassMode(!createClassMode)}
        >
          {createClassMode ? "✓ Crear Clase (Activo)" : "Crear Clase"}
        </button>
        
        {/* Componente de Voz y Texto */}
        <VoiceTextPrompt
          onSubmit={handlePromptSubmit}
          isGenerating={isGenerating}
          disabled={!isConnected || !hasJoined}
        />
        <button
          className="px-4 py-2 bg-green-500 text-white border border-green-600 rounded hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleGenerateSpringBoot}
          disabled={!isConnected || !hasJoined}
          title={!isConnected || !hasJoined ? "Esperando conexión..." : "Generar proyecto Spring Boot"}
        >
          📦 Generar Spring Boot
        </button>

        <label className="px-4 py-2 bg-purple-500 text-white border border-purple-600 rounded hover:bg-purple-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={!isConnected || !hasJoined || isGeneratingImage}
            className="hidden"
          />
          {isGeneratingImage ? '⏳ Procesando...' : '🖼️ Generar desde Imagen'}
        </label>
      </div>

      {error && (
        <div className="absolute top-16 left-4 z-20 bg-red-100 border border-red-300 rounded px-3 py-2 text-sm max-w-md">
          <strong>Error:</strong> {error}
        </div>
      )}

      {imageError && (
        <div className="absolute top-28 left-4 z-20 bg-red-100 border border-red-300 rounded px-3 py-2 text-sm max-w-md">
          <strong>Error (Imagen):</strong> {imageError}
        </div>
      )}

      {createClassMode && (
        <div className="absolute top-16 left-4 z-20 bg-green-100 border border-green-300 rounded px-3 py-2 text-sm">
          <strong>Modo Crear Clase:</strong> Haz clic en el canvas para crear una nueva clase
        </div>
      )}

      <div className="relative w-full h-screen p-4">
        {(!isInitialized || !hasJoined) && (
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-white/80 z-10">
            <span className="text-gray-500">
              {!isInitialized ? "Inicializando canvas..." : "Conectando al diagrama..."}
            </span>
          </div>
        )}
        <div
          ref={paperRef}
          style={{ 
            width: "100%", 
            height: "calc(100vh - 80px)", 
            border: "1px solid #e5e7eb", 
            borderRadius: 6, 
            background: "#fff",
            cursor: createClassMode ? "copy" : "default"
          }}
        />
      </div>

      <div className="w-72 p-4 border-l border-gray-200 bg-gray-50 overflow-y-auto">
        {selectedElement ? (
          <>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Editar Clase</h3>
              <button 
                className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
                onClick={handleDeleteClass}
              >
                🗑️ Eliminar
              </button>
            </div>
            <div className="mb-2">
              <label className="block text-sm font-medium">Nombre:</label>
              <input
                type="text"
                value={nameEdit}
                onChange={(e) => handleUpdateName(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <h4 className="font-medium mb-1">Atributos:</h4>
              {attributes.map((attr, idx) => (
                <div key={idx} className="flex gap-1 mb-2 items-center">
                  <input
                    type="text"
                    value={attr.name}
                    onChange={(e) => handleUpdateAttribute(idx, { ...attr, name: e.target.value })}
                    className="border rounded px-2 py-1 w-1/2 text-sm"
                    placeholder="nombre"
                  />
                  <select
                    value={attr.type}
                    onChange={(e) => handleUpdateAttribute(idx, { ...attr, type: e.target.value })}
                    className="border rounded px-2 py-1 w-1/2 text-sm bg-white"
                  >
                    {DATA_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <button 
                    className="text-red-500 text-sm hover:text-red-700 px-1" 
                    onClick={() => handleRemoveAttribute(idx)}
                  >✕</button>
                </div>
              ))}
              <button 
                className="mt-2 px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600" 
                onClick={handleAddAttribute}
              >Agregar atributo</button>
            </div>
          </>
        ) : selectedRelation ? (
          <>
            <h3 className="font-semibold mb-3">Editar Relación</h3>
            {/* Información de Origen y Destino */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="mb-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Origen:</label>
                <div className="text-sm font-semibold text-blue-700">
                  {getClassNameById(selectedRelation.get('source')?.id || '')}
                </div>
              </div>
              <div className="flex justify-center my-1">
                <svg width="20" height="20" viewBox="0 0 20 20">
                  <path d="M10 4 L10 16 M10 16 L6 12 M10 16 L14 12" 
                        stroke="#2563eb" 
                        strokeWidth="2" 
                        fill="none" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Destino:</label>
                <div className="text-sm font-semibold text-blue-700">
                  {getClassNameById(selectedRelation.get('target')?.id || '')}
                </div>
              </div>
            </div>
            {/* Selector de Tipo de Relación */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Tipo de Relación:</label>
              <div className="space-y-2">
                {Object.entries(RELATION_TYPES).map(([key, config]) => (
                  <label key={key} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="relationType"
                      value={key}
                      checked={relationEdit.type === key}
                      onChange={(e) => handleUpdateRelationType(e.target.value)}
                    />
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-6 h-0.5 rounded" 
                        style={{ backgroundColor: config.stroke }}
                      ></div>
                      <span className="text-sm">{config.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-gray-500 text-sm">
            <p>Selecciona un elemento para editarlo</p>
          </div>
        )}
      </div>
    </main>
  );
}