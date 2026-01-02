
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ApiKeyGate } from './components/ApiKeyGate';
import { Header } from './components/Header';
import { Controls } from './components/Controls';
import { ImageCard } from './components/ImageCard';
import { ImageModal } from './components/ImageModal';
import { KeyManagerModal } from './components/KeyManagerModal';
import { generateImage, generateCharacterSheet, editImageWithPrompt, changePoseWithSketch } from './services/geminiService';
import { AspectRatio, ImageSize, GenerationConfig, GeneratedImage, SubjectPose, CameraAngle, ReferenceImageItem, CameraType } from './types';
import { AlertTriangle, Filter, X, Upload, ImagePlus } from 'lucide-react';

interface ErrorDetails {
  code?: string;
  title: string;
  message: string;
  suggestion?: string;
}

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<ErrorDetails | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isKeyManagerOpen, setIsKeyManagerOpen] = useState(false);
  
  // Filter states
  const [filterAspectRatio, setFilterAspectRatio] = useState<AspectRatio | 'ALL'>('ALL');
  const [filterSize, setFilterSize] = useState<ImageSize | 'ALL'>('ALL');
  
  // Modal state
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [editingReferenceId, setEditingReferenceId] = useState<string | null>(null);

  const fileInputImportRef = useRef<HTMLInputElement>(null);

  const [config, setConfig] = useState<GenerationConfig>({
    prompt: '',
    aspectRatio: AspectRatio.SQUARE,
    imageSize: ImageSize.RES_1K, 
    subjectPose: SubjectPose.NONE,
    cameraAngle: CameraAngle.NONE,
    cameraType: CameraType.AUTO,
    referenceImages: []
  });

  useEffect(() => {
    const checkInitialKey = async () => {
      try {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } catch (e) {
        console.error("API Key check error", e);
      }
    };
    checkInitialKey();
  }, []);

  const handleKeySelected = useCallback(() => {
    setHasApiKey(true);
  }, []);

  const handleConfigChange = (key: keyof GenerationConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleError = (e: any) => {
      let msg = "";
      if (typeof e === 'string') msg = e;
      else if (e.message) msg = e.message;
      else if (e.error && e.error.message) msg = e.error.message;
      else msg = JSON.stringify(e);

      let details: ErrorDetails = {
        title: "오류가 발생했습니다",
        message: msg,
        suggestion: "잠시 후 다시 시도해 주세요."
      };

      if (msg.includes('403') || msg.includes('permission')) {
        details = {
          code: '403 Forbidden',
          title: '권한 오류',
          message: 'API 키가 유효하지 않거나 결제가 활성화되지 않았습니다.',
          suggestion: '외장 키 관리 센터에서 연결 테스트를 수행해 보세요.'
        };
      } else if (msg.includes('429')) {
        details = { code: '429', title: '사용량 초과', message: '단시간에 너무 많은 요청을 보냈습니다.', suggestion: '잠시 후 다시 시도해 주세요.' };
      } else if (msg.includes('SAFETY') || msg.includes('blocked')) {
        details = { code: 'Safety Block', title: '정책 차단', message: '안전 정책 위배로 이미지가 차단되었습니다.', suggestion: '프롬프트를 수정해 주세요.' };
      }
      
      setError(details);
  };

  const handleGenerate = async () => {
    const activeRefs = config.referenceImages.filter(img => img.isEnabled).map(img => img.url);
    if (!config.prompt.trim() && activeRefs.length === 0) return;

    setIsGenerating(true);
    setError(null);

    try {
      const base64Url = await generateImage(
        config.prompt, config.aspectRatio, config.imageSize,
        config.subjectPose, config.cameraAngle, activeRefs, config.cameraType
      );
      
      const newImage: GeneratedImage = {
        id: Date.now().toString(),
        url: base64Url,
        prompt: config.prompt || (activeRefs.length > 0 ? "Image Editing" : "Untitled"),
        aspectRatio: config.aspectRatio,
        size: config.imageSize,
        createdAt: Date.now()
      };

      setGeneratedImages(prev => [newImage, ...prev]);
    } catch (e: any) {
      handleError(e);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleGenerateCharacterSheet = async (sourceImage: GeneratedImage) => {
    setIsGenerating(true);
    setError(null);
    setSelectedImage(null);
    try {
      const base64Url = await generateCharacterSheet(sourceImage.prompt, sourceImage.url);
      setGeneratedImages(prev => [{
        id: Date.now().toString(), url: base64Url, prompt: `Character Sheet: ${sourceImage.prompt}`,
        aspectRatio: AspectRatio.LANDSCAPE_16_9, size: ImageSize.RES_2K, createdAt: Date.now()
      }, ...prev]);
    } catch (e: any) { handleError(e); } finally { setIsGenerating(false); }
  };

  const handleRemixImage = async (sourceImage: GeneratedImage, pose: SubjectPose, angle: CameraAngle) => {
    setIsGenerating(true);
    setError(null);
    setSelectedImage(null); 
    try {
      const base64Url = await generateImage(
        sourceImage.prompt, sourceImage.aspectRatio, sourceImage.size,
        pose, angle, [sourceImage.url]
      );
      setGeneratedImages(prev => [{
        id: Date.now().toString(), url: base64Url, prompt: `Remix: ${sourceImage.prompt}`,
        aspectRatio: sourceImage.aspectRatio, size: sourceImage.size, createdAt: Date.now()
      }, ...prev]);
    } catch (e: any) { handleError(e); } finally { setIsGenerating(false); }
  };

  const handlePromptEdit = async (sourceImage: GeneratedImage, instruction: string) => {
    setIsGenerating(true);
    setError(null);
    setSelectedImage(null); 
    try {
      const base64Url = await editImageWithPrompt(sourceImage.url, instruction, sourceImage.aspectRatio);
      setGeneratedImages(prev => [{
        id: Date.now().toString(), url: base64Url, prompt: `Edit: ${instruction}`,
        aspectRatio: sourceImage.aspectRatio, size: sourceImage.size, createdAt: Date.now()
      }, ...prev]);
    } catch (e: any) { handleError(e); } finally { setIsGenerating(false); }
  };

  const handleChangePose = async (sourceImage: GeneratedImage, sketchUrl: string, prompt: string) => {
    setIsGenerating(true);
    setError(null);
    setSelectedImage(null); 
    try {
      const base64Url = await changePoseWithSketch(sourceImage.url, sketchUrl, prompt, sourceImage.aspectRatio);
      setGeneratedImages(prev => [{
        id: Date.now().toString(), url: base64Url, prompt: `Pose Change: ${prompt}`,
        aspectRatio: sourceImage.aspectRatio, size: sourceImage.size, createdAt: Date.now()
      }, ...prev]);
    } catch (e: any) { handleError(e); } finally { setIsGenerating(false); }
  };

  const handleUpdateImage = (id: string, updates: Partial<GeneratedImage>) => {
    if (editingReferenceId && editingReferenceId === id) {
       if (updates.url) {
         setConfig(prev => ({
           ...prev, referenceImages: prev.referenceImages.map(ref => ref.id === id ? { ...ref, url: updates.url! } : ref)
         }));
       }
       return;
    }
    setGeneratedImages(prev => prev.map(img => img.id === id ? { ...img, ...updates } : img));
    if (selectedImage && selectedImage.id === id) {
      setSelectedImage(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleAddReference = (url: string) => {
    if (config.referenceImages.length >= 20) { alert("최대 20장만 가능합니다."); return; }
    setConfig(prev => ({
      ...prev, referenceImages: [...prev.referenceImages, { id: Date.now().toString(), url, isEnabled: true, name: `Ref ${prev.referenceImages.length + 1}` }]
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImportImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setGeneratedImages(prev => [{
          id: Date.now().toString(), url: base64Url, prompt: file.name,
          aspectRatio: AspectRatio.SQUARE, size: ImageSize.RES_1K, createdAt: Date.now()
        }, ...prev]);
      };
      img.src = base64Url;
    };
    reader.readAsDataURL(file);
  };

  const resetFilters = () => { setFilterAspectRatio('ALL'); setFilterSize('ALL'); };
  const filteredImages = generatedImages.filter(img => (filterAspectRatio === 'ALL' || img.aspectRatio === filterAspectRatio) && (filterSize === 'ALL' || img.size === filterSize));
  const hasActiveFilters = filterAspectRatio !== 'ALL' || filterSize !== 'ALL';

  if (!hasApiKey) return <ApiKeyGate onKeySelected={handleKeySelected} />;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      <Header 
        onOpenKeyManager={() => setIsKeyManagerOpen(true)} 
        keyStatus={hasApiKey ? 'connected' : 'not-connected'} 
      />
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-1/3 flex-shrink-0">
            <div className="lg:sticky lg:top-24">
              <Controls config={config} isGenerating={isGenerating} onChange={handleConfigChange} onSubmit={handleGenerate} hasHistory={generatedImages.length > 0} onEditReference={setEditingReferenceId} />
              {error && (
                <div className="mt-4 p-4 bg-red-950/30 border border-red-500/30 rounded-xl flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-red-400 font-bold border-b border-red-500/20 pb-2">
                    <AlertTriangle className="w-5 h-5" /> <span>{error.title}</span>
                  </div>
                  <p className="text-red-300 text-sm leading-relaxed">{error.message}</p>
                  {error.suggestion && <div className="bg-red-500/10 rounded-lg p-3 text-xs text-red-300/80">💡 {error.suggestion}</div>}
                </div>
              )}
            </div>
          </div>

          <div className="w-full lg:w-2/3 space-y-8">
            {isGenerating && (
               <div className="w-full rounded-2xl bg-slate-900 border border-slate-800 animate-pulse flex items-center justify-center flex-col gap-4 mb-8 h-96">
                 <div className="w-16 h-16 border-4 border-banana-500 border-t-transparent rounded-full animate-spin"></div>
                 <p className="text-banana-500 font-medium animate-pulse">걸작을 만드는 중...</p>
               </div>
            )}
            {generatedImages.length > 0 ? (
                <>
                  <div className="sticky top-0 z-10 -mx-2 px-2 py-2 backdrop-blur-md bg-slate-950/80 rounded-xl mb-4 border-b border-slate-800/50 flex flex-wrap items-center gap-3">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select value={filterAspectRatio} onChange={(e) => setFilterAspectRatio(e.target.value as AspectRatio | 'ALL')} className="bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-lg p-2"><option value="ALL">모든 비율</option>{Object.values(AspectRatio).map(r => <option key={r} value={r}>{r}</option>)}</select>
                    <select value={filterSize} onChange={(e) => setFilterSize(e.target.value as ImageSize | 'ALL')} className="bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-lg p-2"><option value="ALL">모든 해상도</option>{Object.values(ImageSize).map(s => <option key={s} value={s}>{s}</option>)}</select>
                    {hasActiveFilters && <button onClick={resetFilters} className="ml-auto text-xs text-slate-500 hover:text-banana-400">필터 초기화</button>}
                    <button onClick={() => fileInputImportRef.current?.click()} className="text-xs flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-banana-400 p-2 rounded-lg border border-slate-700 ml-auto"><ImagePlus className="w-3.5 h-3.5" /> 이미지 불러오기</button>
                  </div>
                  <div className="space-y-8">{filteredImages.map(img => <ImageCard key={img.id} image={img} onClick={() => setSelectedImage(img)} />)}</div>
                </>
            ) : !isGenerating && (
              <div className="h-96 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
                <p className="text-lg font-medium text-slate-500">갤러리가 비어있습니다</p>
                <button onClick={() => fileInputImportRef.current?.click()} className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-banana-400 rounded-lg flex items-center gap-2 transition-colors border border-slate-700"><Upload className="w-4 h-4" /> 내 이미지 불러오기</button>
              </div>
            )}
            <input type="file" ref={fileInputImportRef} onChange={handleImportImage} className="hidden" accept="image/*" />
          </div>
        </div>
      </main>

      {selectedImage && <ImageModal image={selectedImage} onClose={() => setSelectedImage(null)} onUpdateImage={handleUpdateImage} onAddReference={handleAddReference} onGenerateCharacterSheet={() => handleGenerateCharacterSheet(selectedImage)} onRemixImage={handleRemixImage} onPromptEdit={handlePromptEdit} onPoseChange={handleChangePose} />}
      {editingReferenceId && <ImageModal image={{ id: editingReferenceId, url: config.referenceImages.find(r => r.id === editingReferenceId)?.url || '', prompt: 'Reference', aspectRatio: AspectRatio.SQUARE, size: ImageSize.RES_1K, createdAt: Date.now() }} onClose={() => setEditingReferenceId(null)} onUpdateImage={handleUpdateImage} onAddReference={() => {}} onGenerateCharacterSheet={() => {}} onRemixImage={() => {}} onPromptEdit={() => {}} />}
      
      {isKeyManagerOpen && (
        <KeyManagerModal 
          onClose={() => setIsKeyManagerOpen(false)} 
          onKeyChange={() => setHasApiKey(true)} 
        />
      )}
    </div>
  );
};

export default App;
