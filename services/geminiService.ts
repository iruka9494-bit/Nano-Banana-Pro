

import { GoogleGenAI } from "@google/genai";
import { AspectRatio, ImageSize, SubjectPose, CameraAngle, CameraType } from "../types";

// Use the mapped model name for "nano banana pro"
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
  // Create a new instance right before the call to ensure the latest API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const parts: any[] = [];

    // Process reference images first
    for (const dataUrl of referenceImages) {
      // data:image/png;base64,......
      const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Data,
          },
        });
      }
    }

    // Construct prompt modifiers
    const modifiers: string[] = [];
    
    // Camera Model Modifiers
    if (cameraType !== CameraType.AUTO) {
      switch (cameraType) {
        case CameraType.CANON_R5:
          modifiers.push("shot on Canon EOS R5, 85mm f1.2 lens, smooth soft skin tones, bright colors");
          break;
        case CameraType.SONY_A7RV:
          modifiers.push("shot on Sony A7R V, 50mm f1.2 GM lens, razor sharp focus, extreme resolution, hyper-realistic texture");
          break;
        case CameraType.FUJIFILM_GFX:
          modifiers.push("shot on Fujifilm GFX 100S, medium format 102MP, 110mm f2 lens, incredible depth of field, cinematic color grading");
          break;
        case CameraType.HASSELBLAD_X2D:
          modifiers.push("shot on Hasselblad X2D 100C, medium format, 100 megapixels, rich color depth, luxury studio photography style");
          break;
        case CameraType.LEICA_M11:
          modifiers.push("shot on Leica M11, Summilux-M 35mm f/1.4 ASPH, distinct leica look, deep contrast, emotive atmosphere");
          break;
        case CameraType.NIKON_Z9:
          modifiers.push("shot on Nikon Z9, Nikkor Z 58mm f/0.95 Noct, true-to-life colors, optical perfection");
          break;
      }
    } else {
      // Default fallback if AUTO
      modifiers.push("shot on high-end professional SLR camera, 85mm prime lens");
    }

    if (subjectPose !== SubjectPose.NONE) {
      switch (subjectPose) {
        case SubjectPose.FRONT: modifiers.push("front view, facing camera"); break;
        case SubjectPose.LEFT: modifiers.push("side profile view facing left"); break;
        case SubjectPose.RIGHT: modifiers.push("side profile view facing right"); break;
        case SubjectPose.BACK: modifiers.push("back view, facing away"); break;
        // New Model Poses
        case SubjectPose.POSE_SITTING: modifiers.push("sitting pose, sitting on floor, elegant posture, clean composition"); break;
        case SubjectPose.POSE_KNEELING: modifiers.push("kneeling pose, soft lighting, portrait photography"); break;
        case SubjectPose.POSE_RECLINING: modifiers.push("reclining pose, lying down, relaxed aesthetic"); break;
        case SubjectPose.POSE_HANDS_IN_HAIR: modifiers.push("hands in hair pose, arms raised, alluring expression, beauty shot"); break;
        case SubjectPose.POSE_DYNAMIC: modifiers.push("dynamic standing pose, S-line curve, confident look"); break;
        case SubjectPose.POSE_LOOKING_BACK: modifiers.push("looking back over shoulder, twisting torso, dynamic angle"); break;
        
        // Gravure / Fashion Additions
        case SubjectPose.POSE_PRONE: modifiers.push("lying on stomach, prone pose, elbows on ground, legs slightly raised, looking at camera"); break;
        case SubjectPose.POSE_CAT: modifiers.push("cat pose, crawling pose on all fours, arching back, dynamic silhouette"); break;
        case SubjectPose.POSE_LEANING: modifiers.push("leaning forward towards camera, engaging eye contact"); break;
        case SubjectPose.POSE_STRETCHING: modifiers.push("stretching arms overhead, elongating body line, relaxed vibe"); break;
        case SubjectPose.POSE_LEGS_CROSSED: modifiers.push("sitting with legs crossed, elegant leg line, sophisticated look"); break;
        
        // More Gravure / Fashion Poses
        case SubjectPose.POSE_HAND_ON_HIP: modifiers.push("standing with hand on hip, confident pose, defined waist"); break;
        case SubjectPose.POSE_FINGER_TO_LIPS: modifiers.push("finger to lips gesture, alluring expression, close-up beauty shot"); break;
        case SubjectPose.POSE_SIDE_LYING: modifiers.push("lying on side, supporting head with hand, elegant body curve"); break;
        case SubjectPose.POSE_HANDS_BEHIND_HEAD: modifiers.push("both hands behind head, elbows pointing out, highlighting upper body line"); break;
        case SubjectPose.POSE_SQUATTING: modifiers.push("squat pose, crouching down, trendy style"); break;

        // New Specific Poses
        case SubjectPose.POSE_ONE_LEG: modifiers.push("standing on one leg, balancing pose, flamingo stance, elegant silhouette"); break;
        case SubjectPose.POSE_ELEGANT_CHAIR: modifiers.push("sitting elegantly on a chair, legs crossed, regal posture"); break;
        case SubjectPose.POSE_DYNAMIC_FABRIC: modifiers.push("dynamic action pose, flowing fabric in motion, wind-blown dress"); break;
        case SubjectPose.POSE_PENSIVE_CHIN: modifiers.push("pensive pose, hand on chin, deep thought, thoughtful expression"); break;
        case SubjectPose.POSE_PLAYFUL_LIMBS: modifiers.push("playful pose, exaggerated limb positions, high energy"); break;
        case SubjectPose.POSE_SERENE_NATURE: modifiers.push("serene pose, relaxed body language, peaceful expression"); break;
        
        // Latest Gravure/Fashion Extensions
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
    if (modifiers.length > 0) {
      finalPrompt += (finalPrompt ? ", " : "") + modifiers.join(", ");
    }
    
    // Add context to the prompt - OPTIMIZED FOR SAFETY & QUALITY
    // Removed terms like "voluptuous", "curvy", "gravure" to avoid false positive safety blocks
    finalPrompt += ", photorealistic, 8k resolution, highly detailed, sharp focus, crystal clear, bright studio lighting, vivid colors, no noise, no grain, clean composition. Subject details: beautiful female fashion model, elegant physique, healthy and fit body shape, professional portfolio style, cute and charming face, smooth glossy skin, perfect makeup, detailed eyes, distinctive facial features, diverse beauty.";

    // Safety check for empty text prompts when using images
    if (!finalPrompt && parts.length > 0) {
       finalPrompt = "Generate a high quality, bright and clear image based on the provided reference.";
    }
    
    // Sanity check: Ensure prompt isn't too aggressive to avoid blocks
    if (finalPrompt.length > 2000) {
        finalPrompt = finalPrompt.substring(0, 2000);
    }

    // Add the text prompt
    parts.push({ text: finalPrompt });

    // Configure Safety Settings - Use BLOCK_ONLY_HIGH for maximum permissiveness
    const safetySettings = [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_ONLY_HIGH" },
    ];

    // Retry logic for timeouts
    const MAX_RETRIES = 3; 
    let lastError: any;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: {
            parts: parts,
          },
          config: {
            // System Instruction Updated for High-End Commercial Fashion (Safe)
            systemInstruction: "You are a world-class commercial fashion photographer using high-end SLR equipment. \n\nOBJECTIVE: Create stunning, bright, and sharp photos of fictional female subjects. \n\nSTYLE GUIDE:\n1. LIGHTING: Use bright, professional studio lighting or bright natural light. The image must be POP and VIVID.\n2. QUALITY: No noise, no blur. Extremely sharp focus on the eyes and face. 8K resolution feel. \n3. SUBJECT: Focus on idealized beauty. Generate subjects with elegant, fit, and attractive figures (fashion model style). \n4. FACE: Generate UNIQUE faces every time. Avoid the 'same face' syndrome. Combine different eye shapes and features. \n5. CONTENT: Always create FICTIONAL characters. Do not generate real people or deepfakes. Do not generate sexually explicit content or nudity. \n\nGenerate photorealistic, attractive images that capture the viewer's attention immediately.",
            imageConfig: {
              aspectRatio: aspectRatio,
              imageSize: imageSize,
            },
            safetySettings: safetySettings,
          },
        });

        if (response.promptFeedback?.blockReason) {
            throw new Error(`Request blocked by safety filters: ${response.promptFeedback.blockReason}`);
        }

        const candidate = response.candidates?.[0];
        
        if (!candidate) {
            if (response.promptFeedback) {
                 throw new Error(`No candidates returned. Block reason: ${response.promptFeedback.blockReason || 'Unknown'}`);
            }
            throw new Error("No candidates returned from the model. Try modifying the prompt.");
        }

        if (candidate.content?.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.data) {
                const mimeType = part.inlineData.mimeType || "image/png";
                return `data:${mimeType};base64,${part.inlineData.data}`;
            }
          }
          
          const textPart = candidate.content.parts.find(p => p.text);
          if (textPart?.text) {
              throw new Error(`Model Response: ${textPart.text}`);
          }
        }
        
        if (candidate.finishReason && candidate.finishReason !== "STOP") {
            throw new Error(`Generation stopped: ${candidate.finishReason}`);
        }

        throw new Error("No image data found in the response.");

      } catch (error: any) {
        lastError = error;
        
        // Robustly extract error message and status
        let msg = "";
        if (error.message) msg = error.message;
        else if (error.error && error.error.message) msg = error.error.message;
        else msg = JSON.stringify(error); 

        const code = error.status || (error.error && error.error.code) || error.code;

        const isTimeout = 
            msg.includes('Deadline expired') || 
            msg.includes('503') || 
            code === 503 || 
            code === 'UNAVAILABLE';
        
        if (isTimeout && attempt < MAX_RETRIES) {
          console.warn(`Attempt ${attempt + 1} failed with timeout (503/Deadline). Retrying...`);
          await new Promise(resolve => setTimeout(resolve, 3000 * (attempt + 1)));
          continue;
        }
        
        throw error;
      }
    }
    throw lastError;

  } catch (error) {
    console.error("Image generation failed:", error);
    throw error;
  }
};

