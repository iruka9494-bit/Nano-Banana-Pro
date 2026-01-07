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
  
  const [filterAspectRatio, setFilterAspectRatio] = useState<AspectRatio | 'ALL'>('ALL');
  const [filterSize, setFilterSize] = useState<ImageSize | 'ALL'>('ALL');
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

  // Vercel 배포용: 로컬 스토리지에서 키 확인
  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) setHasApiKey(true);
  }, []);

  const handleKeySelected = useCallback((key: string) => {
    localStorage.setItem('gemini_api_key', key);
    setHasApiKey(true);
  }, []);

  const handleConfigChange = (key: keyof GenerationConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleError = (e: any) => {
    let msg = e.message || JSON.stringify(e);
    let details: ErrorDetails = {
      title: "오류가 발생했습니다",
      message: msg,
      suggestion: "잠시 후 다시 시도해 주세요."
    };
    if (msg.includes('403')) {
      details = { title: '인증 권한 오류', message: '유료 프로젝트 결제가 활성화되지 않은 키입니다.', suggestion: '구글 클라우드 결제 상태를 확인하세요.' };
    }
    setError(details);
  };

  // 메인 생성 함수
  const handleGenerate = async () => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (!savedKey) return;

    const activeRefs = config.referenceImages.filter(img => img.isEnabled).map(img => img.url);
    if (!config.prompt.trim() && activeRefs.length === 0) return;

    setIsGenerating(true);
    setError(null);

    try {
      const base64Url = await generateImage(
        savedKey, // 키 전달
        config.prompt, config.aspectRatio, config.imageSize,
        config.subjectPose, config.cameraAngle, activeRefs, config.cameraType
      );
      
      const newImage: GeneratedImage = {
        id: Date.now().toString(),
        url: base64Url,
        prompt: config.prompt || "Generated Image",
        aspectRatio: config.aspectRatio,
        size: config.imageSize,
        createdAt: Date.now()
      };
      setGeneratedImages(prev => [newImage, ...prev]);
    } catch (e: any) { handleError(e); } finally { setIsGenerating(false); }
  };
  
  const handleGenerateCharacterSheet = async (sourceImage: GeneratedImage) => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (!savedKey) return;
    setIsGenerating(true);
    setError(null);
    setSelectedImage(null);
    try {
      const base64Url = await generateCharacterSheet(savedKey, sourceImage.prompt, sourceImage.url);
      setGeneratedImages(prev => [{
        id: Date.now().toString(), url: base64Url, prompt: `Sheet: ${sourceImage.prompt}`,
        aspectRatio: AspectRatio.LANDSCAPE_16_9, size: ImageSize.RES_2K, createdAt: Date.now()
      }, ...prev]);
    } catch (e: any) { handleError(e); } finally { setIsGenerating(false); }
  };

  const handleRemixImage = async (sourceImage: GeneratedImage, pose: SubjectPose, angle: CameraAngle) => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (!savedKey) return;
    setIsGenerating(true);
    setError(null);
    setSelectedImage(null); 
    try {
      const base64Url = await generateImage(
        savedKey, sourceImage.prompt, sourceImage.aspectRatio, sourceImage.size,
        pose, angle, [sourceImage.url]
      );
      setGeneratedImages(prev => [{
        id: Date.now().toString(), url: base64Url, prompt: `Remix: ${sourceImage.prompt}`,
        aspectRatio: sourceImage.aspectRatio, size: sourceImage.size, createdAt: Date.now()
      }, ...prev]);
    } catch (e: any) { handleError(e); } finally { setIsGenerating(false); }
  };

  const handlePromptEdit = async (sourceImage: GeneratedImage, instruction: string) => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (!savedKey) return;
    setIsGenerating(true);
    setError(null);
    setSelectedImage(null); 
    try {
      const base64Url = await editImageWithPrompt(savedKey, sourceImage.url, instruction, sourceImage.aspectRatio);
      setGeneratedImages(prev => [{
        id: Date.now().toString(), url: base64Url, prompt: `Edit: ${instruction}`,
        aspectRatio: sourceImage.aspectRatio, size: sourceImage.size, createdAt: Date.now()
      }, ...prev]);
    } catch (e: any) { handleError(e); } finally { setIsGenerating(false); }
  };

  const handleChangePose = async (sourceImage: GeneratedImage, sketchUrl: string, prompt: string) => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (!savedKey) return;
    setIsGenerating(true);
    setError(null);
    setSelectedImage(null); 
    try {
      const base64Url = await changePoseWithSketch(savedKey, sourceImage.url, sketchUrl, prompt, sourceImage.aspectRatio);
      setGeneratedImages(prev => [{
        id: Date.now().toString(), url: base64Url, prompt: `Pose: ${prompt}`,
        aspectRatio: sourceImage.aspectRatio, size: sourceImage.size, createdAt: Date.now()
      }, ...prev]);
    } catch (e: any) { handleError(e); } finally { setIsGenerating(false); }
  };

  const handleUpdateImage = (id: string, updates: Partial<GeneratedImage>) => {
    setGeneratedImages(prev => prev.map(img => img.id === id ? { ...img, ...updates } : img));
  };

  const handleAddReference = (url: string) => {
    setConfig(prev => ({
      ...prev, referenceImages: [...prev.referenceImages, { id: Date.now().toString(), url, isEnabled: true, name: `Ref ${prev.referenceImages.length + 1}` }]
    }));
  };

  const handleImportImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      setGeneratedImages(prev => [{
        id: Date.now().toString(), url: base64Url, prompt: "Imported",
        aspectRatio: AspectRatio.SQUARE, size: ImageSize.RES_1K, createdAt: Date.now()
      }, ...prev]);
    };
    reader.readAsDataURL(files[0]);
  };

  const filteredImages = generatedImages.filter(img => (filterAspectRatio === 'ALL' || img.aspectRatio === filterAspectRatio) && (filterSize === 'ALL' || img.size === filterSize));

  if (!hasApiKey) return <ApiKeyGate onKeySelected={handleKeySelected} />;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      <Header onOpenKeyManager={() => setIsKeyManagerOpen(true)} keyStatus="connected" />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-1/3">
            <Controls config={config} isGenerating={isGenerating} onChange={handleConfigChange} onSubmit={handleGenerate} hasHistory={generatedImages.length > 0} onEditReference={setEditingReferenceId} />
            {error && <div className="mt-4 p-4 bg-red-950/30 border border-red-500/30 rounded-xl text-red-400 text-sm"><strong>{error.title}</strong><p>{error.message}</p></div>}
          </div>
          <div className="w-full lg:w-2/3">
            {isGenerating && <div className="h-96 animate-pulse bg-slate-900 rounded-2xl flex items-center justify-center text-banana-500">생성 중...</div>}
            <div className="space-y-8">{filteredImages.map(img => <ImageCard key={img.id} image={img} onClick={() => setSelectedImage(img)} />)}</div>
          </div>
        </div>
      </main>
      {selectedImage && <ImageModal image={selectedImage} onClose={() => setSelectedImage(null)} onUpdateImage={handleUpdateImage} onAddReference={handleAddReference} onGenerateCharacterSheet={() => handleGenerateCharacterSheet(selectedImage)} onRemixImage={handleRemixImage} onPromptEdit={handlePromptEdit} onPoseChange={handleChangePose} />}
      {isKeyManagerOpen && <KeyManagerModal onClose={() => setIsKeyManagerOpen(false)} onKeyChange={() => setHasApiKey(true)} />}
    </div>
  );
};

export default App;
