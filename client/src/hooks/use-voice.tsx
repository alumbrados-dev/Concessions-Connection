import { useState, useCallback, useRef } from "react";
import { transcribeAudio, textToSpeech } from "@/lib/openai";

export interface UseVoiceOptions {
  onTranscription?: (text: string) => void;
  onError?: (error: Error) => void;
}

export function useVoice(options: UseVoiceOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setIsProcessing(true);
        
        try {
          const transcription = await transcribeAudio({ audioBlob });
          options.onTranscription?.(transcription);
        } catch (error) {
          options.onError?.(error as Error);
        } finally {
          setIsProcessing(false);
        }

        // Clean up
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (error) {
      options.onError?.(error as Error);
    }
  }, [options]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const speak = useCallback(async (text: string) => {
    try {
      setIsSpeaking(true);
      const audioBlob = await textToSpeech(text);
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
    } catch (error) {
      setIsSpeaking(false);
      options.onError?.(error as Error);
    }
  }, [options]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
    }
  }, []);

  return {
    isListening,
    isProcessing,
    isSpeaking,
    startListening,
    stopListening,
    speak,
    stopSpeaking
  };
}
