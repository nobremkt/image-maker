
import { GoogleGenAI, Type } from "@google/genai";
import { ReferenceImage } from "../types";

export class GeminiService {
  private static getApiKey(): string {
    const key = localStorage.getItem('GEMINI_API_KEY');
    if (!key) {
      throw new Error("API Key não encontrada. Por favor, configure-a nas Configurações.");
    }
    return key;
  }

  private static getAI() {
    const apiKey = this.getApiKey();
    return new GoogleGenAI({ apiKey });
  }

  private static async withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        const isRetryable = error.status === 429 || (error.status >= 500 && error.status <= 599) || error.message?.includes('fetch');
        
        if (isRetryable && i < maxRetries - 1) {
          const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  static async generateVideo(base64Image: string, mimeType: string, model: string, aspectRatio: string, dialogue: string) {
    const ai = this.getAI();
    
    // Construct a prompt that includes the dialogue and instructions for the character to speak.
    const prompt = `Cinematic video starting from this frame. The character in the image is speaking the following dialogue: "${dialogue}". Ensure the character's mouth movements and facial expressions match the speech. High quality, smooth animation, professional lighting.`;
    
    let operation = await ai.models.generateVideos({
      model: model,
      prompt: prompt,
      image: {
        imageBytes: base64Image.split(',')[1],
        mimeType: mimeType,
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio as any
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    const apiKey = this.getApiKey();
    return `${downloadLink}&key=${apiKey}`;
  }

  static async generateMascotPrompts(script: string, sceneCount: number, referenceImages: ReferenceImage[] = []) {
    return this.withRetry(async () => {
      const ai = this.getAI();
      const systemInstruction = `Atue como um especialista em criação de mascotes animados para IA de imagem. Sua tarefa é criar exatamente ${sceneCount} prompts visuais para cenas de um roteiro.`;
      const parts: any[] = [{ text: script }];
      
      referenceImages.forEach(img => {
        parts.push({
          inlineData: {
            data: img.data.split(',')[1],
            mimeType: img.mimeType
          }
        });
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              scenes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    description: { type: Type.STRING },
                    imagePrompt: { type: Type.STRING }
                  },
                  required: ["description", "imagePrompt"]
                }
              }
            },
            required: ["scenes"]
          }
        }
      });
      
      const data = JSON.parse(response.text || '{}');
      return data.scenes as Array<{ description: string; imagePrompt: string }>;
    });
  }

  static async generateSceneImage(prompt: string, aspectRatio: "16:9" | "1:1" | "9:16" = "16:9", referenceImages: ReferenceImage[] = []) {
    return this.withRetry(async () => {
      const ai = this.getAI();
      const parts: any[] = [{ text: prompt }];
      
      referenceImages.forEach(img => {
        parts.push({
          inlineData: {
            data: img.data.split(',')[1],
            mimeType: img.mimeType
          }
        });
      });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio,
            imageSize: "1K"
          }
        }
      });
      
      const candidates = response.candidates;
      if (candidates && candidates.length > 0) {
        for (const part of candidates[0].content.parts) {
          if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      }
      throw new Error("Nenhum dado de imagem recebido.");
    });
  }
}
