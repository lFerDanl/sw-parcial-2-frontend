// hooks/useDiagramPromptGeneration.ts
import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

export const useDiagramPromptGeneration = (
  diagramId: number | null,
  socket: Socket | null
) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // ✅ Agregar parámetro mode
  const generateFromPrompt = async (
    prompt: string, 
    mode: 'replace' | 'merge' = 'merge' // ✅ Default: merge
  ) => {
    if (!socket || !diagramId || !prompt.trim()) {
      setError('Faltan datos necesarios para generar');
      return;
    }

    setIsGenerating(true);
    setError(null);

    console.log('📤 Emitiendo solicitud de generación:', { diagramId, prompt, mode });

    // ✅ Enviar el modo
    socket.emit('diagram:generateFromPrompt', {
      diagramId,
      prompt: prompt.trim(),
      mode, // ✅ 'merge' o 'replace'
    });

    const timeout = setTimeout(() => {
      setIsGenerating(false);
      setError('Tiempo de espera agotado. Intenta de nuevo.');
    }, 60000);

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