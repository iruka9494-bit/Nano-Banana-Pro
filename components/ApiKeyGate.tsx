
import React, { useState, useEffect } from 'react';
import { Lock, Zap, ShieldCheck, CreditCard, ExternalLink, AlertCircle } from 'lucide-react';

interface ApiKeyGateProps {
  onKeySelected: () => void;
}

export const ApiKeyGate: React.FC<ApiKeyGateProps> = ({ onKeySelected }) => {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // 1초 후 로딩 상태 해제 (플랫폼 주입 시간을 충분히 기다림)
    const timer = setTimeout(() => {
      setIsInitializing(false);
      
      // 혹시 이미 키가 선택되어 있는지 체크
      const aistudio = (window as any).aistudio;
      if (aistudio && typeof aistudio.hasSelectedApiKey === 'function') {
        aistudio.hasSelectedApiKey().then((hasKey: boolean) => {
          if (hasKey) onKeySelected();
        }).catch(console.error);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [onKeySelected]);

  const handleSelectKey = async () => {
    try {
      const aistudio = (window as any).aistudio;
      if (aistudio && typeof aistudio.openSelectKey === 'function') {
        await aistudio.openSelectKey();
        onKeySelected();
      } else {
        alert("API 키 관리 시스템을 호출할 수 없습니다. Google AI Studio 플랫폼 내부에서 실행 중인지 확인해 주세요.");
      }
    } catch (e) {
      console.error("Failed to open key selector:", e);
      alert("API 키 선택 창을 열 수 없습니다.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 selection:bg-banana-500/30">
      <div className="max-w-md w-full bg-slate-900/80 backdrop-blur-3xl border border-slate-800 rounded-[2.5rem] p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)]">
        {/* Logo Section */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute -inset-4 bg-banana-500/20 blur-2xl rounded-full animate-pulse"></div>
            <div className="relative p-5 bg-slate-950 rounded-3xl border border-banana-500/20">
              <Zap className={`w-10 h-10 ${isInitializing ? 'text-slate-700' : 'text-banana-500'} transition-colors duration-1000`} />
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

        {isInitializing ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="h-1 w-24 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-banana-500 w-1/2 animate-[progress_1.5s_infinite_linear]"></div>
            </div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">인증 시스템 확인 중</p>
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
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">유료 계정</span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-10 pt-6 border-t border-slate-800/50 text-center space-y-4">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            연결된 키는 사용자의 로컬 보안 영역에만 저장되며<br />
            외부 서버로 절대로 전송되지 않습니다.
          </p>
          <div className="flex justify-center gap-5">
            <a
              href="https://ai.google.dev/gemini-api/docs/billing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-banana-500 hover:text-banana-400 font-bold flex items-center gap-1 underline underline-offset-4"
            >
              결제 설정 안내 <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};
