// hooks/useJointJS.ts (mejorado para exportar todo lo necesario)
import { useEffect, useRef, useState } from 'react';

export const useJointJS = (containerRef: React.RefObject<HTMLDivElement | null>) => {
  const graphRef = useRef<any | null>(null);
  const paperInstanceRef = useRef<any | null>(null);
  const shapesRef = useRef<any | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [joint, setJoint] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    const initJointJS = async () => {
      try {
        const jointModule = await import('jointjs');
        const { dia, shapes } = jointModule;

        if (!mounted || !containerRef.current) return;

        setJoint(jointModule);
        shapesRef.current = shapes;

        const graph = new dia.Graph({}, { cellNamespace: shapes });
        graphRef.current = graph;

        const paper = new dia.Paper({
          el: containerRef.current,
          model: graph,
          width: window.innerWidth - 320,
          height: window.innerHeight - 80,
          gridSize: 10,
          drawGrid: true,
          cellViewNamespace: shapes,
          interactive: true,
          linkPinning: false,
          defaultConnectionPoint: { name: 'boundary' },
          validateConnection: function(
            cellViewS: any, 
            magnetS: any, 
            cellViewT: any, 
            magnetT: any
          ) {
            return cellViewS !== cellViewT;
          },
        });

        paperInstanceRef.current = paper;
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing JointJS:', error);
      }
    };

    initJointJS();

    return () => {
      mounted = false;
      graphRef.current?.clear();
      graphRef.current = null;
      paperInstanceRef.current = null;
      setIsInitialized(false);
    };
  }, [containerRef]);

  return {
    joint,
    graphRef,
    paperInstanceRef,
    shapesRef,
    isInitialized
  };
};