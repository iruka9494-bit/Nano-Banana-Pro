

import React, { useState, useCallback, useRef } from 'react';
import { ApiKeyGate } from './components/ApiKeyGate';
import { Header } from './components/Header';
import { Controls } from './components/Controls';
import { ImageCard } from './components/ImageCard';
import { ImageModal } from './components/ImageModal';
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

  const handleKeySelected = useCallback(() => {
    setHasApiKey(true);
  }, []);

  const handleConfigChange = (key: keyof GenerationConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleError = (e: any) => {
      // Safely extract message from potential JSON object or Error instance
      let msg = "";
      if (typeof e === 'string') {
        msg = e;
      } else if (e.message) {
        msg = e.message;
      } else if (e.error && e.error.message) {
        // Handle { error: { code: 503, message: ... } } structure
        msg = e.error.message;
      } else {
        msg = JSON.stringify(e);
      }

      let details: ErrorDetails = {
        title: "오류가 발생했습니다",
        message: msg,
        suggestion: "잠시 후 다시 시도해 주세요."
      };

      if (msg.includes('403') || msg.includes('permission')) {
        details = {
          code: '403 Forbidden',
          title: '권한 오류',
          message: 'API 키가 유효하지 않거나 해당 프로젝트에 접근 권한이 없습니다.',
          suggestion: '결제 계정이 연결된 프로젝트의 API 키인지 확인해 주세요. (무료 티어 사용 불가)'
        };
      } else if (msg.includes('Deadline expired') || msg.includes('503') || msg.includes('UNAVAILABLE')) {
        details = {
            code: '503 Timeout',
            title: '생성 시간 초과',
            message: '서버 응답 시간이 초과되었습니다. 요청이 많거나 모델 처리 속도가 지연되고 있습니다.',
            suggestion: '자동으로 3회 재시도했으나 실패했습니다. 잠시 후 다시 시도해 주세요.'
        };
      } else if (msg.includes('429') || msg.includes('quota')) {
        details = {
          code: '429 Too Many Requests',
          title: '사용량 초과',
          message: '단시간에 너무 많은 요청을 보냈습니다. 할당량이 초과되었을 수 있습니다.',
          suggestion: '잠시 기다린 후 다시 시도해 주세요.'
        };
      } else if (msg.includes('500') || msg.includes('internal')) {
        details = {
          code: '500 Server Error',
          title: '서버 오류',
          message: 'Google AI 서버에 일시적인 문제가 발생했습니다.',
          suggestion: '잠시 후 다시 시도해 주세요.'
        };
      } else if (msg.includes('PROHIBITED_CONTENT')) {
        details = {
          code: 'Prohibited Content',
          title: '콘텐츠 정책 위반',
          message: '요청하신 내용은 Google AI 정책(예: 실존 인물, 어린이, 저작권, 특정 폭력적 묘사 등)에 의해 생성할 수 없습니다.',
          suggestion: '실존 인물의 이름을 제외하거나, 보다 일반적인 묘사로 변경해 주세요.'
        };
      } else if (msg.includes('IMAGE_OTHER')) {
        details = {
          code: 'Image Generation Error',
          title: '이미지 생성 중단',
          message: '모델이 이미지를 생성하는 도중 알 수 없는 이유로 중단되었습니다. (IMAGE_OTHER)',
          suggestion: '일시적인 모델 오류이거나 프롬프트가 복잡할 수 있습니다. 프롬프트를 조금 단순하게 수정하거나 다시 시도해 주세요.'
        };
      } else if (msg.includes('SAFETY') || msg.includes('blocked') || msg.includes('finishReason')) {
        details = {
          code: 'Safety Block',
          title: '안전 정책 차단',
          message: '생성하려는 이미지가 안전 정책에 위배되어 차단되었습니다.',
          suggestion: '프롬프트를 수정하여 선정적이거나 폭력적인 내용을 제외해 주세요.'
        };
      } else if (msg.includes('Model Response:')) {
        details = {
          code: 'Model Refusal',
          title: '모델 응답',
          message: msg.replace('Model Response:', '').trim(),
          suggestion: '요청하신 내용에 대해 모델이 이미지를 생성할 수 없습니다. 프롬프트를 조정해 주세요.'
        };
      } else if (msg.includes('No image data found')) {
        details = {
          code: 'Generation Failed',
          title: '이미지 생성 실패',
          message: '모델이 이미지를 반환하지 않았습니다. 안전 필터 또는 모델 오류일 수 있습니다.',
          suggestion: '다른 프롬프트로 시도해보거나 참조 이미지를 변경해 보세요.'
        };
      } else if (msg.includes('400')) {
         details = {
          code: '400 Bad Request',
          title: '잘못된 요청',
          message: '요청 내용이 올바르지 않습니다.',
          suggestion: '입력값(특히 화면 비율)을 확인해 주세요.'
        };
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
        config.prompt, 
        config.aspectRatio, 
        config.imageSize,
        config.subjectPose,
        config.cameraAngle,
        activeRefs,
        config.cameraType
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
    setSelectedImage(null); // Close modal to show gallery progress

    try {
      const base64Url = await generateCharacterSheet(sourceImage.prompt, sourceImage.url);
      
      const newImage: GeneratedImage = {
        id: Date.now().toString(),
        url: base64Url,
        prompt: `Character Sheet: ${sourceImage.prompt}`,
        aspectRatio: AspectRatio.LANDSCAPE_16_9,
        size: ImageSize.RES_2K,
        createdAt: Date.now()
      };

      setGeneratedImages(prev => [newImage, ...prev]);
    } catch (e: any) {
      handleError(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRemixImage = async (sourceImage: GeneratedImage, pose: SubjectPose, angle: CameraAngle) => {
    setIsGenerating(true);
    setError(null);
    setSelectedImage(null); 

    try {
      // Use the original image as a reference
      const base64Url = await generateImage(
        sourceImage.prompt,
        sourceImage.aspectRatio,
        sourceImage.size,
        pose,
        angle,
        [sourceImage.url]
      );
      
      const newImage: GeneratedImage = {
        id: Date.now().toString(),
        url: base64Url,
        prompt: `Remix (${pose !== 'NONE' ? pose : angle}): ${sourceImage.prompt}`,
        aspectRatio: sourceImage.aspectRatio,
        size: sourceImage.size,
        createdAt: Date.now()
      };

      setGeneratedImages(prev => [newImage, ...prev]);
    } catch (e: any) {
       handleError(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePromptEdit = async (sourceImage: GeneratedImage, instruction: string) => {
    setIsGenerating(true);
    setError(null);
    setSelectedImage(null); 

    try {
      const base64Url = await editImageWithPrompt(
        sourceImage.url,
        instruction,
        sourceImage.aspectRatio
      );
      
      const newImage: GeneratedImage = {
        id: Date.now().toString(),
        url: base64Url,
        prompt: `Edit: ${instruction}`,
        aspectRatio: sourceImage.aspectRatio,
        size: sourceImage.size,
        createdAt: Date.now()
      };

      setGeneratedImages(prev => [newImage, ...prev]);
    } catch (e: any) {
       handleError(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChangePose = async (sourceImage: GeneratedImage, sketchUrl: string, prompt: string) => {
    setIsGenerating(true);
    setError(null);
    setSelectedImage(null); 

    try {
      const base64Url = await changePoseWithSketch(
        sourceImage.url,
        sketchUrl,
        prompt,
        sourceImage.aspectRatio
      );
      
      const newImage: GeneratedImage = {
        id: Date.now().toString(),
        url: base64Url,
        prompt: `Pose Change: ${prompt || 'Sketch Based'}`,
        aspectRatio: sourceImage.aspectRatio,
        size: sourceImage.size,
        createdAt: Date.now()
      };

      setGeneratedImages(prev => [newImage, ...prev]);
    } catch (e: any) {
       handleError(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateImage = (id: string, updates: Partial<GeneratedImage>) => {
    // Check if we are updating a reference image
    if (editingReferenceId && editingReferenceId === id) {
       if (updates.url) {
         setConfig(prev => ({
           ...prev,
           referenceImages: prev.referenceImages.map(ref => 
             ref.id === id ? { ...ref, url: updates.url! } : ref
           )
         }));
       }
       return;
    }

    setGeneratedImages(prev => prev.map(img => 
      img.id === id ? { ...img, ...updates } : img
    ));
    if (selectedImage && selectedImage.id === id) {
      setSelectedImage(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleAddReference = (url: string) => {
    if (config.referenceImages.length >= 20) {
      alert("참조 이미지는 최대 20장까지만 추가할 수 있습니다.");
      return;
    }
    const newRef: ReferenceImageItem = {
      id: Date.now().toString(),
      url: url,
      isEnabled: true,
      name: `Ref ${config.referenceImages.length + 1}`
    };
    setConfig(prev => ({
      ...prev,
      referenceImages: [...prev.referenceImages, newRef]
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
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        
        let size = ImageSize.RES_1K;
        if (width > 3000 || height > 3000) size = ImageSize.RES_4K;
        else if (width > 1500 || height > 1500) size = ImageSize.RES_2K;

        const currentRatio = width / height;
        const supportedRatios = Object.values(AspectRatio).map(r => {
          const [w, h] = r.split(':').map(Number);
          return { value: r, ratio: w / h };
        });

        const closestRatio = supportedRatios.reduce((prev, curr) => {
          return (Math.abs(curr.ratio - currentRatio) < Math.abs(prev.ratio - currentRatio)) ? curr : prev;
        });

        const newImage: GeneratedImage = {
          id: Date.now().toString(),
          url: base64Url,
          prompt: file.name || "가져온 이미지 (Imported)",
          aspectRatio: closestRatio.value,
          size: size,
          createdAt: Date.now()
        };

        setGeneratedImages(prev => [newImage, ...prev]);
      };
      img.src = base64Url;
    };
    reader.readAsDataURL(file);
    
    if (fileInputImportRef.current) fileInputImportRef.current.value = '';
  };

  const resetFilters = () => {
    setFilterAspectRatio('ALL');
    setFilterSize('ALL');
  };

  const getAspectRatioStyle = (ratio: AspectRatio) => {
    const [w, h] = ratio.split(':').map(Number);
    return { aspectRatio: `${w} / ${h}` };
  };

  const filteredImages = generatedImages.filter(img => {
    const matchRatio = filterAspectRatio === 'ALL' || img.aspectRatio === filterAspectRatio;
    const matchSize = filterSize === 'ALL' || img.size === filterSize;
    return matchRatio && matchSize;
  });

  const hasActiveFilters = filterAspectRatio !== 'ALL' || filterSize !== 'ALL';

  // Prepare reference image for editing modal
  const getEditingReferenceImage = (): GeneratedImage | null => {
    if (!editingReferenceId) return null;
    const ref = config.referenceImages.find(r => r.id === editingReferenceId);
    if (!ref) return null;
    
    // Create a mock GeneratedImage object
    return {
      id: ref.id,
      url: ref.url,
      prompt: ref.name || "Reference Image",
      aspectRatio: AspectRatio.SQUARE, // Default, will be adjusted by modal logic if possible or just fit
      size: ImageSize.RES_1K,
      createdAt: Date.now()
    };
  };

  if (!hasApiKey) {
    return <ApiKeyGate onKeySelected={handleKeySelected} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          <div className="w-full lg:w-1/3 flex-shrink-0">
            <div className="lg:sticky lg:top-24">
              <Controls 
                config={config} 
                isGenerating={isGenerating} 
                onChange={handleConfigChange}
                onSubmit={handleGenerate}
                hasHistory={generatedImages.length > 0}
                onEditReference={(id) => setEditingReferenceId(id)}
              />

              {error && (
                <div className="mt-4 p-4 bg-red-950/30 border border-red-500/30 rounded-xl flex flex-col gap-3 animate-fade-in">
                  <div className="flex items-center gap-2 text-red-400 font-bold border-b border-red-500/20 pb-2">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span>{error.title}</span>
                    {error.code && <span className="text-xs bg-red-500/20 px-2 py-0.5 rounded ml-auto font-mono">{error.code}</span>}
                  </div>
                  <p className="text-red-300 text-sm leading-relaxed">
                    {error.message}
                  </p>
                  {error.suggestion && (
                    <div className="bg-red-500/10 rounded-lg p-3 text-xs text-red-300/80 flex gap-2 items-start">
                      <span className="shrink-0">💡</span>
                      <span>{error.suggestion}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 p-4 rounded-xl bg-slate-900/30 border border-slate-800/50 text-xs text-slate-500">
                <p className="font-semibold mb-1 text-slate-400">프롬프트 작성 팁:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>조명을 묘사하세요 (예: '영화 같은', '자연광')</li>
                  <li>스타일을 지정하세요 (예: '실사풍', '유화')</li>
                  <li>디테일을 언급하세요 (예: '복잡한 질감', '4k')</li>
                  <li>이미지 수정 시: 원하는 변경 사항을 구체적으로 적어주세요.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-2/3 space-y-8">
            {isGenerating && (
               <div 
                  className="w-full rounded-2xl bg-slate-900 border border-slate-800 animate-pulse flex items-center justify-center flex-col gap-4 mb-8"
                  style={getAspectRatioStyle(config.aspectRatio)}
                >
                 <div className="w-16 h-16 border-4 border-banana-500 border-t-transparent rounded-full animate-spin"></div>
                 <p className="text-banana-500 font-medium animate-pulse">걸작을 만드는 중...</p>
               </div>
            )}

            {generatedImages.length === 0 && !isGenerating ? (
              <div className="h-96 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
                <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                  <span className="text-4xl">🎨</span>
                </div>
                <p className="text-lg font-medium text-slate-500">갤러리가 비어있습니다</p>
                <p className="text-sm mb-6">상상력을 발휘하여 이곳을 채워보세요.</p>
                
                <button 
                  onClick={() => fileInputImportRef.current?.click()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-banana-400 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors border border-slate-700 hover:border-banana-500/50"
                >
                  <Upload className="w-4 h-4" />
                  내 이미지 불러오기
                </button>
              </div>
            ) : (
              generatedImages.length > 0 && (
                <>
                  <div className="sticky top-0 z-10 -mx-2 px-2 py-2 backdrop-blur-md bg-slate-950/80 rounded-xl mb-4 border-b border-slate-800/50 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-slate-400 text-sm font-medium mr-2">
                      <Filter className="w-4 h-4" />
                      <span>필터</span>
                    </div>

                    <select 
                      value={filterAspectRatio}
                      onChange={(e) => setFilterAspectRatio(e.target.value as AspectRatio | 'ALL')}
                      className="bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-lg focus:ring-banana-500 focus:border-banana-500 block p-2 outline-none cursor-pointer"
                    >
                      <option value="ALL">모든 비율</option>
                      {Object.values(AspectRatio).map((ratio) => (
                        <option key={ratio} value={ratio}>{ratio}</option>
                      ))}
                    </select>

                    <select 
                      value={filterSize}
                      onChange={(e) => setFilterSize(e.target.value as ImageSize | 'ALL')}
                      className="bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-lg focus:ring-banana-500 focus:border-banana-500 block p-2 outline-none cursor-pointer"
                    >
                      <option value="ALL">모든 해상도</option>
                      {Object.values(ImageSize).map((size) => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>

                    {hasActiveFilters && (
                      <button 
                        onClick={resetFilters}
                        className="ml-auto text-xs flex items-center gap-1 text-slate-500 hover:text-banana-400 transition-colors px-2 py-1 rounded-md hover:bg-slate-800"
                      >
                        <X className="w-3 h-3" />
                        초기화
                      </button>
                    )}
                    
                    <div className={`flex items-center gap-2 ${hasActiveFilters ? 'ml-2' : 'ml-auto'}`}>
                       <div className="h-6 w-px bg-slate-800 mx-2 hidden sm:block"></div>
                       <button 
                        onClick={() => fileInputImportRef.current?.click()}
                        className="text-xs flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-banana-400 hover:text-banana-300 transition-colors px-3 py-2 rounded-lg font-medium border border-slate-700"
                        title="로컬 이미지 불러오기"
                      >
                        <ImagePlus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">이미지 불러오기</span>
                      </button>
                    </div>
                  </div>

                  {filteredImages.length === 0 ? (
                     <div className="py-16 flex flex-col items-center justify-center text-slate-600 border border-slate-800/50 rounded-2xl bg-slate-900/10">
                      <Filter className="w-12 h-12 mb-3 opacity-20" />
                      <p className="text-slate-500 font-medium">조건에 맞는 이미지가 없습니다.</p>
                      <button onClick={resetFilters} className="mt-3 text-banana-500 text-sm hover:underline">
                        필터 초기화
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {filteredImages.map((img) => (
                        <ImageCard 
                          key={img.id} 
                          image={img} 
                          onClick={() => setSelectedImage(img)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )
            )}
            
            <input 
              type="file" 
              ref={fileInputImportRef}
              onChange={handleImportImage}
              className="hidden" 
              accept="image/*"
            />

          </div>
        </div>
      </main>

      {/* Modal for Viewing/Editing Generated Images */}
      {selectedImage && (
        <ImageModal 
          image={selectedImage} 
          onClose={() => setSelectedImage(null)}
          onUpdateImage={handleUpdateImage}
          onAddReference={handleAddReference}
          onGenerateCharacterSheet={() => handleGenerateCharacterSheet(selectedImage)}
          onRemixImage={(pose, angle) => handleRemixImage(selectedImage, pose, angle)}
          onPromptEdit={(instruction) => handlePromptEdit(selectedImage, instruction)}
          onPoseChange={(sketchUrl, prompt) => handleChangePose(selectedImage, sketchUrl, prompt)}
        />
      )}

      {/* Modal for Editing Reference Images */}
      {editingReferenceId && (
        <ImageModal 
           image={getEditingReferenceImage()!}
           onClose={() => setEditingReferenceId(null)}
           onUpdateImage={handleUpdateImage}
           onAddReference={() => {}} 
           onGenerateCharacterSheet={() => {}} 
           onRemixImage={() => {}} 
           onPromptEdit={() => {}}
        />
      )}
    </div>
  );
};

export default App;
