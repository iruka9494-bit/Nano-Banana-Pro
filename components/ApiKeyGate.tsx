
import React, { useEffect, useState } from 'react';
import { Lock, ExternalLink, Zap } from 'lucide-react';

interface ApiKeyGateProps {
  onKeySelected: () => void;
}

export const ApiKeyGate: React.FC<ApiKeyGateProps> = ({ onKeySelected }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkKey = async () => {
      try {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (hasKey) {
          onKeySelected();
        }
      } catch (e) {
        console.error("Failed to check API key status", e);
      } finally {
        setIsLoading(false);
      }
    };
    checkKey();
  }, [onKeySelected]);

  const handleSelectKey = async () => {
    try {
      await (window as any).aistudio.openSelectKey();
      // Assume success per instructions and mitigate race condition
      onKeySelected();
    } catch (e) {
      console.error("Failed to select API key", e);
      alert("API 키를 선택하는 중 문제가 발생했습니다. 다시 시도해 주세요.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 bg-slate-800 rounded-full"></div>
          <p>접근 권한 확인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black p-6">
      <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-banana-500/10 rounded-full border border-banana-500/20">
            <Zap className="w-10 h-10 text-banana-500" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-center text-white mb-2">
          Nano Banana Pro
        </h1>
        <p className="text-center text-slate-400 mb-8">
          Gemini 3 Pro Image 생성 기능을 잠금 해제하세요. 최신 AI 모델로 놀라운 4K 이미지를 만들어보세요.
        </p>

        <div className="space-y-4">
          <button
            onClick={handleSelectKey}
            className="w-full py-4 px-6 bg-gradient-to-r from-banana-500 to-banana-600 hover:from-banana-400 hover:to-banana-500 text-slate-950 font-bold rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-banana-500/20 flex items-center justify-center gap-2"
          >
            <Lock className="w-5 h-5" />
            API 키 연결하기
          </button>
          
          <div className="text-xs text-center text-slate-500 mt-6">
            <p className="mb-2">이 모델은 유료 Google Cloud 프로젝트 API 키가 필요합니다.</p>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-banana-500 hover:text-banana-400 transition-colors"
            >
              결제 관련 문서 <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