export const editImageWithPrompt = async (
  originalImageUrl: string,
  instruction: string,
  aspectRatio: AspectRatio
): Promise<string> => {
  // Construct a prompt that instructs the model to use the reference but change specific things
  const editPrompt = `
    EDITING INSTRUCTION: ${instruction}.
    
    BASE IMAGE: Use the provided image as the primary reference for the subject, composition, and style.
    MODIFICATION: Apply the editing instruction above.
    
    CRITICAL: Maintain the original character's identity and the overall lighting/quality of the reference image unless instructed otherwise.
    Output a high-quality, photorealistic image.
  `;

  return generateImage(
    editPrompt,
    aspectRatio,
    ImageSize.RES_2K,
    SubjectPose.NONE,
    CameraAngle.NONE,
    [originalImageUrl]
  );
};

export const changePoseWithSketch = async (
  originalImageUrl: string,
  sketchImageUrl: string,
  promptDescription: string,
  aspectRatio: AspectRatio
): Promise<string> => {
  const posePrompt = `
    POSE MODIFICATION TASK.
    
    INPUT 1: Original Image (Source Character).
    INPUT 2: Sketch Overlay (Pose Reference).
    
    INSTRUCTION: Change the pose of the character in the Original Image to match the structure drawn in the Sketch Overlay.
    - The lines in the second image represent the target skeletal structure (bones/limbs).
    - If multiple characters exist, apply the pose change to the character under the sketch lines.
    - Preserve the character's identity, face, outfit, and the background from the Original Image.
    - User Description: ${promptDescription || "Match the drawn pose exactly."}
    
    Output a high-quality, photorealistic image with the new pose.
  `;

  return generateImage(
    posePrompt,
    aspectRatio,
    ImageSize.RES_2K,
    SubjectPose.NONE,
    CameraAngle.NONE,
    [originalImageUrl, sketchImageUrl]
  );
};

