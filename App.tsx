
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ApiKeyGate } from './components/ApiKeyGate';
import { Header } from './components/Header';
import { Controls } from './components/Controls';
import { ImageCard } from './components/ImageCard';
import { ImageModal } from './components/ImageModal';
import { KeyManagerModal } from './components/KeyManagerModal';
import { generateImage, generateCharacterSheet, editImageWithPrompt, changePoseWithSketch } from './services/geminiService';
import { AspectRatio, ImageSize, GenerationConfig, GeneratedImage, SubjectPose, CameraAngle, ReferenceImageItem, CameraType } from './types';
import { AlertTriangle, Upload, Settings } from 'lucide-react';

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
    const checkAuth = async () => {
      // 1. 이미 환경변수(localStorage 폴리필 포함)가 설정되어 있는지 확인
      if (process.env.API_KEY && process.env.API_KEY !== 'undefined') {
        setHasApiKey(true);
      } else {
        // 2. 플랫폼 API 확인
        try {
          const aistudio = (window as any).aistudio;
          if (aistudio && typeof aistudio.hasSelectedApiKey === 'function') {
            const hasKey = await aistudio.hasSelectedApiKey();
            setHasApiKey(hasKey);
          }
        } catch (e) {
          console.warn("Auth check failed", e);
        }
      }
      setIsReady(true);
    };
    checkAuth();
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
        title: "이미지 생성 실패",
        message: msg,
        suggestion: "프롬프트를 수정하거나 잠시 후 다시 시도해 주세요."
      };

      if (msg.includes('403') || msg.includes('permission') || msg.includes('entity was not found')) {
        setHasApiKey(false); // 키 문제 발생 시 다시 게이트웨이로
        details = {
          code: '403',
          title: '결제/인증 오류',
          message: '연결된 API 키가 유효하지 않거나 유료 티어 결제가 필요합니다.',
          suggestion: 'API 키 설정을 눌러 키를 다시 확인해 주세요.'
        };
      } else if (msg.includes('429')) {
        details = { code: '429', title: '사용량 초과', message: 'API 호출 한도를 초과했습니다.', suggestion: '유료 티어 한도를 확인하거나 잠시 기다려 주세요.' };
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
        prompt: config.prompt || "Generated Artwork",
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

  if (!isReady) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-10 h-10 border-2 border-banana-500 border-t-transparent rounded-full animate-spin"></div></div>;

  if (!hasApiKey) return <ApiKeyGate onKeySelected={handleKeySelected} />;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-1/3 flex-shrink-0">
            <div className="lg:sticky lg:top-24 space-y-4">
              <Controls 
                config={config} 
                isGenerating={isGenerating} 
                onChange={handleConfigChange} 
                onSubmit={handleGenerate} 
                hasHistory={generatedImages.length > 0} 
                onEditReference={setEditingReferenceId} 
              />
              
              {error && (
                <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-2xl flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-red-400 font-bold">
                    <AlertTriangle className="w-4 h-4" /> <span>{error.title}</span>
                  </div>
                  <p className="text-red-300/80 text-xs leading-relaxed">{error.message}</p>
                </div>
              )}
              
              <button 
                onClick={() => setIsKeyManagerOpen(true)}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl text-[10px] text-slate-500 hover:text-white transition-all font-black uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <Settings className="w-3 h-3" /> API 키 설정 관리 (External)
              </button>
            </div>
          </div>

          <div className="w-full lg:w-2/3 space-y-8">
            {isGenerating && (
              <div className="w-full h-96 rounded-[3rem] bg-slate-900/50 border border-slate-800 flex flex-col items-center justify-center gap-6 animate-pulse">
                <div className="w-16 h-16 border-4 border-banana-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-banana-500 font-black text-xl tracking-tight">이미지를 생성하고 있습니다...</p>
              </div>
            )}

            {generatedImages.length > 0 ? (
              <div className="grid grid-cols-1 gap-10">
                {generatedImages.map(img => (
                  <ImageCard key={img.id} image={img} onClick={() => setSelectedImage(img)} />
                ))}
              </div>
            ) : !isGenerating && (
              <div className="h-96 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-[3rem] bg-slate-900/10">
                <p className="text-lg font-bold mb-1 text-slate-400">갤러리가 비어 있습니다</p>
                <p className="text-sm opacity-50 mb-6">아이디어를 입력하여 시작해 보세요</p>
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
                    id: Date.now().toString(), url: base64, prompt: "불러온 이미지",
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
          onAddReference={(url) => setConfig(p => ({...p, referenceImages: [...p.referenceImages, {id:Date.now().toString(), url, isEnabled:true, name:'Reference'}]}))}
          onGenerateCharacterSheet={() => {}} 
          onRemixImage={() => {}} 
          onPromptEdit={() => {}} 
        />
      )}
      
      {isKeyManagerOpen && (
        <KeyManagerModal 
          onClose={() => setIsKeyManagerOpen(false)} 
          onKeyChange={() => setHasApiKey(!!process.env.API_KEY)} 
        />
      )}
    </div>
  );
};

export default App;
