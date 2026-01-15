
import React, { useState, useEffect } from 'react';
import { Lock, Zap, ShieldCheck, CreditCard, ExternalLink, Info, AlertCircle } from 'lucide-react';

interface ApiKeyGateProps {
  onKeySelected: () => void;
}

export const ApiKeyGate: React.FC<ApiKeyGateProps> = ({ onKeySelected }) => {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const checkInitialAccess = async () => {
      // 1. 이미 환경변수에 API_KEY가 주입되어 있는지 확인
      if (process.env.API_KEY && process.env.API_KEY !== "undefined") {
        onKeySelected();
        return;
      }

      // 2. 플랫폼 API가 준비될 때까지 잠시 대기
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const aistudio = (window as any).aistudio;
      if (aistudio && typeof aistudio.hasSelectedApiKey === 'function') {
        try {
          const hasKey = await aistudio.hasSelectedApiKey();
          if (hasKey) {
            onKeySelected();
            return;
          }
        } catch (e) {
          console.warn("Key check failed:", e);
        }
      }
      
      setIsInitializing(false);
    };

    checkInitialAccess();
  }, [onKeySelected]);

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio && typeof aistudio.openSelectKey === 'function') {
      try {
        await aistudio.openSelectKey();
        // 키 선택 창을 성공적으로 호출했다면 즉시 앱으로 진입 시도
        onKeySelected();
      } catch (e) {
        alert("API 키 선택 창을 열 수 없습니다.");
      }
    } else {
      // 일반 브라우저에서 접속한 경우에 대한 안내
      alert("이 기능은 Google AI Studio 플랫폼 내에서 작동합니다.\n\n해결 방법:\n1. Google AI Studio에서 'New App'을 생성합니다.\n2. 현재 이 URL을 등록합니다.\n3. 플랫폼 내부에서 'Select Key' 버튼을 눌러 본인의 유료 API 키를 연결하세요.");
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute -inset-4 bg-banana-500/20 blur-xl rounded-full animate-pulse"></div>
            <div className="w-12 h-12 border-4 border-banana-500/20 border-t-banana-500 rounded-full animate-spin relative z-10"></div>
          </div>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Secure Booting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black p-6">
      <div className="max-w-md w-full bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] border-t-white/10">
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute -inset-6 bg-banana-500/20 blur-3xl rounded-full animate-pulse"></div>
            <div className="relative p-6 bg-slate-950 rounded-3xl border border-banana-500/30 shadow-inner">
              <Zap className="w-10 h-10 text-banana-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
            </div>
          </div>
        </div>

        <div className="text-center space-y-3 mb-10">
          <h1 className="text-3xl font-black text-white tracking-tighter">
            Nano Banana <span className="text-banana-400 italic font-normal">Pro</span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed px-4">
            고성능 이미지 생성을 위해 본인의 <br/>
            <span className="text-white font-bold">유료 API 보안 키</span> 연결이 필요합니다.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleSelectKey}
            className="w-full py-5 px-6 bg-gradient-to-br from-banana-400 to-banana-600 hover:from-banana-300 hover:to-banana-500 text-slate-950 font-black rounded-2xl transition-all transform active:scale-[0.97] shadow-[0_20px_40px_-12px_rgba(234,179,8,0.3)] flex items-center justify-center gap-3 group"
          >
            <Lock className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            보안 API 키 연결하기
          </button>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">보안 터널</span>
            </div>
            <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">유료 전용</span>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-white/5 text-center space-y-5">
          <div className="flex items-start gap-3 text-left bg-slate-950/50 p-4 rounded-xl border border-white/5">
            <Info className="w-4 h-4 text-banana-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-500 leading-relaxed">
              본인의 API 키는 브라우저의 보안 영역에만 저장되며, 앱 제작자나 외부 서버로 절대로 전송되지 않습니다. 안심하고 본인의 키를 연결해 사용하세요.
            </p>
          </div>
          
          <div className="flex flex-col gap-2">
            <a
              href="https://ai.google.dev/gemini-api/docs/billing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-banana-500 hover:text-banana-400 font-bold flex items-center justify-center gap-1.5 transition-colors underline underline-offset-4"
            >
              결제 설정 및 키 생성 가이드 <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
