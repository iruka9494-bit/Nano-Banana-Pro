
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { GeneratedImage, ImageSize, SubjectPose, CameraAngle, AspectRatio } from '../types';
import { X, Download, Sliders, RotateCw, RotateCcw, Undo, Save, Loader2, Crop, Move, Sun, Palette, ZoomIn, LayoutTemplate, Keyboard, Wand2, Check, Sparkles, Maximize, Minimize, Scan, Users, Brush, Eraser, Trash2, Shuffle, User, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Layers, Eye, Maximize as MaximizeIcon, MoveDiagonal, Expand, Smartphone, Aperture, Box, Navigation, Plane, Minimize2, ArrowDownToLine, Bug, ChevronsUp, Video, Zap, Globe, LayoutGrid, MousePointer2, ZoomOut, Armchair, UserPlus, Activity, ArrowDownLeft, MoveVertical, UserCheck, Wind, Flower, Repeat, PanelLeft, ArrowUpRight, UserMinus, Footprints, MessageSquare, PenTool } from 'lucide-react';
import { upscaleImage, generateImage, outpaintImage, inpaintImage, generateMacroShot, changePoseWithSketch } from '../services/geminiService';

interface ImageModalProps {
  image: GeneratedImage;
  onClose: () => void;
  onUpdateImage: (id: string, updates: Partial<GeneratedImage>) => void;
  onAddReference: (url: string) => void;
  onGenerateCharacterSheet: () => void;
  onRemixImage: (pose: SubjectPose, angle: CameraAngle) => void;
  onPromptEdit: (instruction: string) => void;
  onPoseChange?: (sketchUrl: string, prompt: string) => void;
}

interface Adjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  rotation: number;
  scale: number;
  pan: { x: number; y: number };
}

const INITIAL_ADJUSTMENTS: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  rotation: 0,
  scale: 1,
  pan: { x: 0, y: 0 },
};

type EditTab = 'color' | 'transform' | 'inpaint' | 'remix' | 'macro' | 'promptEdit' | 'poseMatch';

