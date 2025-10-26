// hooks/useDiagramRelations.ts
import { useCallback } from 'react';
import { Socket } from 'socket.io-client';

const RELATION_TYPES = {
  'OneToOne': { 
    label: 'One to One (1:1)', 
    stroke: '#2563eb', 
    strokeWidth: 2, 
    strokeDasharray: 'none',
    sourceMarker: { type: 'path', d: 'M 0 0', fill: 'none' },
    targetMarker: { type: 'path', d: 'M 10 0 L 0 5 L 10 10 z', fill: '#2563eb' }
  },
  'OneToMany': { 
    label: 'One to Many (1:N)', 
    stroke: '#dc2626', 
    strokeWidth: 2, 
    strokeDasharray: 'none',
    sourceMarker: { type: 'path', d: 'M 0 0', fill: 'none' },
    targetMarker: { type: 'path', d: 'M 10 0 L 0 5 L 10 10 L 15 5 L 10 0', fill: '#dc2626' }
  },
  'ManyToOne': { 
    label: 'Many to One (N:1)', 
    stroke: '#ea580c', 
    strokeWidth: 2, 
    strokeDasharray: 'none',
    sourceMarker: { type: 'path', d: 'M 10 0 L 0 5 L 10 10 L 15 5 L 10 0', fill: '#ea580c' },
    targetMarker: { type: 'path', d: 'M 10 0 L 0 5 L 10 10 z', fill: '#ea580c' }
  },
  'ManyToMany': { 
    label: 'Many to Many (N:N)', 
    stroke: '#7c3aed', 
    strokeWidth: 2, 
    strokeDasharray: 'none',
    sourceMarker: { type: 'path', d: 'M 10 0 L 0 5 L 10 10 L 15 5 L 10 0', fill: '#7c3aed' },
    targetMarker: { type: 'path', d: 'M 10 0 L 0 5 L 10 10 L 15 5 L 10 0', fill: '#7c3aed' }
  },
  'Inheritance': { 
    label: 'Herencia', 
    stroke: '#059669', 
    strokeWidth: 2, 
    strokeDasharray: 'none',
    sourceMarker: { type: 'path', d: 'M 0 0', fill: 'none' },
    targetMarker: { type: 'path', d: 'M 0 0 L 10 5 L 0 10 z', fill: 'white', stroke: '#059669', strokeWidth: 2 }
  },
  'Composition': { 
    label: 'Composición', 
    stroke: '#0891b2', 
    strokeWidth: 2, 
    strokeDasharray: 'none',
    sourceMarker: { type: 'path', d: 'M 0 5 L 5 0 L 10 5 L 5 10 z', fill: '#0891b2' },
    targetMarker: { type: 'path', d: 'M 10 0 L 0 5 L 10 10 z', fill: '#0891b2' }
  },
  'Aggregation': { 
    label: 'Agregación', 
    stroke: '#65a30d', 
    strokeWidth: 2, 
    strokeDasharray: 'none',
    sourceMarker: { type: 'path', d: 'M 0 5 L 5 0 L 10 5 L 5 10 z', fill: 'white', stroke: '#65a30d', strokeWidth: 2 },
    targetMarker: { type: 'path', d: 'M 10 0 L 0 5 L 10 10 z', fill: '#65a30d' }
  }
};

export const useDiagramRelations = (
  diagramId: number | null,
  socket: Socket | null,
  graphRef: React.MutableRefObject<any | null>
) => {
  // Obtener estilos de relación según el tipo
  const getRelationStyle = useCallback((type: string) => {
    const config = RELATION_TYPES[type as keyof typeof RELATION_TYPES] || RELATION_TYPES.OneToMany;
    return {
      line: {
        stroke: config.stroke,
        strokeWidth: config.strokeWidth,
        strokeDasharray: config.strokeDasharray,
        sourceMarker: config.sourceMarker,
        targetMarker: config.targetMarker
      }
    };
  }, []);

  // Crear relación
  const createRelation = useCallback((
    relationId: string,
    fromId: string,
    toId: string,
    type: string = 'OneToMany'
  ) => {
    if (!socket || !diagramId) return;

    const linkData = {
      from: fromId,
      to: toId,
      type,
      vertices: [],
      labels: [{ position: 0.5, text: type }],
      attrs: getRelationStyle(type),
      router: { name: "manhattan" },
      connector: { name: "rounded" }
    };

    socket.emit("relation:add", {
      diagramId,
      relationId,
      data: linkData
    });
  }, [socket, diagramId, getRelationStyle]);

  // Actualizar tipo de relación
  const updateRelationType = useCallback((relationId: string, newType: string) => {
    if (!socket || !diagramId || !graphRef.current) return;

    const link = graphRef.current.getCell(relationId);
    if (!link || !link.isLink()) return;

    link.set('relationType', newType);
    const newAttrs = getRelationStyle(newType);
    link.attr(newAttrs);
    
    const labels = [{ 
      position: 0.5, 
      attrs: { 
        text: { 
          text: newType, 
          fontSize: 12, 
          fill: '#333' 
        } 
      } 
    }];
    link.set('labels', labels);

    socket.emit("relation:update", {
      diagramId,
      relationId,
      data: { 
        type: newType,
        attrs: newAttrs,
        labels: labels
      }
    });
  }, [socket, diagramId, graphRef, getRelationStyle]);

  // Actualizar vértices de relación
  const updateRelationVertices = useCallback((relationId: string, vertices: any[]) => {
    if (!socket || !diagramId) return;

    socket.emit("relation:update", {
      diagramId,
      relationId,
      data: { vertices }
    });
  }, [socket, diagramId]);

  // Eliminar relación
  const removeRelation = useCallback((relationId: string) => {
    if (!socket || !diagramId || !graphRef.current) return;

    const link = graphRef.current.getCell(relationId);
    if (link && link.isLink()) {
      socket.emit("relation:remove", { diagramId, relationId });
      link.remove();
    }
  }, [socket, diagramId, graphRef]);

  // Obtener nombre de clase por ID
  const getClassNameById = useCallback((classId: string) => {
    if (!graphRef.current) return classId;
    const cell = graphRef.current.getCell(classId);
    if (!cell) return classId;
    const classData = cell.get('classData');
    return classData?.name || classId;
  }, [graphRef]);

  return {
    RELATION_TYPES,
    getRelationStyle,
    createRelation,
    updateRelationType,
    updateRelationVertices,
    removeRelation,
    getClassNameById
  };
};