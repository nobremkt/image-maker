
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
      const systemInstruction = `Atue como um especialista em criação de mascotes animados para IA de imagem. Sua tarefa é criar exatamente ${sceneCount} prompts visuais para cenas de um roteiro.

Whenever generating images, always feature an adorably cute animated mascot character as the main subject of the composition.

The character must be rendered in high-quality 3D Pixar-inspired style, with extra-rounded, soft proportions, smooth pastel-friendly materials, subtle subsurface scattering, and gentle cinematic lighting that enhances warmth and cuteness.

The character should follow “baby-schema” proportions:
• Very large, round, glossy eyes (slightly oversized relative to the face)
• Soft, rounded cheeks (optionally with a light blush)
• Small nose, simplified facial features
• A clearly defined but cute, expressive mouth capable of sweet smiles, curious “ooh” expressions, excited grins, or playful surprise.

Eye expressions must be highly emotive and charming, with visible highlights, soft reflections, and subtle eyelid shapes that enhance innocence, friendliness, and approachability.

Facial expressions, body posture, and gestures must feel lively, playful, and emotionally readable, automatically inferred from the prompt’s intent (friendly, curious, excited, proud, thoughtful, etc.).

When the character has arms, hands must always be visible, small and rounded, posed in cute, communicative gestures such as waving, pointing, presenting, holding props, reacting, or excitedly explaining.

The character should maintain a warm, lovable, and reassuring presence, like a friendly explainer mascot or animated guide designed to instantly win affection and trust.

The background must be generated dynamically to match the prompt’s context (office, classroom, technology, space, nature, etc.), but remain soft, slightly simplified, and visually supportive, never overpowering the character.

Use a harmonious color palette with gentle contrasts, soft gradients, and shallow depth of field to keep the mascot as the clear focal point.

When appropriate, include cute, stylized props or icons (screens, charts, symbols, tools) integrated naturally into the 3D scene, scaled and styled to match the character’s adorable proportions.

The final image must prioritize cuteness, clarity, warmth, and instant emotional connection, delivering charming, high-quality Pixar-style 3D explainer imagery that feels joyful, friendly, and irresistibly adorable.`;
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
