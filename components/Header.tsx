import React from 'react';
import { Sparkles, Image as ImageIcon } from 'lucide-react';

export const Header: React.FC = () => {
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
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <span className="hidden sm:flex items-center gap-1">
            <ImageIcon className="w-4 h-4" /> Gemini 3 Pro Image
          </span>
        </div>
      </div>
    </header>
  );
};