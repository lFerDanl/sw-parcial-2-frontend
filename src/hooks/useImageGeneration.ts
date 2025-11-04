// hooks/useImageGeneration.ts
import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

export const useImageGeneration = (
  diagramId: number | null,
  socket: Socket | null
) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Nueva función para comprimir/redimensionar imagen
  const compressImage = async (file: File, maxWidth: number = 1024, maxHeight: number = 1024, quality: number = 0.8): Promise<string> => {
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

    const handleError = (data: { error: string }) => {
      setIsGenerating(false);
      
      if (data.error.includes('429') || data.error.includes('Resource exhausted')) {
        setError('⏳ Límite de uso alcanzado. Por favor espera 10-15 segundos e intenta de nuevo.');
      } else {
        setError(data.error);
      }
      
      console.error('Error generando diagrama desde imagen:', data.error);
    };

    socket.on('diagram:generateError', handleError);

    return () => {
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

    setIsGenerating(true);
    setError(null);

    try {
      console.log(`📷 Tamaño original: ${(imageFile.size / 1024).toFixed(2)} KB`);

      // ✅ Comprimir imagen antes de enviar
      const imageData = await compressImage(imageFile, 1024, 1024, 0.8);
      
      // Estimar tamaño comprimido
      const compressedSize = (imageData.length * 0.75) / 1024; // Base64 es ~33% más grande
      console.log(`📷 Tamaño comprimido: ${compressedSize.toFixed(2)} KB`);

      console.log('📤 Emitiendo solicitud de generación desde imagen:', { 
        diagramId, 
        mimeType: 'image/jpeg', // Siempre JPEG después de comprimir
        mode 
      });

      socket.emit('diagram:generateFromImage', {
        diagramId,
        imageData,
        mimeType: 'image/jpeg', // ✅ JPEG comprimido
        additionalPrompt: additionalPrompt.trim(),
        mode,
      });

      const timeout = setTimeout(() => {
        setIsGenerating(false);
        setError('Tiempo de espera agotado. Intenta de nuevo.');
      }, 90000);

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
    } catch (err) {
      setIsGenerating(false);
      setError('Error al procesar la imagen');
      console.error(err);
    }
  };

  return { generateFromImage, isGenerating, error };
};