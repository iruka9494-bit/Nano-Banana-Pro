

export enum AspectRatio {
  SQUARE = "1:1",
  PORTRAIT_3_4 = "3:4",
  LANDSCAPE_4_3 = "4:3",
  PORTRAIT_9_16 = "9:16",
  LANDSCAPE_16_9 = "16:9"
}

export enum ImageSize {
  RES_1K = "1K",
  RES_2K = "2K",
  RES_4K = "4K"
}

export enum CameraType {
  AUTO = "Auto / AI Best",
  CANON_R5 = "Canon EOS R5 (Skin Tone)",
  SONY_A7RV = "Sony A7R V (Razor Sharp)",
  FUJIFILM_GFX = "Fujifilm GFX 100S (Medium Format)",
  HASSELBLAD_X2D = "Hasselblad X2D (High-End)",
  LEICA_M11 = "Leica M11 (Emotive)",
  NIKON_Z9 = "Nikon Z9 (Realistic)"
}

export enum SubjectPose {
  NONE = "NONE",
  FRONT = "Front View",
  LEFT = "Left Profile",
  RIGHT = "Right Profile",
  BACK = "Back View",
  POSE_SITTING = "Sitting Pose",
  POSE_KNEELING = "Kneeling Pose",
  POSE_RECLINING = "Reclining Pose",
  POSE_HANDS_IN_HAIR = "Hands in Hair",
  POSE_DYNAMIC = "Dynamic S-Line",
  POSE_LOOKING_BACK = "Looking Back",
  POSE_PRONE = "Lying on Stomach",
  POSE_CAT = "Cat Pose",
  POSE_LEANING = "Leaning Forward",
  POSE_STRETCHING = "Stretching",
  POSE_LEGS_CROSSED = "Legs Crossed",
  POSE_HAND_ON_HIP = "Hand on Hip",
  POSE_FINGER_TO_LIPS = "Finger to Lips",
  POSE_SIDE_LYING = "Side Lying",
  POSE_HANDS_BEHIND_HEAD = "Hands Behind Head",
  POSE_SQUATTING = "Fashion Squat",
  // New Poses
  POSE_ONE_LEG = "Standing on One Leg",
  POSE_ELEGANT_CHAIR = "Elegant Chair Sit",
  POSE_DYNAMIC_FABRIC = "Dynamic Fabric",
  POSE_PENSIVE_CHIN = "Pensive / Hand on Chin",
  POSE_PLAYFUL_LIMBS = "Playful / Exaggerated",
  POSE_SERENE_NATURE = "Serene / Nature",
  // Gravure/Fashion Extensions
  POSE_KNEELING_BACK = "Kneeling Back View",
  POSE_LEANING_WALL = "Leaning on Wall",
  POSE_LYING_LEGS_UP = "Lying with Legs Up",
  POSE_OFF_SHOULDER = "Off-Shoulder / Pulling Strap",
  POSE_RUNWAY_WALK = "Runway Walk"
}

export enum CameraAngle {
  NONE = "NONE",
  EYE_LEVEL = "Eye Level",
  HIGH = "High Angle",
  LOW = "Low Angle",
  OVERHEAD = "Overhead",
  DUTCH = "Dutch Angle",
  MACRO = "Macro / Close-up",
  WIDE = "Wide Angle",
  SELFIE = "Selfie",
  FISHEYE = "Fisheye Lens",
  ISOMETRIC = "Isometric View",
  POV = "Point of View (POV)",
  DRONE = "Drone View",
  TILT_SHIFT = "Tilt-Shift",
  GROUND_LEVEL = "Ground Level",
  OTS = "Over-the-Shoulder",
  TELEPHOTO = "Telephoto Lens",
  BUGS_EYE = "Bug's Eye View",
  KNEE_LEVEL = "Knee Level",
  CCTV = "CCTV View",
  ACTION_CAM = "Action Cam",
  SATELLITE = "Satellite View",
  FLAT_LAY = "Flat Lay",
  UNDERWATER = "Underwater",
  NIGHT_VISION = "Night Vision",
  THERMAL = "Thermal Imaging",
  MICROSCOPE = "Microscope",
  CROSS_SECTION = "Cross Section",
  FULL_BODY = "Full Body / Zoom Out"
}

export interface ReferenceImageItem {
  id: string;
  url: string;
  isEnabled: boolean;
  name?: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  aspectRatio: AspectRatio;
  size: ImageSize;
  createdAt: number;
}

export interface GenerationConfig {
  prompt: string;
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  cameraType: CameraType;
  subjectPose: SubjectPose;
  cameraAngle: CameraAngle;
  referenceImages: ReferenceImageItem[]; // Array of objects with URL and state
}