export const ImageModal: React.FC<ImageModalProps> = ({ image, onClose, onUpdateImage, onAddReference, onGenerateCharacterSheet, onRemixImage, onPromptEdit, onPoseChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<EditTab>('color');
  const [adjustments, setAdjustments] = useState<Adjustments>(INITIAL_ADJUSTMENTS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(true);
  const [isFullView, setIsFullView] = useState(false);
  
  // Crop state
  const [cropRatio, setCropRatio] = useState<number>(1);
  const [cropLabel, setCropLabel] = useState<string>("");
  
  // Dragging state (for Pan)
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Inpainting / Magic Brush State
  const [inpaintPrompt, setInpaintPrompt] = useState('');
  const [brushSize, setBrushSize] = useState(30);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEraser, setIsEraser] = useState(false);
  const [maskLines, setMaskLines] = useState<{x: number, y: number, size: number, isEraser: boolean, isStart?: boolean}[]>([]); 

  // Pose Match State
  const [poseLines, setPoseLines] = useState<{x: number, y: number, size: number, color: string, isStart?: boolean}[]>([]);
  const [posePenColor, setPosePenColor] = useState('#22c55e'); // Green default
  const [posePrompt, setPosePrompt] = useState('');
  
  // Outpaint / Generative Fill State
  const [outpaintPrompt, setOutpaintPrompt] = useState('');

  // Prompt Edit State
  const [promptEditInstruction, setPromptEditInstruction] = useState('');

  // Macro State
  const [macroZoom, setMacroZoom] = useState(3);

  // Upscale State
  const [upscaleTarget, setUpscaleTarget] = useState<ImageSize>(ImageSize.RES_4K);

  const imgRef = useRef<HTMLImageElement>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const poseCanvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize crop ratio from image aspect ratio string
  useEffect(() => {
    const getRatioValue = (ratio: string): number => {
      const [w, h] = ratio.split(':').map(Number);
      return w / h;
    };
    setCropRatio(getRatioValue(image.aspectRatio));
    setCropLabel(image.aspectRatio);
  }, [image.aspectRatio]);

  // Helper to generate Data URL from Canvas (for Saves/Outpaints)
  const getEditedDataUrl = useCallback(async (backgroundColor: string = '#000000'): Promise<string> => {
    if (!imgRef.current || !cropContainerRef.current) throw new Error("References missing");

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not get context");

    // We render based on the visual container size (cropContainer)
    // But we want high resolution, so we base it on the image's natural size scaled by zoom
    const naturalWidth = imgRef.current.naturalWidth;
    const naturalHeight = imgRef.current.naturalHeight;
    
    // The output canvas dimension should match the selected Aspect Ratio
    // We'll set a fixed width (e.g. original width) and calculate height
    const outputWidth = naturalWidth; 
    const outputHeight = outputWidth / cropRatio;

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    // Fill Background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate transformations
    // Center of the canvas
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Apply transforms
    ctx.translate(cx, cy);
    
    // The adjustments.pan values are pixels relative to the screen view.
    // We need to map them to the canvas resolution.
    // Scale factor between screen render and actual canvas
    const screenWidth = cropContainerRef.current.clientWidth;
    const resolutionScale = outputWidth / screenWidth;

    ctx.translate(adjustments.pan.x * resolutionScale, adjustments.pan.y * resolutionScale);
    ctx.rotate((adjustments.rotation * Math.PI) / 180);
    ctx.scale(adjustments.scale, adjustments.scale);
    
    // Filter effects
    ctx.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`;

    // Draw Image centered
    ctx.drawImage(imgRef.current, -naturalWidth / 2, -naturalHeight / 2);

    return canvas.toDataURL('image/png');
  }, [adjustments, cropRatio]);

  // Helper to generate Mask Data URL
  const getMaskDataUrl = useCallback((): string | null => {
     if (!maskCanvasRef.current) return null;
     return maskCanvasRef.current.toDataURL('image/png');
  }, []);

  // Helper to generate Pose Sketch Data URL
  const getPoseDataUrl = useCallback((): string | null => {
     if (!poseCanvasRef.current) return null;
     return poseCanvasRef.current.toDataURL('image/png');
  }, []);

  // Handler: Download Edited Image
  const downloadEditedImage = async () => {
    try {
      const dataUrl = await getEditedDataUrl('#000000');
      const link = document.createElement('a');
      link.download = `edited-${image.id}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error("Failed to generate download", e);
    }
  };

  // Handler: Apply (Update in Gallery)
  const applyEdit = async () => {
    try {
      setIsProcessing(true);
      const dataUrl = await getEditedDataUrl('#000000');
      
      // Calculate new aspect ratio string if it changed
      const updates: Partial<GeneratedImage> = {
        url: dataUrl,
        aspectRatio: cropLabel as AspectRatio 
      };
      
      onUpdateImage(image.id, updates);
      setIsEditing(false);
      setAdjustments(INITIAL_ADJUSTMENTS);
    } catch (e) {
      console.error("Failed to apply edit", e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler: Upscale
  const handleUpscale = async () => {
    setIsUpscaling(true);
    try {
      const upscaledUrl = await upscaleImage(image.prompt, image.aspectRatio, image.url, upscaleTarget);
      onUpdateImage(image.id, { url: upscaledUrl, size: upscaleTarget });
    } catch (e) {
      console.error(e);
      alert("Upscale failed. Please try again.");
    } finally {
      setIsUpscaling(false);
    }
  };

  // Handler: Outpaint / Generative Fill
  const handleOutpaint = async () => {
    if (!outpaintPrompt) {
      setOutpaintPrompt("Fill the empty area seamlessly");
    }
    
    setIsProcessing(true);
    try {
      const canvasUrl = await getEditedDataUrl('#000000'); 
      
      const filledUrl = await outpaintImage(
        canvasUrl, 
        image.prompt, 
        cropLabel as AspectRatio || image.aspectRatio,
        outpaintPrompt
      );
      
      onUpdateImage(image.id, { url: filledUrl });
      setAdjustments(INITIAL_ADJUSTMENTS);
      setOutpaintPrompt('');
    } catch (e) {
      console.error("Outpaint failed", e);
      alert("빈 공간 채우기에 실패했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler: Inpaint / Magic Edit
  const handleInpaint = async () => {
    if (!inpaintPrompt) {
      alert("수정 내용을 입력해주세요 (예: '눈동자를 파란색으로 변경')");
      return;
    }
    
    setIsProcessing(true);
    try {
      const maskUrl = getMaskDataUrl();
      if (!maskUrl) throw new Error("No mask");

      const resultUrl = await inpaintImage(
        image.url,
        maskUrl,
        inpaintPrompt,
        image.aspectRatio
      );

      onUpdateImage(image.id, { url: resultUrl });
      setInpaintPrompt('');
      setMaskLines([]); 
    } catch (e) {
      console.error("Inpaint failed", e);
      alert("부분 수정에 실패했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler: Pose Change (Sketch)
  const handlePoseChange = async () => {
    if (poseLines.length === 0) {
      alert("변경할 포즈(뼈대)를 그려주세요.");
      return;
    }
    if (onPoseChange) {
       const sketchUrl = getPoseDataUrl();
       if (sketchUrl) {
         onPoseChange(sketchUrl, posePrompt);
       }
    }
  };

  // Handler: Prompt Edit
  const handlePromptEditSubmit = () => {
    if (!promptEditInstruction.trim()) {
        alert("수정할 내용을 입력해주세요.");
        return;
    }
    onPromptEdit(promptEditInstruction);
  };

  // Handler: Macro Click (Zoom to Point)
  const handleMacroClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTab !== 'macro' || !cropContainerRef.current) return;
    
    const rect = cropContainerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    // Click position relative to container center (Visual Coordinates)
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    
    const clickOffsetX = clientX - cx;
    const clickOffsetY = clientY - cy;

    const currentPan = adjustments.pan;
    const currentScale = adjustments.scale;

    // Calculate new Pan to center the clicked point at the new scale
    // Formula derived from: 0 = PointOrig * newScale + newPan
    // where PointOrig = (ClickOffset - oldPan) / oldScale
    
    const newScale = macroZoom; 
    
    const newPanX = -((clickOffsetX - currentPan.x) / currentScale) * newScale;
    const newPanY = -((clickOffsetY - currentPan.y) / currentScale) * newScale;

    setAdjustments({
        ...adjustments,
        scale: newScale,
        pan: { x: newPanX, y: newPanY }
    });
  };

  const handleMacroEnhance = async () => {
    setIsProcessing(true);
    try {
       // Get current view as image
       const cropUrl = await getEditedDataUrl('#000000');
       // Send to AI for "Upscale Crop"
       const enhancedUrl = await generateMacroShot(cropUrl, image.prompt, cropLabel as AspectRatio || image.aspectRatio);
       
       onUpdateImage(image.id, { 
         url: enhancedUrl, 
         prompt: `Upscaled Crop: ${image.prompt}`,
         size: ImageSize.RES_4K,
         // Update aspect ratio to current crop ratio
         aspectRatio: cropLabel as AspectRatio || image.aspectRatio 
       });
       
       // Reset View
       setAdjustments(INITIAL_ADJUSTMENTS);
    } catch (e) {
      console.error("Macro enhance failed", e);
      alert("고화질 변환에 실패했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (isEditing) {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) applyEdit();
        if (e.key === 'ArrowLeft') setAdjustments(p => ({ ...p, pan: { ...p.pan, x: p.pan.x - 10 } }));
        if (e.key === 'ArrowRight') setAdjustments(p => ({ ...p, pan: { ...p.pan, x: p.pan.x + 10 } }));
        if (e.key === 'ArrowUp') setAdjustments(p => ({ ...p, pan: { ...p.pan, y: p.pan.y - 10 } }));
        if (e.key === 'ArrowDown') setAdjustments(p => ({ ...p, pan: { ...p.pan, y: p.pan.y + 10 } }));
        if (e.key === '+' || e.key === '=') setAdjustments(p => ({ ...p, scale: Math.min(10, p.scale + 0.1) }));
        if (e.key === '-') setAdjustments(p => ({ ...p, scale: Math.max(0.1, p.scale - 0.1) }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isEditing, applyEdit]);

  // Dragging Logic (Pan)
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isEditing) return;
    if (activeTab === 'inpaint' || activeTab === 'macro' || activeTab === 'poseMatch') return; 

    setIsDragging(true);
    const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const cy = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: cx - adjustments.pan.x, y: cy - adjustments.pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !isEditing) return;
    if (activeTab === 'inpaint' || activeTab === 'macro' || activeTab === 'poseMatch') return;

    const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const cy = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setAdjustments(prev => ({
      ...prev,
      pan: { x: cx - dragStart.x, y: cy - dragStart.y }
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Mask Drawing Logic
  useEffect(() => {
    if (activeTab !== 'inpaint' || !maskCanvasRef.current || !cropContainerRef.current) return;
    const canvas = maskCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = cropContainerRef.current.clientWidth;
    canvas.height = cropContainerRef.current.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (maskLines.length > 0) {
        ctx.beginPath();
        for (let i = 0; i < maskLines.length; i++) {
            const point = maskLines[i];
            if (point.isStart) {
                ctx.beginPath();
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
                ctx.strokeStyle = point.isEraser ? 'rgba(0,0,0,1)' : 'rgba(255, 255, 255, 0.7)';
                ctx.globalCompositeOperation = point.isEraser ? 'destination-out' : 'source-over';
                ctx.lineWidth = point.size;
                ctx.stroke();
                ctx.globalCompositeOperation = 'source-over'; 
            }
        }
    }
  }, [maskLines, activeTab, cropContainerRef.current?.clientWidth, cropContainerRef.current?.clientHeight]);

  const handleMaskStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTab !== 'inpaint') return;
    setIsDrawing(true);
    const rect = maskCanvasRef.current?.getBoundingClientRect();
    if(!rect) return;
    const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const cy = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = cx - rect.left;
    const y = cy - rect.top;
    setMaskLines(prev => [...prev, { x, y, size: brushSize, isEraser, isStart: true }]);
  };

  const handleMaskMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || activeTab !== 'inpaint') return;
    const rect = maskCanvasRef.current?.getBoundingClientRect();
    if(!rect) return;
    const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const cy = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = cx - rect.left;
    const y = cy - rect.top;
    setMaskLines(prev => [...prev, { x, y, size: brushSize, isEraser }]);
  };

  // Pose Sketch Drawing Logic
  useEffect(() => {
    if (activeTab !== 'poseMatch' || !poseCanvasRef.current || !cropContainerRef.current) return;
    const canvas = poseCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = cropContainerRef.current.clientWidth;
    canvas.height = cropContainerRef.current.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (poseLines.length > 0) {
        for (let i = 0; i < poseLines.length; i++) {
            const point = poseLines[i];
            if (point.isStart) {
                ctx.beginPath();
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
                ctx.strokeStyle = point.color;
                ctx.lineWidth = point.size;
                ctx.stroke();
            }
        }
    }
  }, [poseLines, activeTab, cropContainerRef.current?.clientWidth, cropContainerRef.current?.clientHeight]);

  const handlePoseStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTab !== 'poseMatch') return;
    setIsDrawing(true);
    const rect = poseCanvasRef.current?.getBoundingClientRect();
    if(!rect) return;
    const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const cy = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = cx - rect.left;
    const y = cy - rect.top;
    setPoseLines(prev => [...prev, { x, y, size: brushSize, color: posePenColor, isStart: true }]);
  };

  const handlePoseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || activeTab !== 'poseMatch') return;
    const rect = poseCanvasRef.current?.getBoundingClientRect();
    if(!rect) return;
    const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const cy = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = cx - rect.left;
    const y = cy - rect.top;
    setPoseLines(prev => [...prev, { x, y, size: brushSize, color: posePenColor }]);
  };

  const handleDrawingEnd = () => {
    setIsDrawing(false);
  };

  const handlePresetClick = (ratioStr: string) => {
    const [w, h] = ratioStr.split(':').map(Number);
    const ratio = w / h;
    setCropRatio(ratio);
    setCropLabel(ratioStr);
    
    if (imgRef.current && cropContainerRef.current) {
      setAdjustments(prev => ({ ...prev, scale: 1, pan: { x: 0, y: 0 } }));
    }
  };

  const handleFitSelection = () => {
     setAdjustments(p => ({...p, scale: 1, pan: {x:0, y:0}}));
  };

  const toggleEraser = () => setIsEraser(!isEraser);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-hidden">
      <div className="w-full max-w-6xl h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 z-20">
          <div className="flex items-center gap-4">
             <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
               <X className="w-6 h-6 text-slate-400 hover:text-white" />
             </button>
             
             {!isEditing && (
               <div className="flex gap-2">
                 <button 
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                 >
                   <Sliders className="w-4 h-4" />
                   <span className="hidden sm:inline">편집 (Edit)</span>
                 </button>
                 <button 
                   onClick={onGenerateCharacterSheet}
                   className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-banana-400 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors border border-slate-700 hover:border-banana-500/50"
                   title="캐릭터 시트 생성"
                 >
                   <Users className="w-4 h-4" />
                   <span className="hidden sm:inline">Character Sheet</span>
                 </button>
                 <button 
                   onClick={() => onAddReference(image.url)}
                   className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                   title="참조 이미지로 추가 (AI Edit)"
                 >
                   <Wand2 className="w-4 h-4" />
                 </button>
               </div>
             )}

             {isEditing && (
               <div className="flex gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 overflow-x-auto">
                  <button 
                    onClick={() => setActiveTab('color')}
                    className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${activeTab === 'color' ? 'bg-banana-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Palette className="w-3 h-3" /> 색상
                  </button>
                  <button 
                    onClick={() => setActiveTab('transform')}
                    className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${activeTab === 'transform' ? 'bg-banana-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Crop className="w-3 h-3" /> 변형
                  </button>
                  <button 
                    onClick={() => setActiveTab('poseMatch')}
                    className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${activeTab === 'poseMatch' ? 'bg-banana-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                  >
                    <PenTool className="w-3 h-3" /> 포즈 매치
                  </button>
                  <button 
                    onClick={() => setActiveTab('inpaint')}
                    className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${activeTab === 'inpaint' ? 'bg-banana-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Brush className="w-3 h-3" /> 부분 수정
                  </button>
                  <button 
                    onClick={() => setActiveTab('macro')}
                    className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${activeTab === 'macro' ? 'bg-banana-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                  >
                    <ZoomIn className="w-3 h-3" /> 매크로
                  </button>
                  <button 
                    onClick={() => setActiveTab('remix')}
                    className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${activeTab === 'remix' ? 'bg-banana-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Shuffle className="w-3 h-3" /> Remix
                  </button>
                  <button 
                    onClick={() => setActiveTab('promptEdit')}
                    className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${activeTab === 'promptEdit' ? 'bg-banana-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                  >
                    <MessageSquare className="w-3 h-3" /> 텍스트 수정
                  </button>
               </div>
             )}
          </div>

          <div className="flex gap-2">
             {!isEditing && (
               <>
                 <button 
                   onClick={() => setIsFullView(!isFullView)}
                   className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors hidden sm:block"
                   title={isFullView ? "화면에 맞추기" : "1:1 원본 크기"}
                 >
                   {isFullView ? <Minimize className="w-5 h-5" /> : <MaximizeIcon className="w-5 h-5" />}
                 </button>
                 
                 <div className="flex rounded-lg shadow-lg shadow-blue-500/20 overflow-hidden h-9">
                    <select
                        value={upscaleTarget}
                        onChange={(e) => setUpscaleTarget(e.target.value as ImageSize)}
                        disabled={isUpscaling}
                        className="bg-blue-700 text-white text-xs px-2 outline-none border-r border-blue-600 hover:bg-blue-600 transition-colors cursor-pointer appearance-none text-center font-bold"
                        style={{textAlignLast: 'center'}}
                    >
                        <option value={ImageSize.RES_1K} className="bg-slate-900">1K</option>
                        <option value={ImageSize.RES_2K} className="bg-slate-900">2K</option>
                        <option value={ImageSize.RES_4K} className="bg-slate-900">4K</option>
                    </select>
                    <button 
                       onClick={handleUpscale}
                       disabled={isUpscaling}
                       className="px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold flex items-center gap-2 transition-all disabled:opacity-50 text-xs sm:text-sm"
                    >
                       {isUpscaling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                       <span className="hidden sm:inline">Upscale</span>
                    </button>
                 </div>
               </>
             )}

             {isEditing ? (
               <>
                 <button 
                    onClick={applyEdit}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-banana-500 hover:bg-banana-400 text-slate-950 font-bold rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span className="hidden sm:inline">Apply (적용)</span>
                  </button>
                  <button 
                    onClick={downloadEditedImage}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                    title="편집본 다운로드"
                  >
                    <Download className="w-5 h-5" />
                  </button>
               </>
             ) : (
                <a 
                  href={image.url} 
                  download={`image-${image.id}.png`}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">다운로드</span>
                </a>
             )}
          </div>
        </div>

        {/* Main Workspace */}
        <div className="flex-1 flex relative overflow-hidden">
           
           {/* Image Preview Area */}
           <div 
             className={`flex-1 bg-slate-950 relative flex items-center justify-center overflow-auto ${isEditing && (activeTab === 'macro' || activeTab === 'poseMatch') ? 'cursor-crosshair' : isEditing && activeTab !== 'inpaint' ? 'cursor-move' : ''}`}
             onMouseDown={
               isEditing && activeTab === 'inpaint' ? handleMaskStart :
               isEditing && activeTab === 'poseMatch' ? handlePoseStart :
               isEditing && activeTab !== 'macro' ? handleMouseDown : undefined
             }
             onClick={isEditing && activeTab === 'macro' ? handleMacroClick : undefined}
             onTouchStart={isEditing && activeTab === 'inpaint' ? handleMaskStart : isEditing && activeTab === 'poseMatch' ? handlePoseStart : isEditing && activeTab !== 'macro' ? handleMouseDown : undefined}
             onMouseMove={isEditing && activeTab === 'inpaint' ? handleMaskMove : isEditing && activeTab === 'poseMatch' ? handlePoseMove : isEditing && activeTab !== 'macro' ? handleMouseMove : undefined}
             onTouchMove={isEditing && activeTab === 'inpaint' ? handleMaskMove : isEditing && activeTab === 'poseMatch' ? handlePoseMove : isEditing && activeTab !== 'macro' ? handleMouseMove : undefined}
             onMouseUp={isEditing && (activeTab === 'inpaint' || activeTab === 'poseMatch') ? handleDrawingEnd : isEditing && activeTab !== 'macro' ? handleMouseUp : undefined}
             onMouseLeave={isEditing && (activeTab === 'inpaint' || activeTab === 'poseMatch') ? handleDrawingEnd : isEditing && activeTab !== 'macro' ? handleMouseUp : undefined}
             onTouchEnd={isEditing && (activeTab === 'inpaint' || activeTab === 'poseMatch') ? handleDrawingEnd : isEditing && activeTab !== 'macro' ? handleMouseUp : undefined}
           > 
              {/* Grid Background */}
              <div className="absolute inset-0 pointer-events-none" style={{ 
                backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', 
                backgroundSize: '20px 20px',
                opacity: 0.2
              }}></div>
              
              {/* Crop/View Container */}
              <div 
                ref={cropContainerRef}
                className={`relative shadow-2xl transition-all duration-100 ${isFullView && !isEditing ? '' : 'max-w-full max-h-[75vh]'}`}
                style={{
                   aspectRatio: `${cropRatio}`,
                   width: isFullView && !isEditing ? 'auto' : undefined,
                   height: isFullView && !isEditing ? 'auto' : undefined,
                   overflow: 'hidden',
                   border: isEditing ? '2px solid #eab308' : '1px solid #334155',
                }}
              >
                 <img 
                   ref={imgRef}
                   src={image.url} 
                   alt="Editing" 
                   className="max-w-none origin-center pointer-events-none select-none"
                   style={{
                     transform: `translate(${adjustments.pan.x}px, ${adjustments.pan.y}px) rotate(${adjustments.rotation}deg) scale(${adjustments.scale})`,
                     filter: `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`,
                     width: isFullView && !isEditing ? 'auto' : '100%',
                     height: isFullView && !isEditing ? 'auto' : '100%',
                     objectFit: 'contain',
                   }}
                   draggable={false}
                 />

                 {/* Magic Brush Mask Canvas Overlay */}
                 {isEditing && activeTab === 'inpaint' && (
                    <canvas 
                      ref={maskCanvasRef}
                      className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
                      style={{ pointerEvents: 'auto' }}
                    />
                 )}
                 
                 {/* Pose Match Sketch Overlay */}
                 {isEditing && activeTab === 'poseMatch' && (
                    <canvas 
                      ref={poseCanvasRef}
                      className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
                      style={{ pointerEvents: 'auto' }}
                    />
                 )}

                 {/* Composition Overlay (Rule of Thirds) - Transform Mode */}
                 {isEditing && activeTab === 'transform' && (
                   <div className="absolute inset-0 pointer-events-none">
                      <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                        <div className="border-r border-b border-white/20"></div>
                        <div className="border-r border-b border-white/20"></div>
                        <div className="border-b border-white/20"></div>
                        <div className="border-r border-b border-white/20"></div>
                        <div className="border-r border-b border-white/20"></div>
                        <div className="border-b border-white/20"></div>
                        <div className="border-r border-white/20"></div>
                        <div className="border-r border-white/20"></div>
                        <div></div>
                      </div>
                      <div className="absolute top-1/2 left-1/2 w-4 h-4 border-l border-t border-white/50 -translate-x-2 -translate-y-2"></div>
                      <div className="absolute top-1/2 left-1/2 w-4 h-4 border-r border-b border-white/50 -translate-x-2 -translate-y-2"></div>
                      <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 rounded text-[10px] text-white">
                        {cropLabel}
                      </div>
                   </div>
                 )}
              </div>
              
              {/* Shortcuts Tooltip */}
              {isEditing && showShortcuts && (
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/10 text-[10px] text-slate-300 z-30">
                   <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-white flex items-center gap-1"><Keyboard className="w-3 h-3"/> Shortcuts</span>
                      <button onClick={() => setShowShortcuts(false)}><X className="w-3 h-3"/></button>
                   </div>
                   <ul className="space-y-1">
                     <li><span className="text-banana-400">Drag</span> : Move Image</li>
                     <li><span className="text-banana-400">+/-</span> : Zoom</li>
                     <li><span className="text-banana-400">Arrows</span> : Pan</li>
                     <li><span className="text-banana-400">Cmd+Enter</span> : Apply</li>
                   </ul>
                </div>
              )}
           </div>
           
           {/* Right Sidebar Controls (Only in Edit Mode) */}
           {isEditing && (
             <div className="w-80 bg-slate-950 border-l border-slate-800 flex flex-col overflow-y-auto z-20">
                {/* Tool specific controls */}
                
                {/* COLOR TAB */}
                {activeTab === 'color' && (
                  <div className="p-6 space-y-8">
                     <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-4">색상 조정</h3>
                     
                     <div className="space-y-4">
                       <div className="space-y-2">
                         <div className="flex justify-between text-xs text-slate-400">
                           <span className="flex items-center gap-1"><Sun className="w-3 h-3" /> 밝기</span>
                           <span>{adjustments.brightness}%</span>
                         </div>
                         <input 
                           type="range" min="0" max="200" 
                           value={adjustments.brightness}
                           onChange={(e) => setAdjustments({...adjustments, brightness: Number(e.target.value)})}
                           className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-banana-500"
                         />
                       </div>

                       <div className="space-y-2">
                         <div className="flex justify-between text-xs text-slate-400">
                           <span className="flex items-center gap-1"><Scan className="w-3 h-3" /> 대비</span>
                           <span>{adjustments.contrast}%</span>
                         </div>
                         <input 
                           type="range" min="0" max="200" 
                           value={adjustments.contrast}
                           onChange={(e) => setAdjustments({...adjustments, contrast: Number(e.target.value)})}
                           className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-banana-500"
                         />
                       </div>

                       <div className="space-y-2">
                         <div className="flex justify-between text-xs text-slate-400">
                           <span className="flex items-center gap-1"><Palette className="w-3 h-3" /> 채도</span>
                           <span>{adjustments.saturation}%</span>
                         </div>
                         <input 
                           type="range" min="0" max="200" 
                           value={adjustments.saturation}
                           onChange={(e) => setAdjustments({...adjustments, saturation: Number(e.target.value)})}
                           className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-banana-500"
                         />
                       </div>
                     </div>
                     
                     <button 
                       onClick={() => setAdjustments(INITIAL_ADJUSTMENTS)}
                       className="w-full py-2 border border-slate-700 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                     >
                       <Undo className="w-3 h-3" /> 초기화
                     </button>
                  </div>
                )}

                {/* TRANSFORM TAB */}
                {activeTab === 'transform' && (
                  <div className="p-6 space-y-8">
                    <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-4">변형 및 자르기</h3>
                    
                    {/* Aspect Ratios */}
                    <div className="space-y-2">
                       <span className="text-xs text-slate-400">화면 비율 (Crop)</span>
                       <div className="grid grid-cols-3 gap-2">
                          {['1:1', '4:3', '16:9', '3:4', '9:16'].map(ratio => (
                             <button 
                               key={ratio}
                               onClick={() => handlePresetClick(ratio)}
                               className={`p-2 rounded text-[10px] border transition-colors ${cropLabel === ratio ? 'bg-banana-500 text-slate-950 border-banana-500' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                             >
                               {ratio}
                             </button>
                          ))}
                          <button 
                             onClick={() => handlePresetClick(image.aspectRatio)}
                             className="p-2 rounded text-[10px] border border-slate-700 bg-slate-900 text-slate-400 hover:text-white"
                          >
                            Original
                          </button>
                       </div>
                    </div>

                    {/* Zoom & Rotate */}
                    <div className="space-y-4 pt-4 border-t border-slate-800">
                       <div className="space-y-2">
                         <div className="flex justify-between text-xs text-slate-400">
                           <span>확대/축소 (Zoom)</span>
                           <span>{adjustments.scale.toFixed(1)}x</span>
                         </div>
                         <input 
                           type="range" min="0.1" max="10" step="0.1"
                           value={adjustments.scale}
                           onChange={(e) => setAdjustments({...adjustments, scale: Number(e.target.value)})}
                           className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-banana-500"
                         />
                       </div>
                       
                       <div className="flex gap-2">
                         <button 
                           onClick={() => setAdjustments(p => ({...p, rotation: p.rotation - 90}))}
                           className="flex-1 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 hover:text-white text-xs flex items-center justify-center gap-1"
                         >
                           <RotateCcw className="w-3 h-3" /> -90°
                         </button>
                         <button 
                           onClick={() => setAdjustments(p => ({...p, rotation: p.rotation + 90}))}
                           className="flex-1 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 hover:text-white text-xs flex items-center justify-center gap-1"
                         >
                           <RotateCw className="w-3 h-3" /> +90°
                         </button>
                       </div>
                       
                       <button 
                          onClick={handleFitSelection}
                          className="w-full py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-lg text-xs flex items-center justify-center gap-2"
                       >
                         <Expand className="w-3 h-3" /> 화면에 꽉 채우기 (Fit)
                       </button>
                       
                       <button 
                         onClick={downloadEditedImage}
                         className="w-full py-2 bg-banana-500/10 text-banana-400 border border-banana-500/30 rounded-lg text-xs font-bold hover:bg-banana-500/20 transition-colors flex items-center justify-center gap-2"
                         title="현재 보이는 영역만 저장"
                       >
                         <Crop className="w-3 h-3" /> 현재 영역 저장 (Save Crop)
                       </button>
                    </div>

                    {/* Generative Fill */}
                    <div className="pt-4 border-t border-slate-800 space-y-3">
                       <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1">
                         <Sparkles className="w-3 h-3 text-purple-400" /> Generative Fill (빈 공간 채우기)
                       </h4>
                       <p className="text-[10px] text-slate-500">
                         이미지를 축소하거나 이동하여 생긴 여백을 AI가 자동으로 채워줍니다.
                       </p>
                       <textarea 
                         value={outpaintPrompt}
                         onChange={(e) => setOutpaintPrompt(e.target.value)}
                         placeholder="예: '숲 배경으로 확장해줘' (비워두면 자동)"
                         className="w-full h-16 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-600 resize-none focus:border-purple-500 outline-none"
                       />
                       <button 
                         onClick={handleOutpaint}
                         disabled={isProcessing}
                         className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                       >
                         {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <LayoutTemplate className="w-3 h-3" />}
                         채우기 실행
                       </button>
                    </div>
                  </div>
                )}

                {/* POSE MATCH TAB */}
                {activeTab === 'poseMatch' && (
                    <div className="p-6 space-y-6">
                        <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-4">Pose Match (스케치 포즈)</h3>
                        
                        <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 space-y-2">
                           <p className="text-xs text-slate-400 flex items-center gap-2">
                             <PenTool className="w-4 h-4 text-banana-500" />
                             인물 위에 포즈 그리기
                           </p>
                           <p className="text-[10px] text-slate-500 leading-relaxed">
                              변경하려는 인물 위에 원하는 포즈의 뼈대(졸라맨)를 그려주세요. 인물이 여러 명일 경우, 포즈를 변경할 인물 위에만 그리면 됩니다.
                           </p>
                        </div>

                        <div className="space-y-4">
                           <div className="space-y-2">
                             <label className="text-xs text-slate-400">펜 색상</label>
                             <div className="flex gap-2">
                               {['#22c55e', '#ef4444', '#3b82f6', '#eab308', '#ffffff'].map(color => (
                                 <button
                                   key={color}
                                   onClick={() => setPosePenColor(color)}
                                   className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${posePenColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                                   style={{ backgroundColor: color }}
                                 />
                               ))}
                             </div>
                           </div>

                           <div className="space-y-2">
                             <div className="flex justify-between text-xs text-slate-400">
                               <span>펜 굵기</span>
                               <span>{brushSize}px</span>
                             </div>
                             <input 
                               type="range" min="5" max="50" 
                               value={brushSize}
                               onChange={(e) => setBrushSize(Number(e.target.value))}
                               className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-banana-500"
                             />
                           </div>
                           
                           <button 
                             onClick={() => setPoseLines([])}
                             className="w-full py-2 text-xs text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                           >
                              <Trash2 className="w-3 h-3" /> 스케치 전체 삭제
                           </button>
                        </div>

                        <div className="pt-4 border-t border-slate-800 space-y-3">
                           <label className="text-xs font-bold text-slate-400">포즈 설명 (선택사항)</label>
                           <textarea 
                             value={posePrompt}
                             onChange={(e) => setPosePrompt(e.target.value)}
                             placeholder="예: '한 다리로 서 있는 포즈', '의자에 앉아 있는 모습'..."
                             className="w-full h-20 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-600 resize-none focus:border-banana-500 outline-none"
                           />
                           <button 
                             onClick={handlePoseChange}
                             disabled={isProcessing}
                             className="w-full py-3 bg-gradient-to-r from-banana-500 to-banana-600 hover:from-banana-400 hover:to-banana-500 text-slate-950 font-bold rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                           >
                              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                              포즈 변경 실행
                           </button>
                        </div>
                    </div>
                )}

                {/* MACRO TAB */}
                {activeTab === 'macro' && (
                   <div className="p-6 space-y-6">
                      <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-4">매크로 (Upscale Crop)</h3>
                      
                      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 space-y-2">
                         <p className="text-xs text-slate-400 flex items-center gap-2">
                           <MousePointer2 className="w-4 h-4 text-banana-500" />
                           이미지를 클릭하여 확대/초점
                         </p>
                         <p className="text-[10px] text-slate-500 leading-relaxed">
                            이미지의 특정 부위를 클릭하면 해당 지점을 화면 중앙으로 오며 설정한 배율로 확대됩니다.
                         </p>
                      </div>

                      <div className="space-y-4 border-t border-slate-800 pt-4">
                         <div className="space-y-2">
                            <div className="flex justify-between text-xs text-slate-400">
                               <span>클릭 확대 배율 (Zoom Power)</span>
                               <span className="text-banana-400 font-bold">{macroZoom}x</span>
                            </div>
                            <input 
                              type="range" min="1.5" max="10" step="0.5"
                              value={macroZoom}
                              onChange={(e) => setMacroZoom(Number(e.target.value))}
                              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-banana-500"
                            />
                            <div className="flex justify-between text-[9px] text-slate-600 px-1">
                               <span>1.5x</span>
                               <span>5x</span>
                               <span>10x</span>
                            </div>
                         </div>

                         <div className="bg-slate-900 rounded p-3 border border-slate-800 flex justify-between items-center">
                            <span className="text-xs text-slate-500">현재 배율 상태</span>
                            <span className="text-xs font-mono text-white">{adjustments.scale.toFixed(2)}x</span>
                         </div>

                         <button 
                           onClick={handleFitSelection}
                           className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center justify-center gap-2 border border-slate-700"
                         >
                           <Minimize2 className="w-3 h-3" /> 화면에 맞추기 (Reset View)
                         </button>
                      </div>

                      <div className="pt-4 border-t border-slate-800 space-y-3">
                         <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1">
                           <Sparkles className="w-3 h-3 text-banana-400" /> AI Enhance (Upscale)
                         </h4>
                         <p className="text-[10px] text-slate-500">
                           현재 보고 있는 확대된 구도를 유지하면서 해상도를 4K로 높입니다.
                         </p>
                         <button 
                           onClick={handleMacroEnhance}
                           disabled={isProcessing}
                           className="w-full py-3 bg-gradient-to-r from-banana-500 to-banana-600 hover:from-banana-400 hover:to-banana-500 text-slate-950 font-bold rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                         >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
                            고화질 변환 (Upscale Crop)
                         </button>
                      </div>
                   </div>
                )}

                {/* MAGIC EDIT (INPAINT) TAB */}
                {activeTab === 'inpaint' && (
                   <div className="p-6 space-y-6">
                     <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-4">Magic Edit (부분 수정)</h3>
                     
                     <div className="space-y-4">
                        <div className="flex gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
                           <button 
                             onClick={() => setIsEraser(false)}
                             className={`flex-1 py-2 rounded text-xs flex items-center justify-center gap-2 ${!isEraser ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
                           >
                             <Brush className="w-3 h-3" /> 브러시
                           </button>
                           <button 
                             onClick={() => setIsEraser(true)}
                             className={`flex-1 py-2 rounded text-xs flex items-center justify-center gap-2 ${isEraser ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
                           >
                             <Eraser className="w-3 h-3" /> 지우개
                           </button>
                        </div>

                        <div className="space-y-2">
                           <div className="flex justify-between text-xs text-slate-400">
                             <span>브러시 크기</span>
                             <span>{brushSize}px</span>
                           </div>
                           <input 
                             type="range" min="5" max="100" 
                             value={brushSize}
                             onChange={(e) => setBrushSize(Number(e.target.value))}
                             className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-500"
                           />
                        </div>

                        <button 
                          onClick={() => setMaskLines([])}
                          className="w-full py-2 text-xs text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                           <Trash2 className="w-3 h-3" /> 마스크 전체 삭제
                        </button>
                     </div>

                     <div className="pt-4 border-t border-slate-800 space-y-3">
                        <label className="text-xs font-bold text-slate-400">프롬프트 (수정 내용)</label>
                        <textarea 
                          value={inpaintPrompt}
                          onChange={(e) => setInpaintPrompt(e.target.value)}
                          placeholder="예: 빨간색 안경을 씌워줘, 구름을 없애줘..."
                          className="w-full h-20 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-600 resize-none focus:border-banana-500 outline-none"
                        />
                        <button 
                          onClick={handleInpaint}
                          disabled={isProcessing || !inpaintPrompt}
                          className="w-full py-3 bg-gradient-to-r from-banana-500 to-banana-600 hover:from-banana-400 hover:to-banana-500 text-slate-950 font-bold rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                           {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                           생성하기 (Magic Edit)
                        </button>
                     </div>
                   </div>
                )}

                {/* PROMPT EDIT TAB */}
                {activeTab === 'promptEdit' && (
                    <div className="p-6 space-y-6">
                        <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-4">AI 텍스트 수정</h3>
                        
                        <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 space-y-2">
                            <p className="text-xs text-slate-400 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-banana-500" />
                            텍스트로 지시하여 이미지 변형
                            </p>
                            <p className="text-[10px] text-slate-500 leading-relaxed">
                            현재 이미지를 기반으로 구도, 포즈, 배경, 스타일 등을 텍스트 지시로 자유롭게 수정합니다.
                            </p>
                        </div>

                        <div className="space-y-3 pt-2">
                            <label className="text-xs font-bold text-slate-400">수정 지시사항 (Instruction)</label>
                            <textarea 
                                value={promptEditInstruction}
                                onChange={(e) => setPromptEditInstruction(e.target.value)}
                                placeholder="예: '오른손을 머리 위로 올려줘', '배경을 해변으로 바꿔줘', '좀 더 웃는 표정으로 변경해줘'"
                                className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-600 resize-none focus:border-banana-500 outline-none"
                            />
                            <button 
                                onClick={handlePromptEditSubmit}
                                disabled={isProcessing || !promptEditInstruction.trim()}
                                className="w-full py-3 bg-gradient-to-r from-banana-500 to-banana-600 hover:from-banana-400 hover:to-banana-500 text-slate-950 font-bold rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                수정 생성하기
                            </button>
                        </div>
                    </div>
                )}

                {/* REMIX TAB */}
                {activeTab === 'remix' && (
                   <div className="p-6 space-y-8">
                      <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-4">AI Remix (구도 변경)</h3>
                      
                      {/* Model Poses */}
                      <div className="space-y-3">
                         <span className="text-xs text-slate-400 block">모델 포즈 (Model Poses)</span>
                         <div className="grid grid-cols-3 gap-2">
                            {[
                              { v: SubjectPose.POSE_SITTING, l: '앉기', i: <Armchair className="w-4 h-4"/> },
                              { v: SubjectPose.POSE_KNEELING, l: '무릎꿇기', i: <User className="w-4 h-4"/> },
                              { v: SubjectPose.POSE_RECLINING, l: '눕기/기대기', i: <User className="w-4 h-4 -rotate-90"/> },
                              { v: SubjectPose.POSE_HANDS_IN_HAIR, l: '머리넘기기', i: <UserPlus className="w-4 h-4"/> },
                              { v: SubjectPose.POSE_LOOKING_BACK, l: '뒤돌아보기', i: <User className="w-4 h-4"/> },
                              { v: SubjectPose.POSE_DYNAMIC, l: 'S라인/역동', i: <Activity className="w-4 h-4"/> },
                              { v: SubjectPose.POSE_PRONE, l: '엎드리기', i: <ArrowDown className="w-4 h-4"/> },
                              { v: SubjectPose.POSE_CAT, l: '캣 포즈', i: <Activity className="w-4 h-4 rotate-90"/> },
                              { v: SubjectPose.POSE_LEANING, l: '숙이기', i: <ArrowDownLeft className="w-4 h-4"/> },
                              { v: SubjectPose.POSE_STRETCHING, l: '스트레칭', i: <MoveVertical className="w-4 h-4"/> },
                              { v: SubjectPose.POSE_LEGS_CROSSED, l: '다리꼬기', i: <UserCheck className="w-4 h-4"/> },
                              { v: SubjectPose.POSE_HAND_ON_HIP, l: '손 허리', i: <UserCheck className="w-4 h-4"/> },
                              { v: SubjectPose.POSE_FINGER_TO_LIPS, l: '입술 터치', i: <User className="w-4 h-4"/> },
                              { v: SubjectPose.POSE_SIDE_LYING, l: '옆으로 눕기', i: <ArrowRight className="w-4 h-4"/> },
                              { v: SubjectPose.POSE_HANDS_BEHIND_HEAD, l: '머리 뒤 손', i: <UserPlus className="w-4 h-4"/> },
                              { v: SubjectPose.POSE_SQUATTING, l: '쪼그려 앉기', i: <ArrowDown className="w-4 h-4"/> },
                              
                              // New Specific Poses
                              { v: SubjectPose.POSE_ONE_LEG, l: '한발 서기', i: <MoveVertical className="w-4 h-4"/> },
                              { v: SubjectPose.POSE_ELEGANT_CHAIR, l: '의자 앉기', i: <Armchair className="w-4 h-4"/> },
                              { v: SubjectPose.POSE_DYNAMIC_FABRIC, l: '흩날리는 옷', i: <Wind className="w-4 h-4"/> },
                              { v: SubjectPose.POSE_PENSIVE_CHIN, l: '턱 괴기', i: <User className="w-4 h-4"/> },
                              { v: SubjectPose.POSE_PLAYFUL_LIMBS, l: '과장된 포즈', i: <Activity className="w-4 h-4"/> },
                              { v: SubjectPose.POSE_SERENE_NATURE, l: '자연/평온', i: <Flower className="w-4 h-4"/> },

                              // Latest Gravure/Fashion Extensions
                              { v: SubjectPose.POSE_KNEELING_BACK, l: '무릎꿇고 뒤태', i: <Repeat className="w-4 h-4"/> },
                              { v: SubjectPose.POSE_LEANING_WALL, l: '벽에 기대기', i: <PanelLeft className="w-4 h-4"/> },
                              { v: SubjectPose.POSE_LYING_LEGS_UP, l: '다리 들기', i: <ArrowUpRight className="w-4 h-4"/> },
                              { v: SubjectPose.POSE_OFF_SHOULDER, l: '오프숄더', i: <UserMinus className="w-4 h-4"/> },
                              { v: SubjectPose.POSE_RUNWAY_WALK, l: '런웨이 워킹', i: <Footprints className="w-4 h-4"/> },
                            ].map(opt => (
                               <button 
                                 key={opt.v}
                                 onClick={() => onRemixImage(opt.v, CameraAngle.NONE)}
                                 className="p-3 rounded bg-slate-900 border border-slate-700 hover:border-banana-500 hover:text-banana-400 text-slate-400 transition-all flex flex-col items-center gap-1 text-[10px]"
                               >
                                  {opt.i} {opt.l}
                               </button>
                            ))}
                         </div>
                      </div>

                      <div className="space-y-3 pt-4 border-t border-slate-800">
                         <span className="text-xs text-slate-400 block">기본 포즈 (Basic Pose)</span>
                         <div className="grid grid-cols-3 gap-2">
                            {[
                              { v: SubjectPose.FRONT, l: '정면', i: <User className="w-4 h-4"/> },
                              { v: SubjectPose.LEFT, l: '측면', i: <ArrowLeft className="w-4 h-4"/> },
                              { v: SubjectPose.BACK, l: '뒷모습', i: <User className="w-4 h-4 opacity-50"/> }
                            ].map(opt => (
                               <button 
                                 key={opt.v}
                                 onClick={() => onRemixImage(opt.v, CameraAngle.NONE)}
                                 className="p-3 rounded bg-slate-900 border border-slate-700 hover:border-banana-500 hover:text-banana-400 text-slate-400 transition-all flex flex-col items-center gap-1 text-[10px]"
                               >
                                  {opt.i} {opt.l}
                               </button>
                            ))}
                         </div>
                      </div>

                      <div className="space-y-3 pt-4 border-t border-slate-800">
                         <span className="text-xs text-slate-400 block">카메라 앵글 (Angle)</span>
                         <div className="grid grid-cols-3 gap-2">
                            {[
                              { v: CameraAngle.EYE_LEVEL, l: '아이레벨', i: <Eye className="w-4 h-4"/> },
                              { v: CameraAngle.LOW, l: '로우', i: <ArrowUp className="w-4 h-4"/> },
                              { v: CameraAngle.HIGH, l: '하이', i: <ArrowDown className="w-4 h-4"/> },
                              { v: CameraAngle.OVERHEAD, l: '탑뷰', i: <Layers className="w-4 h-4"/> },
                              { v: CameraAngle.DUTCH, l: '더치', i: <MoveDiagonal className="w-4 h-4"/> },
                              { v: CameraAngle.WIDE, l: '광각', i: <MaximizeIcon className="w-4 h-4"/> },
                              { v: CameraAngle.SELFIE, l: '셀피', i: <Smartphone className="w-4 h-4"/> },
                              { v: CameraAngle.FISHEYE, l: '피쉬아이', i: <Aperture className="w-4 h-4"/> },
                              { v: CameraAngle.ISOMETRIC, l: '3D 뷰', i: <Box className="w-4 h-4"/> },
                              { v: CameraAngle.POV, l: '1인칭', i: <Navigation className="w-4 h-4"/> },
                              { v: CameraAngle.DRONE, l: '드론', i: <Plane className="w-4 h-4"/> },
                              { v: CameraAngle.TILT_SHIFT, l: '틸트시프트', i: <Minimize2 className="w-4 h-4" /> },
                              { v: CameraAngle.GROUND_LEVEL, l: '지면', i: <ArrowDownToLine className="w-4 h-4" /> },
                              { v: CameraAngle.OTS, l: '어깨너머', i: <Users className="w-4 h-4" /> },
                              { v: CameraAngle.TELEPHOTO, l: '망원', i: <Scan className="w-4 h-4" /> },
                              { v: CameraAngle.BUGS_EYE, l: '버그아이', i: <Bug className="w-4 h-4" /> },
                              { v: CameraAngle.KNEE_LEVEL, l: '니 레벨', i: <ChevronsUp className="w-4 h-4" /> },
                              { v: CameraAngle.CCTV, l: 'CCTV', i: <Video className="w-4 h-4" /> },
                              { v: CameraAngle.ACTION_CAM, l: '액션캠', i: <Zap className="w-4 h-4" /> },
                              { v: CameraAngle.SATELLITE, l: '위성', i: <Globe className="w-4 h-4" /> },
                              { v: CameraAngle.FLAT_LAY, l: '플랫레이', i: <LayoutGrid className="w-4 h-4" /> },
                              { v: CameraAngle.UNDERWATER, l: '수중', i: <Users className="w-4 h-4 text-blue-400" /> },
                              { v: CameraAngle.NIGHT_VISION, l: '야간투시', i: <Eye className="w-4 h-4 text-green-400" /> },
                              { v: CameraAngle.THERMAL, l: '열화상', i: <Zap className="w-4 h-4 text-orange-400" /> },
                              { v: CameraAngle.MICROSCOPE, l: '현미경', i: <ZoomIn className="w-4 h-4" /> },
                              { v: CameraAngle.CROSS_SECTION, l: '단면도', i: <Layers className="w-4 h-4" /> },
                              { v: CameraAngle.FULL_BODY, l: '전신/줌아웃', i: <ZoomOut className="w-4 h-4" /> },
                            ].map(opt => (
                               <button 
                                 key={opt.v}
                                 onClick={() => onRemixImage(SubjectPose.NONE, opt.v)}
                                 className="p-3 rounded bg-slate-900 border border-slate-700 hover:border-banana-500 hover:text-banana-400 text-slate-400 transition-all flex flex-col items-center gap-1 text-[10px]"
                               >
                                  {opt.i} {opt.l}
                               </button>
                            ))}
                         </div>
                      </div>
                   </div>
                )}

             </div>
           )}
        </div>

        {/* Bottom Info Bar (View Mode Only) */}
        {!isEditing && (
          <div className="p-4 bg-slate-950 border-t border-slate-800 text-slate-400 text-sm flex justify-between items-center">
             <p className="line-clamp-1 max-w-2xl">
               <span className="text-banana-500 font-bold mr-2">PROMPT:</span> 
               {image.prompt}
             </p>
             <div className="flex gap-4 text-xs font-mono">
                <span>{image.aspectRatio}</span>
                <span>{image.size}</span>
                <span>{new Date(image.createdAt).toLocaleTimeString()}</span>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
