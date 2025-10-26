// hooks/useDiagramPromptGeneration.ts
import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

export const useDiagramPromptGeneration = (
  diagramId: number | null,
  socket: Socket | null
) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Configurar listener para errores de generación
  useEffect(() => {
    if (!socket) return;

    const handleError = (data: { error: string }) => {
      setIsGenerating(false);
      setError(data.error);
      console.error('Error generando diagrama:', data.error);
    };

    socket.on('diagram:generateError', handleError);

    return () => {
      socket.off('diagram:generateError', handleError);
    };
  }, [socket]);

  const generateFromPrompt = async (prompt: string) => {
    if (!socket || !diagramId || !prompt.trim()) {
      setError('Faltan datos necesarios para generar');
      return;
    }

    setIsGenerating(true);
    setError(null);

    console.log('📤 Emitiendo solicitud de generación:', { diagramId, prompt });

    // Emitir evento al backend
    console.log('📤 Emitiendo solicitud de generación:', { diagramId, prompt, socket });
    socket.emit('diagram:generateFromPrompt', {
      diagramId,
      prompt: prompt.trim(),
    });

    // El listener de diagram:generated está en el componente principal
    // Aquí solo manejamos el estado de loading
    
    // Timeout de seguridad (30 segundos)
    const timeout = setTimeout(() => {
      setIsGenerating(false);
      setError('Tiempo de espera agotado. Intenta de nuevo.');
    }, 30000);

    // Limpiar timeout cuando se reciba respuesta
    const handleSuccess = () => {
      clearTimeout(timeout);
      setIsGenerating(false);
      setError(null);
    };

    socket.once('diagram:generated', handleSuccess);

    return () => {
      clearTimeout(timeout);
      socket.off('diagram:generated', handleSuccess);
    };
  };

  return { generateFromPrompt, isGenerating, error };
};