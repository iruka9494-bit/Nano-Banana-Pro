
import React, { useEffect, useState } from 'react';
import { Lock, ExternalLink, Zap, Globe, Key } from 'lucide-react';
import { KeyManagerModal } from './KeyManagerModal';
import { getSafeApiKey } from '../services/geminiService';

interface ApiKeyGateProps {
  onKeySelected: () => void;
}

export const ApiKeyGate: React.FC<ApiKeyGateProps> = ({ onKeySelected }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isExternal, setIsExternal] = useState(false);
  const [showExternalModal, setShowExternalModal] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      try {
        // 1. 안전하게 환경변수/로컬스토리지 확인
        const envKey = getSafeApiKey();

        if (envKey && envKey !== 'undefined' && envKey.length > 0) {
          onKeySelected();
          return;
        }

        // 2. 플랫폼 API 확인 (Google AI Studio)
        const aistudio = (window as any).aistudio;
        if (aistudio && typeof aistudio.hasSelectedApiKey === 'function') {
          const hasKey = await aistudio.hasSelectedApiKey();
          if (hasKey) {
            onKeySelected();
            return;
          }
        } else {
          // 3. 플랫폼 외부라면 수동 입력 모드 활성화 및 모달 *즉시* 오픈
          setIsExternal(true);
          setShowExternalModal(true); 
        }
      } catch (e) {
        console.error("Failed to check API key status", e);
        setIsExternal(true);
        setShowExternalModal(true);
      } finally {
        setIsLoading(false);
      }
    };
    checkKey();
  }, [onKeySelected]);

  const handleSelectKey = async () => {
    if (isExternal) {
      setShowExternalModal(true);
      return;
    }

    try {
      await (window as any).aistudio.openSelectKey();
      onKeySelected();
    } catch (e) {
      console.error("Failed to select API key", e);
      setIsExternal(true); // 실패 시 수동 모드로 전환 제안
      setShowExternalModal(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="animate-pulse flex flex-col items-center gap-6">
          <div className="h-16 w-16 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center">
             <div className="w-8 h-8 border-4 border-banana-500/20 border-t-banana-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-xs font-black uppercase tracking-[0.3em]">System Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black p-6">
      <div className="max-w-md w-full bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] border-t-white/10 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-banana-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <div className="flex justify-center mb-10 relative">
          <div className="relative">
            <div className="absolute -inset-8 bg-banana-500/20 blur-3xl rounded-full animate-pulse-slow"></div>
            <div className="relative p-6 bg-slate-950 rounded-[2rem] border border-banana-500/30 shadow-inner">
              <Zap className="w-12 h-12 text-banana-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.6)]" />
            </div>
          </div>
        </div>
        
        <div className="text-center space-y-3 mb-12 relative">
          <h1 className="text-4xl font-black text-white tracking-tighter">
            Nano Banana <span className="text-banana-400 italic font-normal">Pro</span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed px-4">
            고성능 이미지 생성을 위해 본인의 <br/>
            <span className="text-white font-bold">유료 API 보안 키</span> 연결이 필요합니다.
          </p>
        </div>

        <div className="space-y-4 relative">
          <button
            onClick={handleSelectKey}
            className="w-full py-5 px-6 bg-gradient-to-br from-banana-400 to-banana-600 hover:from-banana-300 hover:to-banana-500 text-slate-950 font-black rounded-2xl transition-all transform active:scale-[0.97] shadow-[0_20px_40px_-12px_rgba(234,179,8,0.3)] flex items-center justify-center gap-3 group"
          >
            {isExternal ? <Key className="w-5 h-5 group-hover:rotate-12 transition-transform" /> : <Lock className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
            {isExternal ? "API 키 직접 입력하기" : "API 키 연결하기"}
          </button>
          
          <div className="grid grid-cols-2 gap-3 text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
             <div className="bg-slate-950/50 border border-white/5 rounded-2xl py-4 flex flex-col items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                <span>{isExternal ? "External Mode" : "Platform Mode"}</span>
             </div>
             <div className="bg-slate-950/50 border border-white/5 rounded-2xl py-4 flex flex-col items-center gap-2">
                <Zap className="w-4 h-4 text-green-500" />
                <span>Gemini 3 Pro</span>
             </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 text-center space-y-4 relative">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            연결된 키는 브라우저 보안 영역에만 저장되며<br />
            서버나 외부로 절대로 전송되지 않습니다.
          </p>
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[11px] text-banana-500 hover:text-banana-400 font-black flex items-center justify-center gap-1.5 underline underline-offset-4 transition-colors"
          >
            결제 설정 및 키 발급 안내 <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {showExternalModal && (
        <KeyManagerModal 
          onClose={() => {
            if (getSafeApiKey()) {
               setShowExternalModal(false);
            }
          }} 
          onKeyChange={() => {
            if (getSafeApiKey()) {
                onKeySelected();
            }
          }} 
        />
      )}
    </div>
  );
};
