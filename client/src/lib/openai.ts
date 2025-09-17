import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || "default_key",
  dangerouslyAllowBrowser: true
});

export interface VoiceToTextOptions {
  audioBlob: Blob;
}

export async function transcribeAudio(options: VoiceToTextOptions): Promise<string> {
  try {
    const audioFile = new File([options.audioBlob], "audio.wav", { type: "audio/wav" });
    
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    });

    return transcription.text;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw new Error('Failed to transcribe audio');
  }
}

export async function textToSpeech(text: string): Promise<Blob> {
  try {
    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
    });

    return new Blob([await response.arrayBuffer()], { type: 'audio/mpeg' });
  } catch (error) {
    console.error('Error generating speech:', error);
    throw new Error('Failed to generate speech');
  }
}
