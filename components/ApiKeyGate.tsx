
import React, { useEffect, useState } from 'react';
import { Lock, ExternalLink, Zap, ShieldCheck, CreditCard } from 'lucide-react';

interface ApiKeyGateProps {
  onKeySelected: () => void;
}

export const ApiKeyGate: React.FC<ApiKeyGateProps> = ({ onKeySelected }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkKey = async () => {
      try {
        // 플랫폼의 외장 키 관리 시스템 확인
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
      // 사용자의 로컬 환경에 암호화된 키를 저장하는 플랫폼 다이얼로그 호출
      await (window as any).aistudio.openSelectKey();
      // 레이스 컨디션 방지를 위해 즉시 성공으로 간주하고 앱 진입
      onKeySelected();
    } catch (e) {
      console.error("Failed to select API key", e);
      alert("API 키 선택 창을 열 수 없습니다.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 bg-banana-500/20 border-2 border-banana-500/50 rounded-full border-t-transparent animate-spin"></div>
          <p className="font-medium tracking-widest text-xs uppercase">Security Handshake...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black p-6">
      <div className="max-w-md w-full bg-slate-900/40 backdrop-blur-2xl border border-slate-800 rounded-3xl p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute -inset-4 bg-banana-500/20 blur-xl rounded-full animate-pulse"></div>
            <div className="relative p-5 bg-slate-950 rounded-2xl border border-banana-500/30">
              <Zap className="w-10 h-10 text-banana-500" />
            </div>
          </div>
        </div>
        
        <h1 className="text-3xl font-black text-center text-white mb-3 tracking-tight">
          Nano Banana <span className="text-banana-400 font-normal italic">Pro</span>
        </h1>
        <p className="text-center text-slate-400 text-sm mb-10 leading-relaxed">
          이 앱은 고성능 Gemini 3 Pro 모델을 사용합니다.<br/>
          사용을 위해 본인의 유료 API 키 연결이 필요합니다.
        </p>

        <div className="space-y-4">
          <button
            onClick={handleSelectKey}
            className="w-full py-4 px-6 bg-gradient-to-r from-banana-500 to-banana-600 hover:from-banana-400 hover:to-banana-500 text-slate-950 font-black rounded-2xl transition-all transform active:scale-95 shadow-lg shadow-banana-500/20 flex items-center justify-center gap-3"
          >
            <Lock className="w-5 h-5" />
            본인 API 키 연결하기
          </button>
          
          <div className="grid grid-cols-2 gap-3 pt-2">
             <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 flex flex-col items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                <span className="text-[10px] text-slate-500 font-bold uppercase">암호화 저장</span>
             </div>
             <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 flex flex-col items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-500" />
                <span className="text-[10px] text-slate-500 font-bold uppercase">유료 계정 필요</span>
             </div>
          </div>
          
          <div className="text-[11px] text-center text-slate-500 mt-8 space-y-3">
            <p className="opacity-60">연결된 키는 사용자 로컬 환경에만 저장되며 외부로 유출되지 않습니다.</p>
            <div className="flex justify-center gap-4">
                <a 
                  href="https://ai.google.dev/gemini-api/docs/billing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-banana-500 hover:text-banana-400 transition-colors underline underline-offset-4"
                >
                  결제 설정 가이드 <ExternalLink className="w-3 h-3" />
                </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
