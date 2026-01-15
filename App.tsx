
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ApiKeyGate } from './components/ApiKeyGate';
import { Header } from './components/Header';
import { Controls } from './components/Controls';
import { ImageCard } from './components/ImageCard';
import { ImageModal } from './components/ImageModal';
import { KeyManagerModal } from './components/KeyManagerModal';
import { generateImage, generateCharacterSheet, editImageWithPrompt, changePoseWithSketch } from './services/geminiService';
import { AspectRatio, ImageSize, GenerationConfig, GeneratedImage, SubjectPose, CameraAngle, CameraType } from './types';
import { AlertTriangle, Upload } from 'lucide-react';

interface ErrorDetails {
  code?: string;
  title: string;
  message: string;
  suggestion?: string;
}

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<ErrorDetails | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isKeyManagerOpen, setIsKeyManagerOpen] = useState(false);
  
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
    const checkKey = async () => {
      try {
        const aistudio = (window as any).aistudio;
        if (aistudio && typeof aistudio.hasSelectedApiKey === 'function') {
          const hasKey = await aistudio.hasSelectedApiKey();
          setHasApiKey(hasKey);
        }
      } catch (e) {
        console.warn("Key check failed during app mount:", e);
      } finally {
        setIsReady(true);
      }
    };
    checkKey();
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
        title: "오류 발생",
        message: msg,
        suggestion: "잠시 후 다시 시도하거나 프롬프트를 수정해 주세요."
      };

      if (msg.includes('403') || msg.includes('permission')) {
        details = {
          code: '403',
          title: '결제/권한 오류',
          message: '유효한 유료 API 키가 아니거나 결제 정보가 누락되었습니다.',
          suggestion: '보안 센터에서 연결 상태를 다시 확인해 주세요.'
        };
      } else if (msg.includes('429')) {
        details = { code: '429', title: '할당량 초과', message: '너무 많은 요청을 보냈습니다.', suggestion: '잠시 후 다시 시도해 주세요.' };
      } else if (msg.includes('SAFETY')) {
        details = { code: 'Safety', title: '정책 차단', message: '안전 가이드라인에 의해 생성이 차단되었습니다.', suggestion: '민감한 표현을 제거하고 다시 시도하세요.' };
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
        prompt: config.prompt || (activeRefs.length > 0 ? "Edit Session" : "Untitled"),
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

  // Skip rendering until initial check is done
  if (!isReady) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-banana-500/20 border-t-banana-500 rounded-full animate-spin"></div></div>;

  if (!hasApiKey) return <ApiKeyGate onKeySelected={handleKeySelected} />;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Controls Sidebar */}
          <div className="w-full lg:w-1/3 flex-shrink-0">
            <div className="lg:sticky lg:top-24">
              <Controls 
                config={config} 
                isGenerating={isGenerating} 
                onChange={handleConfigChange} 
                onSubmit={handleGenerate} 
                hasHistory={generatedImages.length > 0} 
                onEditReference={setEditingReferenceId} 
              />
              
              {error && (
                <div className="mt-4 p-4 bg-red-950/30 border border-red-500/20 rounded-2xl flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-red-400 font-bold">
                    <AlertTriangle className="w-4 h-4" /> <span>{error.title}</span>
                  </div>
                  <p className="text-red-300/80 text-xs leading-relaxed">{error.message}</p>
                  {error.suggestion && <p className="text-[10px] text-red-400 italic">💡 {error.suggestion}</p>}
                </div>
              )}
              
              <button 
                onClick={() => setIsKeyManagerOpen(true)}
                className="w-full mt-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-500 hover:text-banana-400 hover:border-banana-500/30 transition-all font-bold uppercase tracking-widest"
              >
                API 보안 설정 관리
              </button>
            </div>
          </div>

          {/* Results Area */}
          <div className="w-full lg:w-2/3 space-y-8">
            {isGenerating && (
              <div className="w-full h-96 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center gap-6 animate-pulse">
                <div className="relative">
                  <div className="absolute inset-0 bg-banana-500/20 blur-xl rounded-full"></div>
                  <div className="w-16 h-16 border-4 border-banana-500 border-t-transparent rounded-full animate-spin relative z-10"></div>
                </div>
                <div className="text-center space-y-2">
                   <p className="text-banana-500 font-black text-xl tracking-tight">작품을 굽는 중...</p>
                   <p className="text-slate-500 text-xs uppercase font-bold tracking-widest">Nano Banana Pro rendering</p>
                </div>
              </div>
            )}

            {generatedImages.length > 0 ? (
              <div className="grid grid-cols-1 gap-8">
                {generatedImages.map(img => (
                  <ImageCard key={img.id} image={img} onClick={() => setSelectedImage(img)} />
                ))}
              </div>
            ) : !isGenerating && (
              <div className="h-96 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/10">
                <p className="text-lg font-bold mb-1">갤러리가 비어 있습니다</p>
                <p className="text-sm opacity-50 mb-6">창의적인 아이디어를 입력해 보세요</p>
                <button 
                  onClick={() => fileInputImportRef.current?.click()} 
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl flex items-center gap-2 transition-all border border-slate-700"
                >
                  <Upload className="w-4 h-4" /> 내 이미지 가져오기
                </button>
              </div>
            )}
            <input type="file" ref={fileInputImportRef} onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const base64 = ev.target?.result as string;
                  setGeneratedImages(prev => [{
                    id: Date.now().toString(), url: base64, prompt: "Imported",
                    aspectRatio: AspectRatio.SQUARE, size: ImageSize.RES_1K, createdAt: Date.now()
                  }, ...prev]);
                };
                reader.readAsDataURL(file);
              }
            }} className="hidden" accept="image/*" />
          </div>
        </div>
      </main>

      {selectedImage && (
        <ImageModal 
          image={selectedImage} 
          onClose={() => setSelectedImage(null)} 
          onUpdateImage={(id, up) => setGeneratedImages(p => p.map(i => i.id === id ? {...i, ...up} : i))}
          onAddReference={(url) => setConfig(p => ({...p, referenceImages: [...p.referenceImages, {id:Date.now().toString(), url, isEnabled:true, name:'From History'}]}))}
          onGenerateCharacterSheet={() => {}} // 구현 예정
          onRemixImage={() => {}} // 구현 예정
          onPromptEdit={() => {}} // 구현 예정
        />
      )}
      
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
