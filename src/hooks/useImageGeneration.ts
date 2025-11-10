// hooks/useImageGeneration.ts
import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

export const useImageGeneration = (
  diagramId: number | null,
  socket: Socket | null
) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // ✅ Función para comprimir/redimensionar imagen
  const compressImage = async (
    file: File, 
    maxWidth: number = 1024, 
    maxHeight: number = 1024, 
    quality: number = 0.8
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calcular nuevas dimensiones manteniendo aspect ratio
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo obtener contexto del canvas'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Convertir a base64 con compresión
          const base64 = canvas.toDataURL('image/jpeg', quality).split(',')[1];
          resolve(base64);
        };

        img.onerror = () => reject(new Error('Error al cargar la imagen'));
        img.src = e.target?.result as string;
      };

      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsDataURL(file);
    });
  };

  useEffect(() => {
    if (!socket) return;

    // ✅ Escuchar cuando comienza la generación
    const handleGenerating = (data: { message: string; status: string }) => {
      setIsGenerating(true);
      setGeneratingMessage(data.message);
      setError(null);
      console.log('🔄 Generando desde imagen:', data.message);
    };

    // ✅ Escuchar cuando termina exitosamente
    const handleGenerated = () => {
      setIsGenerating(false);
      setGeneratingMessage('');
      setError(null);
      console.log('✅ Generación desde imagen completada');
    };

    // ✅ Escuchar errores
    const handleError = (data: { error: string }) => {
      setIsGenerating(false);
      setGeneratingMessage('');
      
      if (data.error.includes('429') || data.error.includes('Resource exhausted')) {
        setError('⏳ Límite de uso alcanzado. Por favor espera 10-15 segundos e intenta de nuevo.');
      } else {
        setError(data.error);
      }
      
      console.error('❌ Error generando diagrama desde imagen:', data.error);
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

  const generateFromImage = async (
    imageFile: File,
    additionalPrompt: string = '',
    mode: 'replace' | 'merge' = 'merge'
  ) => {
    if (!socket || !diagramId || !imageFile) {
      setError('Faltan datos necesarios para generar');
      return;
    }

    // Limpiar estados previos
    setError(null);

    try {
      console.log(`🖼️ Tamaño original: ${(imageFile.size / 1024).toFixed(2)} KB`);

      // ✅ Comprimir imagen antes de enviar
      const imageData = await compressImage(imageFile, 1024, 1024, 0.8);
      
      // Estimar tamaño comprimido
      const compressedSize = (imageData.length * 0.75) / 1024;
      console.log(`🖼️ Tamaño comprimido: ${compressedSize.toFixed(2)} KB`);

      console.log('📤 Emitiendo solicitud de generación desde imagen:', { 
        diagramId, 
        mimeType: 'image/jpeg',
        mode 
      });

      // ✅ Emitir sin esperar respuesta (fire-and-forget)
      socket.emit('diagram:generateFromImage', {
        diagramId,
        imageData,
        mimeType: 'image/jpeg',
        additionalPrompt: additionalPrompt.trim(),
        mode,
      });

      // No necesitamos timeout aquí porque el servidor maneja todo
    } catch (err) {
      setError('Error al procesar la imagen');
      console.error(err);
    }
  };

  return { 
    generateFromImage, 
    isGenerating, 
    generatingMessage, 
    error 
  };
};