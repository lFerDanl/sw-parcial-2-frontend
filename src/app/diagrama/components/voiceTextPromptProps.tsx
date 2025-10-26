import { useState, useRef } from 'react';

interface VoiceTextPromptProps {
  onSubmit: (prompt: string) => void;
  isGenerating: boolean;
  disabled: boolean;
}

// Declaración de tipos para Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const VoiceTextPrompt: React.FC<VoiceTextPromptProps> = ({ 
  onSubmit, 
  isGenerating, 
  disabled 
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const handleTextPrompt = (): void => {
    const prompt = window.prompt('Describe el diagrama de clases que deseas generar:');
    if (prompt && prompt.trim()) {
      onSubmit(prompt);
    }
  };

  const initializeSpeechRecognition = (): SpeechRecognition | null => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      alert('❌ Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.');
      return null;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'es-ES'; // Español
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      console.log('Transcripción:', transcript);
      
      if (transcript && transcript.trim()) {
        onSubmit(transcript);
      }

    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Error de reconocimiento:', event.error);
      
      let errorMessage = 'Error desconocido';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No se detectó voz. Intenta de nuevo.';
          break;
        case 'audio-capture':
          errorMessage = 'No se pudo acceder al micrófono.';
          break;
        case 'not-allowed':
          errorMessage = 'Permiso de micrófono denegado.';
          break;
        case 'network':
          errorMessage = 'Error de red. Verifica tu conexión.';
          break;
        default:
          errorMessage = `Error: ${event.error}`;
      }
      
      alert(`❌ ${errorMessage}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    return recognition;
  };

  const handleVoicePrompt = (): void => {
    if (isListening) {
      // Detener escucha
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } else {
      // Iniciar escucha
      if (!recognitionRef.current) {
        recognitionRef.current = initializeSpeechRecognition();
      }
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch (error) {
          console.error('Error al iniciar reconocimiento:', error);
          alert('❌ Error al iniciar el reconocimiento de voz');
        }
      }
    }
  };

  return (
    <div className="flex gap-2">
      <button
        className="px-4 py-2 bg-purple-500 text-white border border-purple-600 rounded hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleTextPrompt}
        disabled={isGenerating || disabled}
        title="Generar diagrama con texto"
      >
        {isGenerating ? '🔄 Generando...' : '✨ Texto'}
      </button>

      <button
        className={`px-4 py-2 border rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          isListening
            ? 'bg-red-500 text-white border-red-600 hover:bg-red-600 animate-pulse'
            : 'bg-purple-500 text-white border-purple-600 hover:bg-purple-600'
        }`}
        onClick={handleVoicePrompt}
        disabled={isGenerating || disabled}
        title={isListening ? 'Detener escucha' : 'Generar diagrama con voz'}
      >
        {isListening ? '⏹️ Detener' : '🎤 Voz'}
      </button>
    </div>
  );
};

export default VoiceTextPrompt;