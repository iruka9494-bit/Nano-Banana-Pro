
import React, { useState, useEffect } from 'react';
import { Lock, Zap, ShieldCheck, CreditCard, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react';

interface ApiKeyGateProps {
  onKeySelected: () => void;
}

export const ApiKeyGate: React.FC<ApiKeyGateProps> = ({ onKeySelected }) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [platformDetected, setPlatformDetected] = useState(false);

  useEffect(() => {
    const checkPlatform = async () => {
      // 플랫폼 주입을 잠시 기다림
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        setPlatformDetected(true);
        try {
          const hasKey = await aistudio.hasSelectedApiKey();
          if (hasKey) {
            onKeySelected();
          }
        } catch (e) {
          console.error("Key check error:", e);
        }
      }
      setIsInitializing(false);
    };
    checkPlatform();
  }, [onKeySelected]);

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio && typeof aistudio.openSelectKey === 'function') {
      try {
        await aistudio.openSelectKey();
        // 선택 후 즉시 성공으로 가정하고 진행 (레이스 컨디션 방지)
        onKeySelected();
      } catch (e) {
        alert("API 키 선택 창을 열 수 없습니다.");
      }
    } else {
      alert("이 앱은 Google AI Studio 플랫폼 내에서 실행되어야 API 키 관리 기능을 사용할 수 있습니다.");
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-banana-500/20 border-t-banana-500 rounded-full animate-spin"></div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">Initializing System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black p-6">
      <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-2xl border border-slate-800 rounded-[2.5rem] p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)]">
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute -inset-4 bg-banana-500/20 blur-2xl rounded-full animate-pulse"></div>
            <div className="relative p-5 bg-slate-950 rounded-3xl border border-banana-500/20">
              <Zap className="w-10 h-10 text-banana-500" />
            </div>
          </div>
        </div>

        <div className="text-center space-y-3 mb-10">
          <h1 className="text-3xl font-black text-white tracking-tighter">
            Nano Banana <span className="text-banana-400 italic font-normal">Pro</span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            고성능 이미지 생성을 위해<br />
            본인의 <b>유료 API 키</b> 연결이 필요합니다.
          </p>
        </div>

        {!platformDetected ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 mb-6 text-center">
            <div className="flex justify-center mb-2">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-red-200 text-xs font-bold mb-1">플랫폼 외부 접속 감지</p>
            <p className="text-slate-400 text-[10px] leading-relaxed">
              이 앱은 Google AI Studio 환경 내에서만<br />
              API 키 보안 관리 기능을 지원합니다.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 flex items-center justify-center gap-2 w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> 새로고침하여 다시 확인
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={handleSelectKey}
              className="w-full py-5 px-6 bg-gradient-to-r from-banana-500 to-banana-600 hover:from-banana-400 hover:to-banana-500 text-slate-950 font-black rounded-2xl transition-all transform active:scale-[0.97] shadow-xl shadow-banana-500/20 flex items-center justify-center gap-3 group"
            >
              <Lock className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              API 키 연결하기
            </button>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950/50 border border-slate-800/50 rounded-2xl p-4 flex flex-col items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">보안 연결</span>
              </div>
              <div className="bg-slate-950/50 border border-slate-800/50 rounded-2xl p-4 flex flex-col items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-blue-500" />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">유료 전용</span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-10 pt-6 border-t border-slate-800/50 text-center space-y-4">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            연결된 키는 브라우저의 보안 영역에만 저장되며<br />
            서버나 제3자에게 절대로 전송되지 않습니다.
          </p>
          <a
            href="https://ai.google.dev/gemini-api/docs/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-banana-500 hover:text-banana-400 font-bold flex items-center justify-center gap-1 underline underline-offset-4"
          >
            결제 설정 안내 <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
