import React, { useState } from 'react';
import { Lock, ExternalLink, Zap, AlertCircle } from 'lucide-react';

interface ApiKeyGateProps {
  // 상위 컴포넌트(App.tsx)의 함수가 키 값을 받을 수 있도록 형식을 맞춥니다.
  onKeySelected: (key: string) => void;
}

export const ApiKeyGate: React.FC<ApiKeyGateProps> = ({ onKeySelected }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) {
      alert("API 키를 입력해주세요.");
      return;
    }
    // 입력받은 키를 상위 컴포넌트로 전달합니다.
    onKeySelected(inputValue.trim());
  };

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
        <p className="text-center text-slate-400 mb-6 text-sm">
          Gemini 3 Pro Image 생성 기능을 사용하려면 <br/>본인의 **유료 구글 API 키**를 입력하세요.
        </p>

        {/* 유료 모델 주의사항 안내 문구 */}
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3 text-xs text-red-300 leading-relaxed">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-bold mb-1">⚠️ 주의: 유료 전용 모델</p>
            <p>이 모델은 무료 티어가 없습니다. 반드시 **결제 수단(카드)**이 등록된 프로젝트의 키를 사용해야 하며, 이미지당 비용($0.134)이 발생합니다.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="password"
            placeholder="API 키를 입력하세요 (AIza...)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-banana-500 transition-all"
          />

          <button
            type="submit"
            className="w-full py-4 px-6 bg-gradient-to-r from-banana-500 to-banana-600 hover:from-banana-400 hover:to-banana-500 text-slate-950 font-bold rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-banana-500/20 flex items-center justify-center gap-2"
          >
            <Lock className="w-5 h-5" />
            서비스 시작하기
          </button>
          
          <div className="text-[11px] text-center text-slate-500 mt-6 space-y-2">
            <p>입력하신 키는 본인의 브라우저에만 안전하게 저장됩니다.</p>
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-banana-500 hover:text-banana-400 transition-colors"
            >
              Google AI Studio에서 키 발급받기 <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};
