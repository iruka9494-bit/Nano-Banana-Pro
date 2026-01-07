
import { GoogleGenAI } from "@google/genai";
import { AspectRatio, ImageSize, SubjectPose, CameraAngle, CameraType } from "../types";

// Use the mapped model name for "nano banana pro"
const MODEL_NAME = "gemini-3-pro-image-preview";

/**
 * Tests the API key validity by making a minimal text request.
 * This checks for 401 (Invalid), 403 (Permission/Billing), and 429 (Quota) errors.
 */
export const testApiKeyConnection = async (): Promise<{ success: boolean; message: string; details?: string }> => {
  // Always create a fresh instance using the current process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    // Fast connectivity test using Flash Lite
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: 'ping',
      config: { maxOutputTokens: 2 }
    });
    
    if (response.text) {
      return { success: true, message: "연결 성공: API 키가 활성화되어 있으며 모든 시스템이 정상 작동 중입니다." };
    }
    return { success: false, message: "응답 지연: 시스템 응답을 수신하지 못했습니다." };
  } catch (error: any) {
    let msg = error.message || JSON.stringify(error);
    let details = "";
    
    if (msg.includes('403') || msg.includes('permission')) {
      details = "결제 계정이 연결된 유료 프로젝트의 API 키가 아니거나 권한이 없습니다. Google Cloud Console에서 결제 상태를 확인하세요.";
    } else if (msg.includes('429')) {
      details = "사용량 한도 도달: 현재 할당량이 소진되었거나 요청 빈도가 너무 높습니다.";
    } else if (msg.includes('401') || msg.includes('INVALID_ARGUMENT')) {
      details = "잘못된 인증: API 키가 유효하지 않거나 플랫폼에서 인식하지 못합니다.";
    } else {
      details = "네트워크 장애: 인터넷 연결을 확인하거나 나중에 다시 시도해 주세요.";
    }
    
     { success: false, message: "연결 실패", details };
  }
};

