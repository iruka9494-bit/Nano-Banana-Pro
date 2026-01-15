
import React, { useEffect, useState } from 'react';
import { Lock, ExternalLink, Zap, ShieldCheck, CreditCard, AlertCircle, RefreshCcw, Info } from 'lucide-react';

interface ApiKeyGateProps {
  onKeySelected: () => void;
}

export const ApiKeyGate: React.FC<ApiKeyGateProps> = ({ onKeySelected }) => {
  const [status, setStatus] = useState<'loading' | 'no-platform' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      try {
        // window.aistudio 객체 존재 여부를 매우 안전하게 확인
        const aistudio = (window as any).aistudio;
        
        if (!aistudio || typeof aistudio.hasSelectedApiKey !== 'function') {
          // 일반 브라우저 환경 (Vercel/GitHub 직접 접속 등)
          setStatus('no-platform');
          return;
        }

        const hasKey = await aistudio.hasSelectedApiKey();
        if (hasKey) {
          onKeySelected();
        } else {
          setStatus('ready');
        }
      } catch (e) {
        console.error("API Key check error:", e);
        setStatus('error');
        setErrorMessage("인증 시스템 통신 중 오류가 발생했습니다.");
      }
    };
    
    // 약간의 지연을 주어 플랫폼 주입 시간을 확보
    const timer = setTimeout(checkKey, 500);
    return () => clearTimeout(timer);
  }, [onKeySelected]);

  const handleSelectKey = async () => {
    try {
      const aistudio = (window as any).aistudio;
      if (aistudio && typeof aistudio.openSelectKey === 'function') {
        await aistudio.openSelectKey();
        onKeySelected();
      }
    } catch (e) {
      console.error("Failed to open key selector:", e);
      alert("API 키 선택 창을 실행할 수 없습니다.");
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="h-16 w-16 border-4 border-banana-500/20 border-t-banana-500 rounded-full animate-spin"></div>
            <ShieldCheck className="absolute inset-0 m-auto w-6 h-6 text-banana-500 animate-pulse" />
          </div>
          <div className="text-center">
            <p className="font-bold tracking-widest text-xs uppercase text-white mb-1">Security Check</p>
            <p className="text-[10px] opacity-50">플랫폼 인증 모듈을 로드하고 있습니다...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black p-6">
      <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-3xl border border-slate-800 rounded-[2.5rem] p-10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)]">
        <div className="flex justify-center mb-10">
          <div className="relative">
            <div className="absolute -inset-6 bg-banana-500/20 blur-2xl rounded-full animate-pulse"></div>
            <div className="relative p-6 bg-slate-950 rounded-3xl border border-banana-500/30 shadow-inner">
              {status === 'no-platform' ? (
                <AlertCircle className="w-10 h-10 text-orange-400" />
              ) : (
                <Zap className="w-10 h-10 text-banana-500" />
              )}
            </div>
          </div>
        </div>
        
        <h1 className="text-3xl font-black text-center text-white mb-2 tracking-tight">
          Nano Banana <span className="text-banana-400 font-normal italic">Pro</span>
        </h1>
        
        {status === 'no-platform' ? (
          <div className="text-center space-y-6">
            <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl">
              <p className="text-orange-200 text-sm font-bold flex items-center justify-center gap-2 mb-2">
                <Info className="w-4 h-4" /> 외부 접속 감지됨
              </p>
              <p className="text-slate-400 text-xs leading-relaxed">
                현재 일반 브라우저 환경에서 접속하셨습니다.<br/>
                <b>외장 API 키 관리 기능</b>을 사용하려면 이 앱을 반드시 <b>Google AI Studio</b> 플랫폼 내에서 실행해야 합니다.
              </p>
            </div>
            
            <div className="pt-4 space-y-3">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">해결 방법</p>
              <ul className="text-xs text-left text-slate-400 space-y-2 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                <li className="flex gap-2"><span>1.</span> <span>Google AI Studio에 로그인합니다.</span></li>
                <li className="flex gap-2"><span>2.</span> <span>이 앱의 배포 URL을 'App' 섹션에 등록합니다.</span></li>
                <li className="flex gap-2"><span>3.</span> <span>플랫폼 내부에서 제공하는 보안 키 셀렉터를 통해 본인의 유료 API 키를 안전하게 연결하세요.</span></li>
              </ul>
            </div>

            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" /> 시스템 다시 확인
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <p className="text-center text-slate-300 text-sm leading-relaxed px-2">
              이 앱은 유료 티어의 고성능 모델을 사용합니다.<br/>
              <b>플랫폼 보안 시스템</b>을 통해 본인의 API 키를 연결해 주세요.
            </p>

            <div className="space-y-4">
              <button
                onClick={handleSelectKey}
                className="w-full py-5 px-6 bg-gradient-to-r from-banana-500 to-banana-600 hover:from-banana-400 hover:to-banana-500 text-slate-950 font-black rounded-2xl transition-all transform active:scale-95 shadow-xl shadow-banana-500/20 flex items-center justify-center gap-3"
              >
                <Lock className="w-5 h-5" />
                보안 API 키 연결하기
              </button>
              
              <div className="grid grid-cols-2 gap-3">
                 <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 flex flex-col items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">로컬 암호화</span>
                 </div>
                 <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 flex flex-col items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-500" />
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">유료 키 전용</span>
                 </div>
              </div>
            </div>
            
            <div className="text-[11px] text-center text-slate-500 pt-4 border-t border-slate-800/50 space-y-4">
              <p className="opacity-70 leading-relaxed">
                키는 플랫폼 계정의 보안 영역에만 저장되며<br/>
                서버나 제3자에게 절대로 공유되지 않습니다.
              </p>
              <a 
                href="https://ai.google.dev/gemini-api/docs/billing" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-banana-500 hover:text-banana-400 font-bold transition-colors underline underline-offset-4"
              >
                결제 및 할당량 확인 <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
