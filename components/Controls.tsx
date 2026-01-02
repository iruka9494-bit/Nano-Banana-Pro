

import React, { useRef, useState } from 'react';
import { AspectRatio, ImageSize, GenerationConfig, SubjectPose, CameraAngle, ReferenceImageItem, CameraType } from '../types';
import { Settings2, Wand2, Loader2, ImagePlus, X, UploadCloud, Layers, User, Camera, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Eye, MoveDiagonal, ZoomIn, Maximize, Check, Pencil, Smartphone, Aperture, Box, Navigation, Plane, Minimize2, ArrowDownToLine, Users, Scan, Bug, ChevronsUp, Video, Zap, Globe, LayoutGrid, ZoomOut, Armchair, UserPlus, Activity, ArrowDownLeft, MoveVertical, UserCheck, Wind, Flower, Smile, Repeat, PanelLeft, ArrowUpRight, UserMinus, Footprints } from 'lucide-react';

interface ControlsProps {
  config: GenerationConfig;
  isGenerating: boolean;
  onChange: (key: keyof GenerationConfig, value: any) => void;
  onSubmit: () => void;
  hasHistory: boolean;
  onEditReference?: (id: string) => void;
}

export const Controls: React.FC<ControlsProps> = ({
  config,
  isGenerating,
  onChange,
  onSubmit,
  hasHistory,
  onEditReference
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = (files: File[]) => {
    const currentCount = config.referenceImages.length;
    const remainingSlots = 20 - currentCount;
    
    if (remainingSlots <= 0) {
      alert("최대 20장까지만 업로드할 수 있습니다.");
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    const readers: Promise<{url: string, name: string}>[] = [];

    filesToProcess.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      
      const reader = new Promise<{url: string, name: string}>((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.onload = () => resolve({ url: fileReader.result as string, name: file.name });
        fileReader.onerror = reject;
        fileReader.readAsDataURL(file);
      });
      readers.push(reader);
    });

    Promise.all(readers).then(results => {
      const newItems: ReferenceImageItem[] = results.map(item => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        url: item.url,
        isEnabled: true,
        name: item.name
      }));
      onChange('referenceImages', [...config.referenceImages, ...newItems]);
    });
  };

  const removeImage = (index: number) => {
    const newImages = [...config.referenceImages];
    newImages.splice(index, 1);
    onChange('referenceImages', newImages);
  };

  const toggleImage = (index: number) => {
    const newImages = [...config.referenceImages];
    newImages[index].isEnabled = !newImages[index].isEnabled;
    onChange('referenceImages', newImages);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-4 text-banana-400 font-medium">
        <Settings2 className="w-5 h-5" />
        <h2>설정</h2>
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-slate-500 font-bold">
            화면 비율
          </label>
          <select
            value={config.aspectRatio}
            onChange={(e) => onChange('aspectRatio', e.target.value)}
            disabled={isGenerating}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:ring-2 focus:ring-banana-500/50 focus:border-banana-500 outline-none transition-all appearance-none cursor-pointer disabled:opacity-50"
          >
            {Object.values(AspectRatio).map((ratio) => (
              <option key={ratio} value={ratio}>{ratio}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-slate-500 font-bold">
            해상도
          </label>
          <select
            value={config.imageSize}
            onChange={(e) => onChange('imageSize', e.target.value)}
            disabled={isGenerating}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:ring-2 focus:ring-banana-500/50 focus:border-banana-500 outline-none transition-all appearance-none cursor-pointer disabled:opacity-50"
          >
            {Object.values(ImageSize).map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2 mb-6">
         <label className="text-xs uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1">
             <Camera className="w-3 h-3" /> 카메라 기종 (Camera Model)
         </label>
         <select
            value={config.cameraType}
            onChange={(e) => onChange('cameraType', e.target.value)}
            disabled={isGenerating}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:ring-2 focus:ring-banana-500/50 focus:border-banana-500 outline-none transition-all appearance-none cursor-pointer disabled:opacity-50"
         >
            {Object.entries(CameraType).map(([key, value]) => (
                <option key={key} value={value}>{value}</option>
            ))}
         </select>
      </div>

      {/* Subject Pose and Camera Angle Controls */}
      <div className="mb-6 space-y-4">
        {/* Pose */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1">
            <User className="w-3 h-3" /> 피사체 방향 (Pose)
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { val: SubjectPose.NONE, icon: <X className="w-4 h-4" />, label: "없음" },
              { val: SubjectPose.FRONT, icon: <User className="w-4 h-4" />, label: "정면" },
              { val: SubjectPose.LEFT, icon: <ArrowLeft className="w-4 h-4" />, label: "왼쪽" },
              { val: SubjectPose.RIGHT, icon: <ArrowRight className="w-4 h-4" />, label: "오른쪽" },
              { val: SubjectPose.BACK, icon: <User className="w-4 h-4 opacity-50" />, label: "뒷모습" },
              { val: SubjectPose.POSE_SITTING, icon: <Armchair className="w-4 h-4" />, label: "앉기" },
              { val: SubjectPose.POSE_KNEELING, icon: <User className="w-4 h-4" />, label: "무릎꿇기" },
              { val: SubjectPose.POSE_RECLINING, icon: <User className="w-4 h-4 -rotate-90" />, label: "눕기" },
              { val: SubjectPose.POSE_HANDS_IN_HAIR, icon: <UserPlus className="w-4 h-4" />, label: "머리넘기기" },
              { val: SubjectPose.POSE_LOOKING_BACK, icon: <User className="w-4 h-4" />, label: "뒤돌아보기" },
              { val: SubjectPose.POSE_DYNAMIC, icon: <Activity className="w-4 h-4" />, label: "S라인" },
              { val: SubjectPose.POSE_PRONE, icon: <ArrowDown className="w-4 h-4" />, label: "엎드리기" },
              { val: SubjectPose.POSE_CAT, icon: <Activity className="w-4 h-4 rotate-90" />, label: "캣 포즈" },
              { val: SubjectPose.POSE_LEANING, icon: <ArrowDownLeft className="w-4 h-4" />, label: "숙이기" },
              { val: SubjectPose.POSE_STRETCHING, icon: <MoveVertical className="w-4 h-4" />, label: "스트레칭" },
              { val: SubjectPose.POSE_LEGS_CROSSED, icon: <UserCheck className="w-4 h-4" />, label: "다리꼬기" },
              { val: SubjectPose.POSE_HAND_ON_HIP, icon: <UserCheck className="w-4 h-4" />, label: "손 허리" },
              { val: SubjectPose.POSE_FINGER_TO_LIPS, icon: <User className="w-4 h-4" />, label: "입술 터치" },
              { val: SubjectPose.POSE_SIDE_LYING, icon: <ArrowRight className="w-4 h-4" />, label: "옆으로 눕기" },
              { val: SubjectPose.POSE_HANDS_BEHIND_HEAD, icon: <UserPlus className="w-4 h-4" />, label: "머리 뒤 손" },
              { val: SubjectPose.POSE_SQUATTING, icon: <ArrowDown className="w-4 h-4" />, label: "쪼그려 앉기" },
              
              // New Specific Poses
              { val: SubjectPose.POSE_ONE_LEG, icon: <MoveVertical className="w-4 h-4" />, label: "한발 서기" },
              { val: SubjectPose.POSE_ELEGANT_CHAIR, icon: <Armchair className="w-4 h-4" />, label: "의자 앉기" },
              { val: SubjectPose.POSE_DYNAMIC_FABRIC, icon: <Wind className="w-4 h-4" />, label: "흩날리는 옷" },
              { val: SubjectPose.POSE_PENSIVE_CHIN, icon: <User className="w-4 h-4" />, label: "턱 괴기/생각" },
              { val: SubjectPose.POSE_PLAYFUL_LIMBS, icon: <Activity className="w-4 h-4" />, label: "과장된 포즈" },
              { val: SubjectPose.POSE_SERENE_NATURE, icon: <Flower className="w-4 h-4" />, label: "자연/평온" },
              
              // Latest Gravure/Fashion Extensions
              { val: SubjectPose.POSE_KNEELING_BACK, icon: <Repeat className="w-4 h-4" />, label: "무릎꿇고 뒤태" },
              { val: SubjectPose.POSE_LEANING_WALL, icon: <PanelLeft className="w-4 h-4" />, label: "벽에 기대기" },
              { val: SubjectPose.POSE_LYING_LEGS_UP, icon: <ArrowUpRight className="w-4 h-4" />, label: "다리 들기" },
              { val: SubjectPose.POSE_OFF_SHOULDER, icon: <UserMinus className="w-4 h-4" />, label: "오프숄더" },
              { val: SubjectPose.POSE_RUNWAY_WALK, icon: <Footprints className="w-4 h-4" />, label: "런웨이 워킹" },
            ].map((item) => (
              <button
                key={item.val}
                onClick={() => onChange('subjectPose', item.val)}
                disabled={isGenerating}
                className={`
                  flex flex-col items-center justify-center p-2 rounded-lg border text-[10px] transition-all gap-1 min-h-[52px]
                  ${config.subjectPose === item.val 
                    ? 'bg-banana-500 text-slate-950 border-banana-500 shadow-lg shadow-banana-500/20' 
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                  }
                `}
                title={item.label}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Angle */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1">
            <Camera className="w-3 h-3" /> 카메라 앵글 (Angle)
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { val: CameraAngle.NONE, icon: <X className="w-4 h-4" />, label: "없음" },
              { val: CameraAngle.EYE_LEVEL, icon: <Eye className="w-4 h-4" />, label: "아이레벨" },
              { val: CameraAngle.LOW, icon: <ArrowUp className="w-4 h-4" />, label: "로우" },
              { val: CameraAngle.HIGH, icon: <ArrowDown className="w-4 h-4" />, label: "하이" },
              { val: CameraAngle.OVERHEAD, icon: <Layers className="w-4 h-4" />, label: "탑뷰" },
              { val: CameraAngle.DUTCH, icon: <MoveDiagonal className="w-4 h-4" />, label: "더치" },
              { val: CameraAngle.MACRO, icon: <ZoomIn className="w-4 h-4" />, label: "매크로" },
              { val: CameraAngle.WIDE, icon: <Maximize className="w-4 h-4" />, label: "광각" },
              { val: CameraAngle.SELFIE, icon: <Smartphone className="w-4 h-4" />, label: "셀피" },
              { val: CameraAngle.FISHEYE, icon: <Aperture className="w-4 h-4" />, label: "피쉬아이" },
              { val: CameraAngle.ISOMETRIC, icon: <Box className="w-4 h-4" />, label: "3D 뷰" },
              { val: CameraAngle.POV, icon: <Navigation className="w-4 h-4" />, label: "1인칭" },
              { val: CameraAngle.DRONE, icon: <Plane className="w-4 h-4" />, label: "드론" },
              { val: CameraAngle.TILT_SHIFT, icon: <Minimize2 className="w-4 h-4" />, label: "틸트시프트" },
              { val: CameraAngle.GROUND_LEVEL, icon: <ArrowDownToLine className="w-4 h-4" />, label: "지면" },
              { val: CameraAngle.OTS, icon: <Users className="w-4 h-4" />, label: "어깨너머" },
              { val: CameraAngle.TELEPHOTO, icon: <Scan className="w-4 h-4" />, label: "망원" },
              { val: CameraAngle.BUGS_EYE, icon: <Bug className="w-4 h-4" />, label: "버그아이" },
              { val: CameraAngle.KNEE_LEVEL, icon: <ChevronsUp className="w-4 h-4" />, label: "니 레벨" },
              { val: CameraAngle.CCTV, icon: <Video className="w-4 h-4" />, label: "CCTV" },
              { val: CameraAngle.ACTION_CAM, icon: <Zap className="w-4 h-4" />, label: "액션캠" },
              { val: CameraAngle.SATELLITE, icon: <Globe className="w-4 h-4" />, label: "위성" },
              { val: CameraAngle.FLAT_LAY, icon: <LayoutGrid className="w-4 h-4" />, label: "플랫레이" },
              { val: CameraAngle.UNDERWATER, icon: <Users className="w-4 h-4 text-blue-400" />, label: "수중" },
              { val: CameraAngle.NIGHT_VISION, icon: <Eye className="w-4 h-4 text-green-400" />, label: "야간투시" },
              { val: CameraAngle.THERMAL, icon: <Zap className="w-4 h-4 text-orange-400" />, label: "열화상" },
              { val: CameraAngle.MICROSCOPE, icon: <ZoomIn className="w-4 h-4" />, label: "현미경" },
              { val: CameraAngle.CROSS_SECTION, icon: <Layers className="w-4 h-4" />, label: "단면도" },
              { val: CameraAngle.FULL_BODY, icon: <ZoomOut className="w-4 h-4" />, label: "전신/줌아웃" },
            ].map((item) => (
              <button
                key={item.val}
                onClick={() => onChange('cameraAngle', item.val)}
                disabled={isGenerating}
                className={`
                  flex flex-col items-center justify-center p-2 rounded-lg border text-[10px] transition-all gap-1 h-[52px]
                  ${config.cameraAngle === item.val 
                    ? 'bg-banana-500 text-slate-950 border-banana-500 shadow-lg shadow-banana-500/20' 
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                  }
                `}
                title={item.label}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reference Images Upload */}
      <div className="mb-6 space-y-2">
         <div className="flex justify-between items-end">
            <label className="text-xs uppercase tracking-wider text-slate-500 font-bold">
              참조 이미지 (클릭하여 선택/해제)
            </label>
            <span className="text-[10px] text-slate-600 font-mono">
              {config.referenceImages.length} / 20
            </span>
         </div>
         
         <div 
            className={`
              relative border-2 border-dashed rounded-xl p-4 transition-all text-center
              ${isDragging ? 'border-banana-500 bg-banana-500/10' : 'border-slate-800 bg-slate-900/50'}
              ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            onDragOver={!isGenerating ? handleDragOver : undefined}
            onDragLeave={!isGenerating ? handleDragLeave : undefined}
            onDrop={!isGenerating ? handleDrop : undefined}
         >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              multiple 
              accept="image/*" 
              disabled={isGenerating}
            />
            
            {config.referenceImages.length === 0 ? (
              <div 
                onClick={() => !isGenerating && fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center py-4 text-slate-500 gap-2 cursor-pointer hover:text-slate-400"
              >
                <ImagePlus className="w-8 h-8 mb-1 opacity-50" />
                <p className="text-sm font-medium">이미지 업로드 또는 드래그</p>
                <p className="text-xs opacity-60">편집할 이미지를 올려주세요</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {config.referenceImages.map((img, idx) => (
                  <div 
                    key={img.id} 
                    className={`relative group aspect-square rounded-lg overflow-hidden border transition-all cursor-pointer ${img.isEnabled ? 'border-banana-500 ring-2 ring-banana-500/20' : 'border-slate-700 grayscale opacity-60'}`}
                    onClick={() => toggleImage(idx)}
                    title={img.name || `Image ${idx + 1}`}
                  >
                    <img src={img.url} alt={`ref-${idx}`} className="w-full h-full object-cover" />
                    
                    {/* Selection Indicator */}
                    {img.isEnabled && (
                      <div className="absolute top-1 left-1 bg-banana-500 text-slate-950 rounded-full p-0.5 shadow-sm z-10">
                        <Check className="w-2 h-2" />
                      </div>
                    )}
                    
                    {/* Hover Actions */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                         {/* Edit Button */}
                         {onEditReference && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onEditReference(img.id); }}
                              className="bg-slate-800/90 text-white p-1.5 rounded-full hover:bg-banana-500 hover:text-slate-950 transition-colors"
                              title="이미지 편집"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                         )}
                         {/* Remove Button */}
                         <button 
                           onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                           className="bg-slate-800/90 text-white p-1.5 rounded-full hover:bg-red-500 transition-colors"
                           title="삭제"
                         >
                           <X className="w-3 h-3" />
                         </button>
                    </div>
                  </div>
                ))}
                {config.referenceImages.length < 20 && (
                   <div 
                     onClick={() => !isGenerating && fileInputRef.current?.click()}
                     className="flex items-center justify-center aspect-square rounded-lg border border-slate-800 bg-slate-900/50 text-slate-600 hover:bg-slate-800 transition-colors cursor-pointer"
                   >
                     <UploadCloud className="w-5 h-5" />
                   </div>
                )}
              </div>
            )}
         </div>
      </div>

      {/* Prompt Input */}
      <div className="space-y-2 mb-6">
        <label className="text-xs uppercase tracking-wider text-slate-500 font-bold">
          프롬프트
        </label>
        <textarea
          value={config.prompt}
          onChange={(e) => onChange('prompt', e.target.value)}
          disabled={isGenerating}
          placeholder={config.referenceImages.length > 0 
            ? "업로드한 이미지를 어떻게 수정할까요? 예: '배경을 사이버펑크 도시로 바꿔줘', '수채화 스타일로 변환해줘'" 
            : "성운 속에 떠 있는 수정으로 된 미래 도시, 영화 같은 조명, 8k 해상도..."
          }
          className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-600 focus:ring-2 focus:ring-banana-500/50 focus:border-banana-500 outline-none transition-all resize-none disabled:opacity-50"
        />
      </div>

      {/* Action Button */}
      <button
        onClick={onSubmit}
        disabled={isGenerating || (!config.prompt.trim() && config.referenceImages.length === 0)}
        className={`
          w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg
          ${isGenerating || (!config.prompt.trim() && config.referenceImages.length === 0)
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
            : 'bg-gradient-to-r from-banana-500 to-banana-600 text-slate-950 hover:scale-[1.02] hover:shadow-banana-500/25'
          }
        `}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            작업 중...
          </>
        ) : (
          <>
            <Wand2 className="w-6 h-6" />
            {config.referenceImages.length > 0 ? "이미지 수정/생성하기" : "이미지 생성하기"}
          </>
        )}
      </button>
    </div>
  );
};
