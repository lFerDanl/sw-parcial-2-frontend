// hooks/usePromptGeneration.ts
import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

export const useDiagramPromptGeneration = (
  diagramId: number | null,
  socket: Socket | null
) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    // ✅ Escuchar cuando comienza la generación
    const handleGenerating = (data: { message: string; status: string }) => {
      setIsGenerating(true);
      setGeneratingMessage(data.message);
      setError(null);
      console.log('🔄 Generando:', data.message);
    };

    // ✅ Escuchar cuando termina exitosamente
    const handleGenerated = () => {
      setIsGenerating(false);
      setGeneratingMessage('');
      setError(null);
      console.log('✅ Generación completada');
    };

    // ✅ Escuchar errores
    const handleError = (data: { error: string }) => {
      setIsGenerating(false);
      setGeneratingMessage('');
      setError(data.error);
      console.error('❌ Error generando diagrama:', data.error);
    };

    socket.on('diagram:generating', handleGenerating);
    socket.on('diagram:generated', handleGenerated);
    socket.on('diagram:generateError', handleError);

    return () => {
      socket.off('diagram:generating', handleGenerating);
      socket.off('diagram:generated', handleGenerated);
      socket.off('diagram:generateError', handleError);
    };
  }, [socket]);

  const generateFromPrompt = (
    prompt: string, 
    mode: 'replace' | 'merge' = 'merge'
  ) => {
    if (!socket || !diagramId || !prompt.trim()) {
      setError('Faltan datos necesarios para generar');
      return;
    }

    // Limpiar estados previos
    setError(null);

    console.log('📤 Emitiendo solicitud de generación:', { diagramId, prompt, mode });

    // ✅ Emitir sin esperar respuesta (fire-and-forget)
    socket.emit('diagram:generateFromPrompt', {
      diagramId,
      prompt: prompt.trim(),
      mode,
    });

    // No necesitamos timeout aquí porque el servidor maneja todo
  };

  return { 
    generateFromPrompt, 
    isGenerating, 
    generatingMessage, 
    error 
  };
};