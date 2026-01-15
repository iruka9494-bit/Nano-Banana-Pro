
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { X, Check, Layers, Trash2, Move, RotateCw, ZoomIn, Plus, Image as ImageIcon, History, MousePointer2, ArrowUpToLine, ArrowDownToLine, FlipHorizontal, Eye, EyeOff, Grid, Smartphone, Monitor, Square, Search, Type, Undo, Redo } from 'lucide-react';
import { GeneratedImage, AspectRatio, ReferenceImageItem } from '../types';

interface CompositionModalProps {
  referenceImages: ReferenceImageItem[];
  historyImages: GeneratedImage[];
  aspectRatio: AspectRatio;
  onClose: () => void;
  onSave: (mergedImageUrl: string, aspectRatio: AspectRatio) => void;
}

interface Layer {
  id: string;
  type: 'image' | 'text';
  url?: string;
  text?: string;
  fontSize?: number;
  color?: string;
  fontWeight?: string;
  
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  flipX: boolean;
  zIndex: number;
}

type SidebarTab = 'refs' | 'history';

export const CompositionModal: React.FC<CompositionModalProps> = ({
  referenceImages,
  historyImages,
  aspectRatio,
  onClose,
  onSave,
}) => {
  // History Management
  const [layers, setLayers] = useState<Layer[]>([]);
  const [history, setHistory] = useState<Layer[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1024, height: 1024 });
  const [activeTab, setActiveTab] = useState<SidebarTab>('refs');
  const [canvasBackground, setCanvasBackground] = useState<'black' | 'white' | 'grid'>('black');
  const [currentAspectRatio, setCurrentAspectRatio] = useState<AspectRatio>(aspectRatio);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Visual layout state for WYSIWYG
  const [visualLayout, setVisualLayout] = useState({ width: 0, height: 0 });
  
  // Interaction state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize canvas logical size based on aspect ratio
  useEffect(() => {
    const [w, h] = currentAspectRatio.split(':').map(Number);
    const baseSize = 1024;
    let width, height;
    
    if (w > h) {
       width = baseSize;
       height = baseSize * (h / w);
    } else {
       width = baseSize * (w / h);
       height = baseSize;
    }
    setCanvasSize({ width, height });
  }, [currentAspectRatio]);

  // Calculate visual layout (contain)
  useLayoutEffect(() => {
    const updateLayout = () => {
      if (!containerRef.current) return;
      
      const containerW = containerRef.current.clientWidth;
      const containerH = containerRef.current.clientHeight;
      
      // Target aspect ratio
      const [rW, rH] = currentAspectRatio.split(':').map(Number);
      const targetRatio = rW / rH;
      const containerRatio = containerW / containerH;

      let visualW, visualH;

      if (containerRatio > targetRatio) {
        // Container is wider than target -> constrained by height
        visualH = containerH - 64; // padding buffer
        visualW = visualH * targetRatio;
      } else {
        // Container is taller than target -> constrained by width
        visualW = containerW - 64; // padding buffer
        visualH = visualW / targetRatio;
      }

      setVisualLayout({ width: visualW, height: visualH });
    };

    updateLayout();
    
    const resizeObserver = new ResizeObserver(() => updateLayout());
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [currentAspectRatio]);

  // History Helper
  const addToHistory = (newLayers: Layer[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newLayers);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setLayers(newLayers);
  };

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setLayers(history[newIndex]);
      // If the selected layer no longer exists in the past state, deselect it
      if (selectedLayerId && !history[newIndex].find(l => l.id === selectedLayerId)) {
        setSelectedLayerId(null);
      }
    }
  }, [historyIndex, history, selectedLayerId]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setLayers(history[newIndex]);
    }
  }, [historyIndex, history]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        redo();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const addImageLayer = (url: string) => {
    const maxZ = layers.reduce((max, l) => Math.max(max, l.zIndex), 0);
    const newLayer: Layer = {
      id: Date.now().toString() + Math.random(),
      type: 'image',
      url,
      x: canvasSize.width / 2,
      y: canvasSize.height / 2,
      scale: 0.5,
      rotation: 0,
      opacity: 1,
      flipX: false,
      zIndex: maxZ + 1,
    };
    const newLayers = [...layers, newLayer];
    addToHistory(newLayers);
    setSelectedLayerId(newLayer.id);
  };

  const addTextLayer = () => {
    const maxZ = layers.reduce((max, l) => Math.max(max, l.zIndex), 0);
    const newLayer: Layer = {
      id: Date.now().toString() + Math.random(),
      type: 'text',
      text: 'Text Layer',
      fontSize: 60,
      color: '#ffffff',
      fontWeight: 'bold',
      x: canvasSize.width / 2,
      y: canvasSize.height / 2,
      scale: 1,
      rotation: 0,
      opacity: 1,
      flipX: false,
      zIndex: maxZ + 1,
    };
    const newLayers = [...layers, newLayer];
    addToHistory(newLayers);
    setSelectedLayerId(newLayer.id);
  };

  const removeLayer = (id: string) => {
    const newLayers = layers.filter(l => l.id !== id);
    addToHistory(newLayers);
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  const updateLayer = (id: string, updates: Partial<Layer>, saveToHistory = true) => {
    const newLayers = layers.map(l => l.id === id ? { ...l, ...updates } : l);
    if (saveToHistory) {
      addToHistory(newLayers);
    } else {
      setLayers(newLayers);
    }
  };

  // Layer Ordering
  const bringToFront = (id: string) => {
    const maxZ = layers.reduce((max, l) => Math.max(max, l.zIndex), 0);
    updateLayer(id, { zIndex: maxZ + 1 });
  };

  const sendToBack = (id: string) => {
    const minZ = layers.reduce((min, l) => Math.min(min, l.zIndex), 9999);
    updateLayer(id, { zIndex: minZ - 1 });
  };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedLayerId(id);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedLayerId || !canvasRef.current) return;
    
    // Calculate movement in logical canvas coordinates
    const visualScale = visualLayout.width / canvasSize.width;

    const dx = (e.clientX - dragStart.x) / visualScale;
    const dy = (e.clientY - dragStart.y) / visualScale;

    // Update state directly for smooth drag without polluting history
    setLayers(prev => prev.map(l => {
      if (l.id === selectedLayerId) {
        return { ...l, x: l.x + dx, y: l.y + dy };
      }
      return l;
    }));
    
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    if (isDragging) {
      // Commit the drag end state to history
      addToHistory(layers);
    }
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!selectedLayerId) return;
    const layer = layers.find(l => l.id === selectedLayerId);
    if (!layer) return;

    // We use updateLayer with saveToHistory=false for smooth scrolling visual, 
    // but ideally we should debounce history save. 
    // For simplicity, we commit to history here to ensure state persistence.
    
    if (e.ctrlKey || e.metaKey) {
       e.preventDefault();
       const delta = e.deltaY > 0 ? 5 : -5;
       updateLayer(selectedLayerId, { 
         rotation: layer.rotation + delta 
       });
    } else {
       e.preventDefault();
       const delta = e.deltaY > 0 ? -0.05 : 0.05;
       updateLayer(selectedLayerId, { 
         scale: Math.max(0.1, Math.min(5, layer.scale + delta)) 
       });
    }
  };

  const handleSave = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw Background
    if (canvasBackground === 'white') {
      ctx.fillStyle = '#ffffff';
    } else if (canvasBackground === 'black') {
      ctx.fillStyle = '#000000';
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height); // Transparent
    }
    if (canvasBackground !== 'grid') {
       ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

    for (const layer of sortedLayers) {
      ctx.save();
      ctx.translate(layer.x, layer.y);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.scale(layer.flipX ? -layer.scale : layer.scale, layer.scale);
      ctx.globalAlpha = layer.opacity;

      if (layer.type === 'image' && layer.url) {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const i = new Image();
          i.crossOrigin = "anonymous";
          i.onload = () => resolve(i);
          i.onerror = reject;
          i.src = layer.url!;
        });
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      } else if (layer.type === 'text' && layer.text) {
        ctx.font = `${layer.fontWeight || 'normal'} ${layer.fontSize || 40}px sans-serif`;
        ctx.fillStyle = layer.color || '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Text drawing origin is center due to translate above
        ctx.fillText(layer.text, 0, 0);
      }

      ctx.restore();
    }

    const dataUrl = canvas.toDataURL('image/png');
    // Pass both the image data AND the aspect ratio back to App.tsx
    onSave(dataUrl, currentAspectRatio);
    onClose();
  };

  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  // Filter Logic
  const filteredRefs = referenceImages.filter(img => 
    (img.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredHistory = historyImages.filter(img => 
    img.prompt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md select-none">
      <div className="w-full max-w-7xl h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-banana-500/10 rounded-lg">
              <Layers className="w-6 h-6 text-banana-400" />
            </div>
            <div>
               <h2 className="text-lg font-bold text-slate-200">캔버스 스튜디오</h2>
               <p className="text-xs text-slate-500">여러 이미지를 배치하여 새로운 참조 이미지 생성</p>
            </div>
          </div>
          <div className="flex gap-3">
             <div className="flex items-center bg-slate-800 rounded-lg p-1 mr-2">
                <button 
                  onClick={undo} 
                  disabled={historyIndex <= 0}
                  className="p-2 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                  title="실행 취소 (Ctrl+Z)"
                >
                  <Undo className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-slate-700 mx-1"></div>
                <button 
                  onClick={redo} 
                  disabled={historyIndex >= history.length - 1}
                  className="p-2 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                  title="다시 실행 (Ctrl+Y)"
                >
                  <Redo className="w-4 h-4" />
                </button>
             </div>

             <button 
               onClick={addTextLayer}
               className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-2 transition-colors text-sm font-medium"
             >
               <Type className="w-4 h-4" /> 텍스트 추가
             </button>
             <div className="w-px bg-slate-800 mx-1"></div>
             <button 
               onClick={onClose}
               className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm"
             >
               취소
             </button>
             <button 
               onClick={handleSave}
               className="px-6 py-2 bg-banana-500 hover:bg-banana-400 text-slate-950 font-bold rounded-lg flex items-center gap-2 transition-all text-sm"
             >
               <Check className="w-4 h-4" />
               합성 완료 및 저장
             </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Resources */}
          <div className="w-72 bg-slate-950 border-r border-slate-800 flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-slate-800">
              <button 
                onClick={() => { setActiveTab('refs'); setSearchTerm(''); }}
                className={`flex-1 py-3 text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors ${activeTab === 'refs' ? 'text-banana-500 border-b-2 border-banana-500 bg-slate-900' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <ImageIcon className="w-3 h-3" /> 참조
              </button>
              <button 
                onClick={() => { setActiveTab('history'); setSearchTerm(''); }}
                className={`flex-1 py-3 text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors ${activeTab === 'history' ? 'text-banana-500 border-b-2 border-banana-500 bg-slate-900' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <History className="w-3 h-3" /> 기록
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-3 border-b border-slate-800 bg-slate-900/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input 
                  type="text" 
                  placeholder={activeTab === 'refs' ? "파일명 검색..." : "프롬프트 검색..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:border-banana-500 outline-none transition-colors placeholder-slate-600"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'refs' && (
                 <div className="grid grid-cols-2 gap-2">
                   {filteredRefs.length === 0 && (
                     <div className="col-span-2 text-center py-8 text-slate-600 text-xs">
                       {searchTerm ? "검색 결과가 없습니다." : "업로드된 이미지가 없습니다."}
                     </div>
                   )}
                   {filteredRefs.map((item, idx) => (
                     <button 
                       key={item.id}
                       onClick={() => addImageLayer(item.url)}
                       className="relative aspect-square rounded-lg overflow-hidden border border-slate-800 hover:border-banana-500 transition-all group bg-slate-900"
                       title={item.name}
                     >
                       <img src={item.url} alt="ref" className="w-full h-full object-cover" />
                       <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                         <Plus className="w-6 h-6 text-white" />
                       </div>
                       {item.name && (
                         <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[9px] text-white truncate px-1 py-0.5">
                           {item.name}
                         </div>
                       )}
                     </button>
                   ))}
                 </div>
              )}

              {activeTab === 'history' && (
                 <div className="grid grid-cols-2 gap-2">
                   {filteredHistory.length === 0 && (
                     <div className="col-span-2 text-center py-8 text-slate-600 text-xs">
                       {searchTerm ? "검색 결과가 없습니다." : "생성된 이미지가 없습니다."}
                     </div>
                   )}
                   {filteredHistory.map((img) => (
                     <button 
                       key={img.id}
                       onClick={() => addImageLayer(img.url)}
                       className="relative aspect-square rounded-lg overflow-hidden border border-slate-800 hover:border-banana-500 transition-all group bg-slate-900"
                       title={img.prompt}
                     >
                       <img src={img.url} alt="history" className="w-full h-full object-cover" />
                       <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                         <Plus className="w-6 h-6 text-white" />
                       </div>
                     </button>
                   ))}
                 </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-800 bg-slate-900 text-[10px] text-slate-500">
              <p className="font-bold mb-1 text-slate-400 flex items-center gap-1">
                 <MousePointer2 className="w-3 h-3" /> 조작 방법
              </p>
              <ul className="space-y-1 pl-1">
                <li>• 클릭: 레이어 선택</li>
                <li>• 드래그: 레이어 이동</li>
                <li>• 휠: 크기 조절 (Zoom)</li>
                <li>• Ctrl+휠: 회전 (Rotate)</li>
              </ul>
            </div>
          </div>

          {/* Main Canvas Area */}
          <div ref={containerRef} className="flex-1 bg-slate-900 relative overflow-hidden flex items-center justify-center p-8">
            <div className="absolute inset-0 z-0" style={{ 
                backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', 
                backgroundSize: '20px 20px',
                opacity: 0.2
              }}>
            </div>

            <div 
              ref={canvasRef}
              className="relative shadow-2xl border border-slate-700 overflow-hidden z-10 transition-all"
              style={{ 
                width: visualLayout.width,
                height: visualLayout.height,
                // Remove aspectRatio constraint from style as we explicitly set px via visualLayout
                backgroundColor: canvasBackground === 'black' ? '#000' : canvasBackground === 'white' ? '#fff' : 'transparent',
                backgroundImage: canvasBackground === 'grid' 
                  ? 'conic-gradient(#ccc 90deg, #fff 90deg 180deg, #ccc 180deg 270deg, #fff 270deg)'
                  : 'none',
                backgroundSize: canvasBackground === 'grid' ? '20px 20px' : 'auto',
              }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            >
              {layers.map((layer) => (
                <div
                  key={layer.id}
                  className={`absolute cursor-move group`}
                  style={{
                    left: '0px',
                    top: '0px',
                    transform: `translate(${layer.x}px, ${layer.y}px) translate(-50%, -50%) rotate(${layer.rotation}deg) scale(${layer.scale})`,
                    zIndex: layer.zIndex,
                    opacity: layer.opacity,
                    border: selectedLayerId === layer.id ? '2px solid #eab308' : 'none',
                  }}
                  onMouseDown={(e) => handleMouseDown(e, layer.id)}
                >
                  {layer.type === 'image' && layer.url ? (
                    <img 
                      src={layer.url} 
                      alt="layer" 
                      className="pointer-events-none max-w-none" 
                      style={{ 
                        display: 'block',
                        transform: layer.flipX ? 'scaleX(-1)' : 'none' 
                      }}
                    />
                  ) : layer.type === 'text' && layer.text ? (
                    <div 
                      className="whitespace-pre-wrap text-center leading-none select-none"
                      style={{
                        color: layer.color,
                        fontSize: `${layer.fontSize}px`,
                        fontWeight: layer.fontWeight,
                        transform: layer.flipX ? 'scaleX(-1)' : 'none',
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                      }}
                    >
                      {layer.text}
                    </div>
                  ) : null}
                </div>
              ))}

              {layers.length === 0 && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 pointer-events-none">
                    <Layers className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-lg font-medium">레이어가 없습니다</p>
                    <p className="text-sm opacity-60">왼쪽에서 이미지나 텍스트를 추가하세요</p>
                 </div>
              )}
            </div>
          </div>
          
          {/* Right Sidebar: Layer & Global Properties */}
          <div className="w-64 bg-slate-950 border-l border-slate-800 flex flex-col overflow-y-auto">
            {/* Layer Properties */}
            <div className="p-4 border-b border-slate-800">
               <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-4">레이어 속성</h3>
               
               {selectedLayer ? (
                 <div className="space-y-6">
                   {/* Type Specific Controls */}
                   {selectedLayer.type === 'text' && (
                     <div className="space-y-4 pb-4 border-b border-slate-800">
                       <div className="space-y-2">
                         <label className="text-xs text-slate-400">텍스트 내용</label>
                         <textarea
                           value={selectedLayer.text}
                           onChange={(e) => updateLayer(selectedLayer.id, { text: e.target.value })}
                           className="w-full h-20 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white resize-none focus:border-banana-500 outline-none"
                         />
                       </div>
                       <div className="space-y-2">
                         <label className="text-xs text-slate-400">글자 색상</label>
                         <div className="flex gap-2">
                           <input 
                             type="color"
                             value={selectedLayer.color}
                             onChange={(e) => updateLayer(selectedLayer.id, { color: e.target.value })}
                             className="h-8 w-12 rounded bg-transparent cursor-pointer"
                           />
                           <input 
                             type="text"
                             value={selectedLayer.color}
                             onChange={(e) => updateLayer(selectedLayer.id, { color: e.target.value })}
                             className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 text-xs text-white"
                           />
                         </div>
                       </div>
                       <div className="space-y-2">
                         <div className="flex justify-between text-xs text-slate-400">
                           <span>글자 크기 (Size)</span>
                           <span>{selectedLayer.fontSize}px</span>
                         </div>
                         <input 
                           type="range" min="10" max="200" 
                           value={selectedLayer.fontSize}
                           onChange={(e) => updateLayer(selectedLayer.id, { fontSize: Number(e.target.value) })}
                           className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-banana-500"
                         />
                       </div>
                       <div className="space-y-2">
                          <label className="text-xs text-slate-400">스타일</label>
                          <button 
                            onClick={() => updateLayer(selectedLayer.id, { fontWeight: selectedLayer.fontWeight === 'bold' ? 'normal' : 'bold' })}
                            className={`w-full py-2 rounded border text-xs transition-colors ${selectedLayer.fontWeight === 'bold' ? 'bg-banana-500 text-slate-950 border-banana-500 font-bold' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
                          >
                            Bold (굵게)
                          </button>
                       </div>
                     </div>
                   )}

                   <div className="space-y-2">
                     <div className="flex justify-between text-xs text-slate-400">
                       <span>불투명도 (Opacity)</span>
                       <span>{Math.round(selectedLayer.opacity * 100)}%</span>
                     </div>
                     <input 
                       type="range" min="0" max="1" step="0.01"
                       value={selectedLayer.opacity}
                       onChange={(e) => updateLayer(selectedLayer.id, { opacity: Number(e.target.value) })}
                       className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-banana-500"
                     />
                   </div>
                   
                   <div className="space-y-2">
                      <span className="text-xs text-slate-400">변형 (Transform)</span>
                      <div className="flex gap-2">
                         <button 
                           onClick={() => updateLayer(selectedLayer.id, { flipX: !selectedLayer.flipX })}
                           className={`flex-1 p-2 rounded border text-xs flex flex-col items-center gap-1 transition-colors ${selectedLayer.flipX ? 'bg-banana-500 text-slate-950 border-banana-500' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}`}
                           title="좌우 반전"
                         >
                           <FlipHorizontal className="w-4 h-4" /> 반전
                         </button>
                         <button 
                           onClick={() => updateLayer(selectedLayer.id, { rotation: selectedLayer.rotation + 90 })}
                           className="flex-1 p-2 rounded border border-slate-700 bg-slate-900 text-slate-400 hover:text-white text-xs flex flex-col items-center gap-1 transition-colors"
                           title="90도 회전"
                         >
                           <RotateCw className="w-4 h-4" /> 90°
                         </button>
                      </div>
                   </div>

                   <div className="space-y-2">
                      <span className="text-xs text-slate-400">순서 (Order)</span>
                      <div className="flex gap-2">
                         <button 
                           onClick={() => bringToFront(selectedLayer.id)}
                           className="flex-1 p-2 rounded border border-slate-700 bg-slate-900 text-slate-400 hover:text-white text-xs flex flex-col items-center gap-1"
                           title="맨 앞으로"
                         >
                           <ArrowUpToLine className="w-4 h-4" /> 앞
                         </button>
                         <button 
                           onClick={() => sendToBack(selectedLayer.id)}
                           className="flex-1 p-2 rounded border border-slate-700 bg-slate-900 text-slate-400 hover:text-white text-xs flex flex-col items-center gap-1"
                           title="맨 뒤로"
                         >
                           <ArrowDownToLine className="w-4 h-4" /> 뒤
                         </button>
                      </div>
                   </div>
                   
                   <div className="pt-4 border-t border-slate-800">
                      <button 
                        onClick={() => removeLayer(selectedLayer.id)}
                        className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> 레이어 삭제
                      </button>
                   </div>
                 </div>
               ) : (
                 <div className="text-center py-8 text-slate-600 text-xs">
                   <MousePointer2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                   <p>편집할 레이어를 선택하세요</p>
                 </div>
               )}
            </div>
            
            {/* Canvas Aspect Ratio Settings */}
            <div className="p-4 border-t border-slate-800">
               <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-3">캔버스 비율</h3>
               <div className="grid grid-cols-3 gap-2">
                 <button
                   onClick={() => setCurrentAspectRatio(AspectRatio.SQUARE)}
                   className={`p-2 rounded border flex flex-col items-center gap-1 text-[10px] ${currentAspectRatio === AspectRatio.SQUARE ? 'bg-banana-500 text-slate-950 border-banana-500' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}`}
                 >
                   <Square className="w-4 h-4" /> 1:1
                 </button>
                 <button
                   onClick={() => setCurrentAspectRatio(AspectRatio.LANDSCAPE_4_3)}
                   className={`p-2 rounded border flex flex-col items-center gap-1 text-[10px] ${currentAspectRatio === AspectRatio.LANDSCAPE_4_3 ? 'bg-banana-500 text-slate-950 border-banana-500' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}`}
                 >
                   <Monitor className="w-4 h-4" /> 4:3
                 </button>
                 <button
                   onClick={() => setCurrentAspectRatio(AspectRatio.LANDSCAPE_16_9)}
                   className={`p-2 rounded border flex flex-col items-center gap-1 text-[10px] ${currentAspectRatio === AspectRatio.LANDSCAPE_16_9 ? 'bg-banana-500 text-slate-950 border-banana-500' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}`}
                 >
                   <Monitor className="w-4 h-4" /> 16:9
                 </button>
                  <button
                   onClick={() => setCurrentAspectRatio(AspectRatio.PORTRAIT_3_4)}
                   className={`p-2 rounded border flex flex-col items-center gap-1 text-[10px] ${currentAspectRatio === AspectRatio.PORTRAIT_3_4 ? 'bg-banana-500 text-slate-950 border-banana-500' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}`}
                 >
                   <Smartphone className="w-4 h-4" /> 3:4
                 </button>
                 <button
                   onClick={() => setCurrentAspectRatio(AspectRatio.PORTRAIT_9_16)}
                   className={`p-2 rounded border flex flex-col items-center gap-1 text-[10px] ${currentAspectRatio === AspectRatio.PORTRAIT_9_16 ? 'bg-banana-500 text-slate-950 border-banana-500' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}`}
                 >
                   <Smartphone className="w-4 h-4" /> 9:16
                 </button>
               </div>
            </div>

            {/* Canvas Background Settings */}
            <div className="p-4 mt-auto border-t border-slate-800">
               <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-3">캔버스 배경</h3>
               <div className="flex gap-2">
                 <button 
                   onClick={() => setCanvasBackground('black')}
                   className={`flex-1 h-8 rounded border ${canvasBackground === 'black' ? 'border-banana-500 ring-1 ring-banana-500' : 'border-slate-700'}`}
                   style={{ backgroundColor: '#000' }}
                   title="검은색 배경"
                 />
                 <button 
                   onClick={() => setCanvasBackground('white')}
                   className={`flex-1 h-8 rounded border ${canvasBackground === 'white' ? 'border-banana-500 ring-1 ring-banana-500' : 'border-slate-700'}`}
                   style={{ backgroundColor: '#fff' }}
                   title="흰색 배경"
                 />
                 <button 
                   onClick={() => setCanvasBackground('grid')}
                   className={`flex-1 h-8 rounded border overflow-hidden ${canvasBackground === 'grid' ? 'border-banana-500 ring-1 ring-banana-500' : 'border-slate-700'}`}
                   title="투명 격자"
                 >
                    <div className="w-full h-full opacity-50 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxwYXRoIGQ9Ik0wIDBoNHY0SDBVbTQgNGg0djhINFoiIGZpbGw9IiNDQ0MiLz48L3N2Zz4=')]"></div>
                 </button>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
