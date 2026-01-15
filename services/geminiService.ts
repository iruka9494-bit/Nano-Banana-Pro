
import { GoogleGenAI } from "@google/genai";
import { AspectRatio, ImageSize, SubjectPose, CameraAngle, CameraType } from "../types";

// 모델 이름 상수로 정의
const MODEL_NAME = "gemini-3-pro-image-preview";

export const generateImage = async (
  prompt: string,
  aspectRatio: AspectRatio,
  imageSize: ImageSize,
  subjectPose: SubjectPose,
  cameraAngle: CameraAngle,
  referenceImages: string[] = [],
  cameraType: CameraType = CameraType.AUTO
): Promise<string> => {
  // 최신 키를 가져오기 위해 호출 직전에 인스턴스 생성
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key가 설정되지 않았습니다.");
  
  const ai = new GoogleGenAI({ apiKey });

  try {
    const parts: any[] = [];

    // 참조 이미지 처리
    for (const dataUrl of referenceImages) {
      const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        parts.push({
          inlineData: { mimeType: matches[1], data: matches[2] },
        });
      }
    }

    // 프롬프트 구성
    const modifiers: string[] = [];
    if (cameraType !== CameraType.AUTO) modifiers.push(`Shot on ${cameraType}`);
    if (subjectPose !== SubjectPose.NONE) modifiers.push(`Subject in ${subjectPose}`);
    if (cameraAngle !== CameraAngle.NONE) modifiers.push(`Camera at ${cameraAngle}`);

    let finalPrompt = prompt.trim();
    if (modifiers.length > 0) finalPrompt += ", " + modifiers.join(", ");
    finalPrompt += ", professional lighting, high resolution, sharp focus, 8k, masterpiece";

    parts.push({ text: finalPrompt });

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
      config: {
        imageConfig: { aspectRatio, imageSize },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
        ],
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) throw new Error("이미지를 생성할 수 없습니다.");

    for (const part of candidate.content.parts) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }

    throw new Error("결과에 이미지 데이터가 없습니다.");
  } catch (error) {
    console.error("Image generation failed:", error);
    throw error;
  }
};

// Fix: Implement upscaleImage function
export const upscaleImage = async (
  prompt: string,
  aspectRatio: AspectRatio,
  imageUrl: string,
  targetSize: ImageSize
): Promise<string> => {
  return generateImage(`Upscale and enhance quality: ${prompt}`, aspectRatio, targetSize, SubjectPose.NONE, CameraAngle.NONE, [imageUrl]);
};

// Fix: Implement outpaintImage function
export const outpaintImage = async (
  canvasUrl: string,
  originalPrompt: string,
  aspectRatio: AspectRatio,
  outpaintPrompt: string
): Promise<string> => {
  const prompt = `Outpaint and fill the extended area: ${outpaintPrompt}. Context: ${originalPrompt}`;
  return generateImage(prompt, aspectRatio, ImageSize.RES_2K, SubjectPose.NONE, CameraAngle.NONE, [canvasUrl]);
};

// Fix: Implement inpaintImage function
export const inpaintImage = async (
  imageUrl: string,
  maskUrl: string,
  instruction: string,
  aspectRatio: AspectRatio
): Promise<string> => {
  const prompt = `Magic edit / Inpainting: ${instruction}`;
  return generateImage(prompt, aspectRatio, ImageSize.RES_2K, SubjectPose.NONE, CameraAngle.NONE, [imageUrl, maskUrl]);
};

// Fix: Implement generateMacroShot function
export const generateMacroShot = async (
  cropUrl: string,
  originalPrompt: string,
  aspectRatio: AspectRatio
): Promise<string> => {
  const prompt = `Macro shot enhancement, ultra high detail: ${originalPrompt}`;
  return generateImage(prompt, aspectRatio, ImageSize.RES_4K, SubjectPose.NONE, CameraAngle.NONE, [cropUrl]);
};

// 나머지 편집 관련 함수들도 동일하게 구현 가능
export const editImageWithPrompt = async (imageUrl: string, prompt: string, ratio: AspectRatio) => generateImage(prompt, ratio, ImageSize.RES_1K, SubjectPose.NONE, CameraAngle.NONE, [imageUrl]);
export const generateCharacterSheet = async (prompt: string, imageUrl: string) => generateImage("Character reference sheet, front/side/back view, " + prompt, AspectRatio.LANDSCAPE_16_9, ImageSize.RES_2K, SubjectPose.NONE, CameraAngle.NONE, [imageUrl]);
export const changePoseWithSketch = async (imageUrl: string, sketchUrl: string, prompt: string, ratio: AspectRatio) => generateImage("Change pose to match sketch, " + prompt, ratio, ImageSize.RES_2K, SubjectPose.NONE, CameraAngle.NONE, [imageUrl, sketchUrl]);