export const generateImage = async (
  apiKey: string, // <-- 첫 번째 인자로 apiKey 추가
  prompt: string,
  aspectRatio: AspectRatio,
  imageSize: ImageSize,
  subjectPose: SubjectPose,
  cameraAngle: CameraAngle,
  referenceImages: string[] = [],
  cameraType: CameraType = CameraType.AUTO
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: apiKey }); // <-- 전달받은 사용자 키 사용

  try {
    const parts: any[] = [];
    for (const dataUrl of referenceImages) {
      const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        parts.push({
          inlineData: { mimeType: matches[1], data: matches[2] },
        });
      }
    }

    const modifiers: string[] = [];
    if (cameraType !== CameraType.AUTO) {
      switch (cameraType) {
        case CameraType.CANON_R5: modifiers.push("shot on Canon EOS R5, 85mm f1.2 lens, smooth soft skin tones, bright colors"); break;
        case CameraType.SONY_A7RV: modifiers.push("shot on Sony A7R V, 50mm f1.2 GM lens, razor sharp focus, extreme resolution, hyper-realistic texture"); break;
        case CameraType.FUJIFILM_GFX: modifiers.push("shot on Fujifilm GFX 100S, medium format 102MP, 110mm f2 lens, incredible depth of field, cinematic color grading"); break;
        case CameraType.HASSELBLAD_X2D: modifiers.push("shot on Hasselblad X2D 100C, medium format, 100 megapixels, rich color depth, luxury studio photography style"); break;
        case CameraType.LEICA_M11: modifiers.push("shot on Leica M11, Summilux-M 35mm f/1.4 ASPH, distinct leica look, deep contrast, emotive atmosphere"); break;
        case CameraType.NIKON_Z9: modifiers.push("shot on Nikon Z9, Nikkor Z 58mm f/0.95 Noct, true-to-life colors, optical perfection"); break;
      }
    } else {
      modifiers.push("shot on high-end professional SLR camera, 85mm prime lens");
    }

    if (subjectPose !== SubjectPose.NONE) {
      switch (subjectPose) {
        case SubjectPose.FRONT: modifiers.push("front view, facing camera"); break;
        case SubjectPose.LEFT: modifiers.push("side profile view facing left"); break;
        case SubjectPose.RIGHT: modifiers.push("side profile view facing right"); break;
        case SubjectPose.BACK: modifiers.push("back view, facing away"); break;
        case SubjectPose.POSE_SITTING: modifiers.push("sitting pose, sitting on floor, elegant posture, clean composition"); break;
        case SubjectPose.POSE_KNEELING: modifiers.push("kneeling pose, soft lighting, portrait photography"); break;
        case SubjectPose.POSE_RECLINING: modifiers.push("reclining pose, lying down, relaxed aesthetic"); break;
        case SubjectPose.POSE_HANDS_IN_HAIR: modifiers.push("hands in hair pose, arms raised, alluring expression, beauty shot"); break;
        case SubjectPose.POSE_DYNAMIC: modifiers.push("dynamic standing pose, S-line curve, confident look"); break;
        case SubjectPose.POSE_LOOKING_BACK: modifiers.push("looking back over shoulder, twisting torso, dynamic angle"); break;
        case SubjectPose.POSE_PRONE: modifiers.push("lying on stomach, prone pose, elbows on ground, legs slightly raised, looking at camera"); break;
        case SubjectPose.POSE_CAT: modifiers.push("cat pose, crawling pose on all fours, arching back, dynamic silhouette"); break;
        case SubjectPose.POSE_LEANING: modifiers.push("leaning forward towards camera, engaging eye contact"); break;
        case SubjectPose.POSE_STRETCHING: modifiers.push("stretching arms overhead, elongating body line, relaxed vibe"); break;
        case SubjectPose.POSE_LEGS_CROSSED: modifiers.push("sitting with legs crossed, elegant leg line, sophisticated look"); break;
        case SubjectPose.POSE_HAND_ON_HIP: modifiers.push("standing with hand on hip, confident pose, defined waist"); break;
        case SubjectPose.POSE_FINGER_TO_LIPS: modifiers.push("finger to lips gesture, alluring expression, close-up beauty shot"); break;
        case SubjectPose.POSE_SIDE_LYING: modifiers.push("lying on side, supporting head with hand, elegant body curve"); break;
        case SubjectPose.POSE_HANDS_BEHIND_HEAD: modifiers.push("both hands behind head, elbows pointing out, highlighting upper body line"); break;
        case SubjectPose.POSE_SQUATTING: modifiers.push("squat pose, crouching down, trendy style"); break;
        case SubjectPose.POSE_ONE_LEG: modifiers.push("standing on one leg, balancing pose, flamingo stance, elegant silhouette"); break;
        case SubjectPose.POSE_ELEGANT_CHAIR: modifiers.push("sitting elegantly on a chair, legs crossed, regal posture"); break;
        case SubjectPose.POSE_DYNAMIC_FABRIC: modifiers.push("dynamic action pose, flowing fabric in motion, wind-blown dress"); break;
        case SubjectPose.POSE_PENSIVE_CHIN: modifiers.push("pensive pose, hand on chin, deep thought, thoughtful expression"); break;
        case SubjectPose.POSE_PLAYFUL_LIMBS: modifiers.push("playful pose, exaggerated limb positions, high energy"); break;
        case SubjectPose.POSE_SERENE_NATURE: modifiers.push("serene pose, relaxed body language, peaceful expression"); break;
        case SubjectPose.POSE_KNEELING_BACK: modifiers.push("kneeling facing away, looking back over shoulder, accentuating back line"); break;
        case SubjectPose.POSE_LEANING_WALL: modifiers.push("leaning against wall, hands on wall, cool attitude"); break;
        case SubjectPose.POSE_LYING_LEGS_UP: modifiers.push("lying on back, legs raised in air, playful expression"); break;
        case SubjectPose.POSE_OFF_SHOULDER: modifiers.push("wearing off-shoulder outfit, exposing collarbone, elegant portrait"); break;
        case SubjectPose.POSE_RUNWAY_WALK: modifiers.push("walking towards camera, confident runway stride, flowing movement"); break;
      }
    }

    if (cameraAngle !== CameraAngle.NONE) {
      switch (cameraAngle) {
        case CameraAngle.EYE_LEVEL: modifiers.push("eye level shot, balanced perspective"); break;
        case CameraAngle.LOW: modifiers.push("low angle shot, looking up"); break;
        case CameraAngle.HIGH: modifiers.push("high angle shot, looking down"); break;
        case CameraAngle.OVERHEAD: modifiers.push("top-down view, overhead shot, aerial view"); break;
        case CameraAngle.DUTCH: modifiers.push("dutch angle, tilted frame, dynamic composition"); break;
        case CameraAngle.MACRO: modifiers.push("macro shot, close-up, sharp detail"); break;
        case CameraAngle.WIDE: modifiers.push("wide angle lens, broad view"); break;
        case CameraAngle.SELFIE: modifiers.push("selfie shot, camera held by subject, arm's length view"); break;
        case CameraAngle.FISHEYE: modifiers.push("fisheye lens effect, strong distortion, ultra-wide circular view"); break;
        case CameraAngle.ISOMETRIC: modifiers.push("isometric view, 3d render style, diagonal projection"); break;
        case CameraAngle.POV: modifiers.push("first-person perspective, POV shot, seeing through eyes"); break;
        case CameraAngle.DRONE: modifiers.push("drone shot, high altitude aerial photography, establishing shot"); break;
        case CameraAngle.TILT_SHIFT: modifiers.push("tilt-shift photography, miniature effect, shallow depth of field, blurred edges"); break;
        case CameraAngle.GROUND_LEVEL: modifiers.push("ground level shot, camera placed on floor, extremely low angle"); break;
        case CameraAngle.OTS: modifiers.push("over-the-shoulder shot, view past subject, conversational perspective"); break;
        case CameraAngle.TELEPHOTO: modifiers.push("telephoto lens, compressed depth, flattened perspective, bokeh background"); break;
        case CameraAngle.BUGS_EYE: modifiers.push("bug's eye view, micro perspective looking up, giant world scale"); break;
        case CameraAngle.KNEE_LEVEL: modifiers.push("knee level shot, camera placed at knee height, cinematic angle"); break;
        case CameraAngle.CCTV: modifiers.push("security camera footage, CCTV view, surveillance angle"); break;
        case CameraAngle.ACTION_CAM: modifiers.push("action camera view, GoPro style, ultra wide angle, dynamic perspective"); break;
        case CameraAngle.SATELLITE: modifiers.push("satellite view, orbital imagery, straight down from space, map-like perspective"); break;
        case CameraAngle.FLAT_LAY: modifiers.push("flat lay photography, knolling, direct top-down view, organized arrangement"); break;
        case CameraAngle.UNDERWATER: modifiers.push("underwater shot, submerged view, refracted light, caustics, bubbles"); break;
        case CameraAngle.NIGHT_VISION: modifiers.push("night vision, green screen effect, grain, low light enhancement"); break;
        case CameraAngle.THERMAL: modifiers.push("thermal imaging, heat map, infrared camera style"); break;
        case CameraAngle.MICROSCOPE: modifiers.push("microscope view, scientific imaging"); break;
        case CameraAngle.CROSS_SECTION: modifiers.push("cross-section view, cutaway diagram, internal structure revealed"); break;
        case CameraAngle.FULL_BODY: modifiers.push("full body shot, zoomed out, long shot, entire subject visible, far distance"); break;
      }
    }

    let finalPrompt = prompt.trim();
    if (modifiers.length > 0) finalPrompt += (finalPrompt ? ", " : "") + modifiers.join(", ");
    finalPrompt += ", photorealistic, 8k resolution, highly detailed, sharp focus, crystal clear, bright studio lighting, vivid colors, no noise, no grain, clean composition. Subject details: beautiful female fashion model, elegant physique, healthy and fit body shape, professional portfolio style, cute and charming face, smooth glossy skin, perfect makeup, detailed eyes, distinctive facial features, diverse beauty.";

    if (!finalPrompt && parts.length > 0) finalPrompt = "Generate a high quality, bright and clear image based on the provided reference.";
    if (finalPrompt.length > 2000) finalPrompt = finalPrompt.substring(0, 2000);
    parts.push({ text: finalPrompt });

    const safetySettings = [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_ONLY_HIGH" },
    ];

    const MAX_RETRIES = 3; 
    let lastError: any;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: { parts: parts },
          config: {
            systemInstruction: "You are a world-class commercial fashion photographer using high-end SLR equipment. OBJECTIVE: Create stunning, bright, and sharp photos of fictional female subjects. STYLE GUIDE: 1. LIGHTING: Use bright, professional studio lighting. 2. QUALITY: Extremely sharp focus, no blur. 3. SUBJECT: Fashion model style fictional characters. No real people or nudity.",
            imageConfig: { aspectRatio: aspectRatio, imageSize: imageSize },
            safetySettings: safetySettings,
          },
        });

        if (response.promptFeedback?.blockReason) throw new Error(`Request blocked: ${response.promptFeedback.blockReason}`);
        const candidate = response.candidates?.[0];
        if (!candidate) throw new Error("No candidates ed.");
        if (candidate.content?.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.data)  `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
          }
        }
        throw new Error("No image data found.");
      } catch (error: any) {
        lastError = error;
        if ((error.message?.includes('503') || error.status === 503) && attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 3000 * (attempt + 1)));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  } catch (error) { throw error; }
};

export const editImageWithPrompt = async (apiKey: string, originalImageUrl: string, instruction: string, aspectRatio: AspectRatio): Promise<string> => {
  const editPrompt = `EDITING INSTRUCTION: ${instruction}. BASE IMAGE: Provided. MODIFICATION: Apply instruction. CRITICAL: Maintain identity.`;
  return generateImage(apiKey, editPrompt, aspectRatio, ImageSize.RES_2K, SubjectPose.NONE, CameraAngle.NONE, [originalImageUrl]);
};

export const changePoseWithSketch = async (apiKey: string, originalImageUrl: string, sketchImageUrl: string, promptDescription: string, aspectRatio: AspectRatio): Promise<string> => {
  const posePrompt = `POSE MODIFICATION TASK. INPUT 1: Original. INPUT 2: Sketch. INSTRUCTION: Match pose in sketch. Maintain identity.`;
  return generateImage(apiKey, posePrompt, aspectRatio, ImageSize.RES_2K, SubjectPose.NONE, CameraAngle.NONE, [originalImageUrl, sketchImageUrl]);
};

export const upscaleImage = async (apiKey: string, originalPrompt: string, aspectRatio: AspectRatio, imageUrl: string, targetSize: ImageSize): Promise<string> => {
  const enhancementPrompt = `${originalPrompt}, sharp focus, best quality, ultra high res, crystal clear, noise reduction, professional photography`;
  return generateImage(apiKey, enhancementPrompt, aspectRatio, targetSize, SubjectPose.NONE, CameraAngle.NONE, [imageUrl]);
};

export const generateCharacterSheet = async (apiKey: string, originalPrompt: string, referenceImageUrl: string): Promise<string> => {
  const sheetPrompt = `Create a professional character reference sheet: Front, Side, and Back View. Preserve style. NO TEXT.`;
  return generateImage(apiKey, sheetPrompt, AspectRatio.LANDSCAPE_16_9, ImageSize.RES_2K, SubjectPose.NONE, CameraAngle.NONE, [referenceImageUrl]);
};

export const outpaintImage = async (apiKey: string, canvasImageUrl: string, originalPrompt: string, aspectRatio: AspectRatio, fillPrompt: string = ""): Promise<string> => {
  const contextPrompt = fillPrompt.trim() ? `Outpaint: ${fillPrompt}. Style: ${originalPrompt}` : `Generative Fill: Seamlessly extend the image. Context: ${originalPrompt}`;
  return generateImage(apiKey, contextPrompt, aspectRatio, ImageSize.RES_2K, SubjectPose.NONE, CameraAngle.NONE, [canvasImageUrl]);
};

export const inpaintImage = async (apiKey: string, originalImageUrl: string, maskImageUrl: string, prompt: string, aspectRatio: AspectRatio): Promise<string> => {
  const safePrompt = prompt.trim() || "Modify this area";
  const finalPrompt = `Inpainting: ${safePrompt}. Change ONLY masked area.`;
  return generateImage(apiKey, finalPrompt, aspectRatio, ImageSize.RES_2K, SubjectPose.NONE, CameraAngle.NONE, [originalImageUrl, maskImageUrl]);
};

export const generateMacroShot = async (apiKey: string, croppedImageUrl: string, originalPrompt: string, aspectRatio: AspectRatio): Promise<string> => {
  const upscalePrompt = `High-resolution upscale of cropped view. Context: ${originalPrompt}. 4K, sharpen details.`;
  return generateImage(apiKey, upscalePrompt, aspectRatio, ImageSize.RES_4K, SubjectPose.NONE, CameraAngle.NONE, [croppedImageUrl]);
};
