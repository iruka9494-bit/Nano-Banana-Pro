import React, { useState } from 'react';
import { GeneratedImage, AspectRatio } from '../types';
import { Download, Maximize2 } from 'lucide-react';

interface ImageCardProps {
  image: GeneratedImage;
  onClick?: () => void;
}

export const ImageCard: React.FC<ImageCardProps> = ({ image, onClick }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  // Helper to convert enum string "1:1" to CSS aspect-ratio style
  const getAspectRatioStyle = (ratio: AspectRatio) => {
    const [w, h] = ratio.split(':').map(Number);
    return { aspectRatio: `${w} / ${h}` };
  };

  return (
    <div 
      className={`group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl transition-all hover:border-banana-500/30 w-full ${onClick ? 'cursor-zoom-in hover:shadow-banana-500/10' : ''}`}
      onClick={onClick}
    >
      {/* Container with fixed aspect ratio to prevent layout shift */}
      <div 
        className="relative w-full bg-slate-950"
        style={getAspectRatioStyle(image.aspectRatio)}
      >
        {/* Loading Placeholder */}
        {!isLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-10">
             <div className="w-10 h-10 border-4 border-banana-500/30 border-t-banana-500 rounded-full animate-spin mb-3"></div>
             <span className="text-slate-500 text-xs font-medium animate-pulse">렌더링 중...</span>
          </div>
        )}

        {/* Actual Image */}
        <img 
          src={image.url} 
          alt={image.prompt} 
          className={`w-full h-full object-cover transition-all duration-700 ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
          onLoad={() => setIsLoaded(true)}
        />
        
        {/* Overlay Controls (Only visible after load) */}
        <div className={`absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6 ${!isLoaded ? 'hidden' : ''}`}>
          
          {/* Hover icon to indicate clickability for preview */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/30 backdrop-blur-sm p-3 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
            <Maximize2 className="w-6 h-6 text-white/90" />
          </div>

          <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 relative z-10">
            <p className="text-white line-clamp-2 mb-2 font-medium shadow-black drop-shadow-md text-sm sm:text-base">{image.prompt}</p>
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-slate-800/80 text-slate-300 border border-slate-700 backdrop-blur-sm">
                  {image.size}
                </span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-slate-800/80 text-slate-300 border border-slate-700 backdrop-blur-sm">
                  {image.aspectRatio}
                </span>
              </div>
              
              <a 
                href={image.url} 
                download={`gemini-nano-pro-${image.id}.png`}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-colors z-20"
                title="다운로드"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};