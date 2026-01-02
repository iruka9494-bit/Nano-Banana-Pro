
import React from 'react';
import { Sparkles, Image as ImageIcon, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  onOpenKeyManager: () => void;
  keyStatus: 'connected' | 'not-connected';
}

export const Header: React.FC<HeaderProps> = ({ onOpenKeyManager, keyStatus }) => {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-lg bg-slate-950/80 border-b border-slate-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-banana-400 to-orange-500 rounded-lg shadow-lg shadow-banana-500/20">
            <Sparkles className="w-6 h-6 text-slate-950" />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Nano Banana <span className="text-banana-400">Pro</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500 mr-2">
            <ImageIcon className="w-4 h-4" /> Gemini 3 Pro Image
          </div>
          
          <button 
            onClick={onOpenKeyManager}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-medium ${
              keyStatus === 'connected' 
              ? 'bg-green-500/10 border-green-500/30 text-green-500 hover:bg-green-500/20' 
              : 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{keyStatus === 'connected' ? 'API 연결됨' : 'API 연결 필요'}</span>
            <div className={`w-1.5 h-1.5 rounded-full ${keyStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
