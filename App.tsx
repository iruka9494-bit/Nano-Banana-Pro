
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ApiKeyGate } from './components/ApiKeyGate';
import { Header } from './components/Header';
import { Controls } from './components/Controls';
import { ImageCard } from './components/ImageCard';
import { ImageModal } from './components/ImageModal';
import { KeyManagerModal } from './components/KeyManagerModal';
import { generateImage, generateCharacterSheet, editImageWithPrompt, changePoseWithSketch } from './services/geminiService';
import { AspectRatio, ImageSize, GenerationConfig, GeneratedImage, SubjectPose, CameraAngle, CameraType } from './types';
import { AlertTriangle, Upload, RefreshCw } from 'lucide-react';

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
    const initializeApp = async () => {
      try {
        // 1. 환경 변수에 이미 키가 있는지 우선 확인
        if (process.env.API_KEY && process.env.API_KEY !== "undefined") {
          setHasApiKey(true);
          setIsReady(true);
          return;
        }

        // 2. 플랫폼 API 확인
        const aistudio = (window as any).aistudio;
        if (aistudio && typeof aistudio.hasSelectedApiKey === 'function') {
          const hasKey = await aistudio.hasSelectedApiKey();
          setHasApiKey(hasKey);
        }
      } catch (e) {
        console.warn("Auth check failed, defaulting to manual entry:", e);
      } finally {
        setIsReady(true);
      }
    };
    initializeApp();
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

      if (msg.includes('403') || msg.includes('permission') || msg.includes('not found')) {
        // 유효하지 않은 키로 판명될 경우 다시 인증 게이트로
        setHasApiKey(false);
        details = {
          code: '403',
          title: '결제/인증 오류',
          message: '연결된 API 키가 유효하지 않거나 유료 티어 결제가 필요합니다.',
          suggestion: 'API 키 연결 버튼을 눌러 키를 다시 선택해 주세요.'
        };
      } else if (msg.includes('429')) {
        details = { code: '429', title: '사용량 초과', message: 'API 호출 한도를 초과했습니다.', suggestion: '유료 티어 한도를 확인하거나 잠시 기다려 주세요.' };
      } else if (msg.includes('SAFETY')) {
        details = { code: 'Safety', title: '안전 정책 필터링', message: '입력하신 내용이 안전 정책에 의해 차단되었습니다.', suggestion: '자극적인 표현을 피해 다시 작성해 보세요.' };
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
        prompt: config.prompt || (activeRefs.length > 0 ? "AI Image Edit" : "Untitled"),
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

  if (!isReady) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6">
      <div className="w-10 h-10 border-2 border-banana-500/10 border-t-banana-500 rounded-full animate-spin"></div>
      <p className="text-slate-600 text-[10px] font-black tracking-[0.4em] uppercase">Nano Banana Loading...</p>
    </div>
  );

  if (!hasApiKey) return <ApiKeyGate onKeySelected={handleKeySelected} />;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200 selection:bg-banana-500/30">
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
                <div className="p-5 bg-red-950/20 border border-red-500/20 rounded-2xl flex flex-col gap-3 animate-shake">
                  <div className="flex items-center gap-2 text-red-400 font-black text-sm uppercase">
                    <AlertTriangle className="w-4 h-4" /> <span>{error.title}</span>
                  </div>
                  <p className="text-red-300/70 text-xs leading-relaxed">{error.message}</p>
                  {error.suggestion && (
                    <div className="p-2 bg-red-500/10 rounded-lg text-[10px] text-red-400 font-bold">
                      💡 {error.suggestion}
                    </div>
                  )}
                </div>
              )}
              
              <button 
                onClick={() => setIsKeyManagerOpen(true)}
                className="w-full py-4 bg-slate-900/50 border border-slate-800 hover:border-banana-500/30 rounded-2xl text-[10px] text-slate-500 hover:text-banana-400 transition-all font-black uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <Lock className="w-3 h-3" /> API 보안 설정 관리
              </button>
            </div>
          </div>

          <div className="w-full lg:w-2/3 space-y-8">
            {isGenerating && (
              <div className="w-full h-96 rounded-[2.5rem] bg-slate-900 border border-slate-800 flex flex-col items-center justify-center gap-6 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-b from-banana-500/5 to-transparent"></div>
                <div className="relative">
                  <div className="absolute inset-0 bg-banana-500/20 blur-2xl rounded-full animate-pulse"></div>
                  <div className="w-20 h-20 border-4 border-banana-500/20 border-t-banana-500 rounded-full animate-spin relative z-10"></div>
                </div>
                <div className="text-center space-y-2 z-10">
                   <p className="text-banana-500 font-black text-2xl tracking-tight animate-pulse">마스터피스 렌더링 중...</p>
                   <p className="text-slate-500 text-[10px] uppercase font-black tracking-[0.5em]">Nano Banana Pro 4K Engine</p>
                </div>
              </div>
            )}

            {generatedImages.length > 0 ? (
              <div className="grid grid-cols-1 gap-10">
                {generatedImages.map(img => (
                  <ImageCard key={img.id} image={img} onClick={() => setSelectedImage(img)} />
                ))}
              </div>
            ) : !isGenerating && (
              <div className="h-[30rem] flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-[3rem] bg-slate-900/10 group transition-all hover:bg-slate-900/20 hover:border-slate-700">
                <div className="p-6 bg-slate-900 rounded-3xl mb-6 border border-slate-800 group-hover:scale-110 transition-transform">
                  <Upload className="w-10 h-10 text-slate-700 group-hover:text-banana-500 transition-colors" />
                </div>
                <p className="text-xl font-black text-slate-400 mb-2">갤러리가 비어 있습니다</p>
                <p className="text-sm text-slate-600 mb-8 max-w-xs text-center">왼쪽 패널에서 아이디어를 입력하거나<br/>이미지를 업로드하여 시작해 보세요.</p>
                <button 
                  onClick={() => fileInputImportRef.current?.click()} 
                  className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl flex items-center gap-3 transition-all border border-slate-700 hover:shadow-2xl"
                >
                  <Upload className="w-5 h-5" /> 내 이미지 가져오기
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
          onAddReference={(url) => setConfig(p => ({...p, referenceImages: [...p.referenceImages, {id:Date.now().toString(), url, isEnabled:true, name:'History Ref'}]}))}
          onGenerateCharacterSheet={() => {}} 
          onRemixImage={() => {}} 
          onPromptEdit={() => {}} 
        />
      )}
      
      {isKeyManagerOpen && (
        <KeyManagerModal 
          onClose={() => setIsKeyManagerOpen(false)} 
          onKeyChange={() => setHasApiKey(true)} 
        />
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};

export default App;