export const upscaleImage = async (
  originalPrompt: string,
  aspectRatio: AspectRatio,
  imageUrl: string,
  targetSize: ImageSize
): Promise<string> => {
  // Updated upscale prompt to force sharp SLR quality
  const enhancementPrompt = `${originalPrompt} , shot on Sony A7R V or Canon R5, sharp focus, best quality, ultra high res, crystal clear, noise reduction, professional photography, bright lighting`;
  
  return generateImage(
    enhancementPrompt,
    aspectRatio,
    targetSize,
    SubjectPose.NONE,
    CameraAngle.NONE,
    [imageUrl]
  );
};

export const generateCharacterSheet = async (
  originalPrompt: string,
  referenceImageUrl: string
): Promise<string> => {
  const sheetPrompt = `
    Create a professional character reference sheet containing three views: Front View, Side Profile, and Back View.
    
    CRITICAL INSTRUCTIONS:
    1. STRICTLY PRESERVE the art style, rendering technique, texture quality, and lighting of the reference image.
    2. If the reference is photorealistic, the output MUST be photorealistic.
    3. Maintain the exact facial features, expression, skin texture, and clothing details of the subject.
    4. Use a neutral background.
    5. **NO TEXT, NO LABELS, NO ANNOTATIONS.** The output must be purely visual.

    Original Context: ${originalPrompt}
  `;

  return generateImage(
    sheetPrompt,
    AspectRatio.LANDSCAPE_16_9,
    ImageSize.RES_2K,
    SubjectPose.NONE,
    CameraAngle.NONE,
    [referenceImageUrl]
  );
};

