// hooks/useDiagramClasses.ts
import { useCallback } from 'react';
import { Socket } from 'socket.io-client';

interface ClassData {
  name: string;
  position: { x: number; y: number };
  attributes: Array<{ name: string; type: string }>;
}

export const useDiagramClasses = (
  diagramId: number | null,
  socket: Socket | null,
  graphRef: React.MutableRefObject<any | null>,
  shapesRef: React.MutableRefObject<any | null>,
  updateElementSizeAndLabel: (element: any) => void
) => {
  // Crear elemento de clase con ports
  const createClassElement = useCallback((id: string, classData: ClassData) => {
    if (!shapesRef.current) return null;

    const element = new shapesRef.current.standard.Rectangle({
      id,
      position: classData.position || { x: 50, y: 50 },
      size: { width: 160, height: 40 },
      attrs: {
        body: { 
          fill: "#f8fafc", 
          stroke: "#2b6cb0", 
          rx: 6, 
          ry: 6,
          strokeWidth: 1
        },
        label: { 
          text: classData.name || "Clase", 
          "font-size": 14, 
          refY: 10, 
          yAlignment: "top" 
        },
      },
      ports: {
        groups: {
          'default': {
            attrs: {
              circle: {
                fill: '#ffffff',
                stroke: '#333333',
                strokeWidth: 2,
                r: 4,
                magnet: true
              }
            }
          }
        },
        items: [
          { group: 'default', id: 'port1', args: { x: 0, y: '50%' } },
          { group: 'default', id: 'port2', args: { x: '100%', y: '50%' } },
          { group: 'default', id: 'port3', args: { x: '50%', y: 0 } },
          { group: 'default', id: 'port4', args: { x: '50%', y: '100%' } }
        ]
      }
    });

    element.set("classData", { 
      name: classData.name || "Clase", 
      attributes: classData.attributes || []
    });

    return element;
  }, [shapesRef]);

  // Crear clase en una posición específica
  const createClassAt = useCallback((x: number, y: number) => {
    if (!socket || !diagramId || !graphRef.current) return;

    const classId = `class_${Date.now()}`;
    const classData: ClassData = {
      name: "Clase",
      position: { x, y },
      attributes: []
    };
    
    const element = createClassElement(classId, classData);
    
    if (element) {
      graphRef.current.addCell(element);
      updateElementSizeAndLabel(element);

      socket.emit("class:add", { 
        diagramId, 
        classId, 
        classData 
      });
    }
  }, [socket, diagramId, graphRef, createClassElement, updateElementSizeAndLabel]);

  // Actualizar nombre de clase
  const updateClassName = useCallback((classId: string, newName: string) => {
    if (!socket || !diagramId || !graphRef.current) return;

    const cell = graphRef.current.getCell(classId);
    if (!cell) return;

    const data = cell.get("classData") || {};
    const newData = { ...data, name: newName };
    cell.set("classData", newData);
    updateElementSizeAndLabel(cell);

    socket.emit("class:update", { 
      diagramId, 
      classId, 
      newData: { name: newName } 
    });
  }, [socket, diagramId, graphRef, updateElementSizeAndLabel]);

  // Eliminar clase
  const removeClass = useCallback((classId: string) => {
    if (!socket || !diagramId || !graphRef.current) return;

    const cell = graphRef.current.getCell(classId);
    if (!cell) return;

    socket.emit("class:remove", { diagramId, classId });
    cell.remove();
  }, [socket, diagramId, graphRef]);

  // Agregar atributo a clase
  const addAttribute = useCallback((classId: string) => {
    if (!socket || !diagramId || !graphRef.current) return;

    const cell = graphRef.current.getCell(classId);
    if (!cell) return;

    const newAttr = { name: "nuevo", type: "String" };

    const data = cell.get("classData") || {};
    const updatedAttrs = [...(data.attributes || []), newAttr];
    const newData = { ...data, attributes: updatedAttrs };
    
    cell.set("classData", newData);
    updateElementSizeAndLabel(cell);

    socket.emit("attribute:add", { 
      diagramId, 
      classId, 
      attribute: newAttr 
    });

    return updatedAttrs;
  }, [socket, diagramId, graphRef, updateElementSizeAndLabel]);

  // Actualizar atributo
  const updateAttribute = useCallback((
    classId: string, 
    index: number, 
    attr: { name: string; type: string }
  ) => {
    if (!socket || !diagramId || !graphRef.current) return;

    const cell = graphRef.current.getCell(classId);
    if (!cell) return;

    const data = cell.get("classData") || {};
    const updatedAttrs = [...(data.attributes || [])];
    updatedAttrs[index] = attr;
    
    cell.set("classData", { ...data, attributes: updatedAttrs });
    updateElementSizeAndLabel(cell);

    socket.emit("attribute:update", { 
      diagramId, 
      classId, 
      attrIndex: index, 
      newData: attr 
    });

    return updatedAttrs;
  }, [socket, diagramId, graphRef, updateElementSizeAndLabel]);

  // Eliminar atributo
  const removeAttribute = useCallback((classId: string, index: number) => {
    if (!socket || !diagramId || !graphRef.current) return;

    const cell = graphRef.current.getCell(classId);
    if (!cell) return;

    const data = cell.get("classData") || {};
    const updatedAttrs = [...(data.attributes || [])];
    updatedAttrs.splice(index, 1);
    
    cell.set("classData", { ...data, attributes: updatedAttrs });
    updateElementSizeAndLabel(cell);

    socket.emit("attribute:remove", { 
      diagramId, 
      classId, 
      attrIndex: index 
    });

    return updatedAttrs;
  }, [socket, diagramId, graphRef, updateElementSizeAndLabel]);

  return {
    createClassElement,
    createClassAt,
    updateClassName,
    removeClass,
    addAttribute,
    updateAttribute,
    removeAttribute
  };
};