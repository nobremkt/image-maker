
import React from 'react';
import { Scene } from '../types';

interface SceneCardProps {
  scene: Scene;
  index: number;
}

const SceneCard: React.FC<SceneCardProps> = ({ scene, index }) => {
  const getAspectClass = () => {
    switch (scene.aspectRatio) {
      case "9:16": return "aspect-[9/16]";
      case "1:1": return "aspect-square";
      case "16:9": 
      default: return "aspect-video";
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden group hover:border-zinc-700 transition-all duration-300">
      <div className={`relative ${getAspectClass()} bg-zinc-950 flex items-center justify-center overflow-hidden`}>
        {scene.status === 'generating' ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-xs text-zinc-500 animate-pulse">Painting scene {index + 1}...</span>
          </div>
        ) : scene.imageUrl ? (
          <img 
            src={scene.imageUrl} 
            alt={scene.description} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="text-zinc-700">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white uppercase tracking-wider z-10">
          Scene {index + 1}
        </div>
      </div>
      
      <div className="p-4 space-y-2">
        <h4 className="text-sm font-semibold text-zinc-200 line-clamp-1">{scene.description}</h4>
        <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
          {scene.imagePrompt}
        </p>
      </div>
    </div>
  );
};

export default SceneCard;