export const outpaintImage = async (
  canvasImageUrl: string,
  originalPrompt: string,
  aspectRatio: AspectRatio,
  fillPrompt: string = ""
): Promise<string> => {
  const contextPrompt = fillPrompt.trim() 
    ? `Outpaint and fill the empty/black background areas seamlessly. Context: ${fillPrompt}. Style match: ${originalPrompt}` 
    : `Generative Fill: Seamlessly fill the empty surrounding space to extend the image. Maintain perfect consistency with the center image. No visible seams. Original context: ${originalPrompt}`;

  return generateImage(
    contextPrompt,
    aspectRatio,
    ImageSize.RES_2K,
    SubjectPose.NONE,
    CameraAngle.NONE,
    [canvasImageUrl]
  );
};

export const inpaintImage = async (
  originalImageUrl: string,
  maskImageUrl: string,
  prompt: string,
  aspectRatio: AspectRatio
): Promise<string> => {
  // Ensure prompt isn't empty to avoid 400 errors
  const safePrompt = prompt.trim() || "Modify this area to match the surrounding image";
  const finalPrompt = `Inpainting / Magic Edit: ${safePrompt}. Change ONLY the area defined by the mask. Keep the rest of the image exactly the same.`;

  return generateImage(
    finalPrompt,
    aspectRatio,
    ImageSize.RES_2K,
    SubjectPose.NONE,
    CameraAngle.NONE,
    [originalImageUrl, maskImageUrl] 
  );
};

export const generateMacroShot = async (
  croppedImageUrl: string,
  originalPrompt: string,
  aspectRatio: AspectRatio
): Promise<string> => {
  // Logic updated: High-Fidelity Upscale of cropped view
  
  const upscalePrompt = `
    High-resolution upscale of this specific cropped view.
    Context: ${originalPrompt}

    Instructions:
    1. INCREASE RESOLUTION to 4K.
    2. Sharpen details, refine textures, and improve focus.
    3. STRICTLY MAINTAIN the current composition, angle, and subject pose.
    4. Do not add new elements or change the art style.
    5. Ensure image is clear and noise-free.
  `;

  // Use the aspect ratio passed from the modal, fallback to square if something goes wrong
  return generateImage(
    upscalePrompt,
    aspectRatio, 
    ImageSize.RES_4K, // Force 4K for the "macro" effect
    SubjectPose.NONE,
    CameraAngle.NONE,
    [croppedImageUrl]
  );
};
