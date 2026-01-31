
import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import SceneCard from './components/SceneCard';
import { GeminiService } from './services/gemini';
import { AppRoute, Scene, AspectRatio, ReferenceImage, VideoItem } from './types';

const App: React.FC = () => {
  const [route, setRoute] = useState<AppRoute>(AppRoute.EXPLAINER);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // API Key State
  const [apiKey, setApiKey] = useState('');

  // Video State
  const [videoQueue, setVideoQueue] = useState<VideoItem[]>([]);
  const [videoModel, setVideoModel] = useState('veo-3.1-fast-generate-preview');
  const [videoAspectRatio, setVideoAspectRatio] = useState<AspectRatio>('16:9');
  const [isProcessingVideos, setIsProcessingVideos] = useState(false);

  // Explainer State
  const [explainerScript, setExplainerScript] = useState('');
  const [explainerSceneCount, setExplainerSceneCount] = useState(3);
  const [explainerAspectRatio, setExplainerAspectRatio] = useState<AspectRatio>('1:1');
  const [explainerReferenceImages, setExplainerReferenceImages] = useState<ReferenceImage[]>([]);
  const [explainerScenes, setExplainerScenes] = useState<Scene[]>([]);
  const [isExplainerProcessing, setIsExplainerProcessing] = useState(false);
  const [explainerError, setExplainerError] = useState<string | undefined>();

  useEffect(() => {
    const stored = localStorage.getItem('GEMINI_API_KEY');
    if (stored) setApiKey(stored);
  }, []);

  const handleSaveKey = () => {
    localStorage.setItem('GEMINI_API_KEY', apiKey);
    alert('API Key salva com sucesso!');
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newItem: VideoItem = {
          id: Math.random().toString(36).substr(2, 9),
          imageData: reader.result as string,
          mimeType: file.type,
          dialogue: '',
          status: 'waiting',
          progress: 0
        };
        setVideoQueue(prev => [...prev, newItem]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUpdateDialogue = (id: string, text: string) => {
    setVideoQueue(prev => prev.map(item => 
      item.id === id ? { ...item, dialogue: text } : item
    ));
  };

  const handleGenerateAllVideos = async () => {
    if (isProcessingVideos || videoQueue.length === 0) return;
    if (!localStorage.getItem('GEMINI_API_KEY') && !process.env.API_KEY) {
      alert("Por favor, configure sua API Key nas Configurações antes de gerar vídeos.");
      setRoute(AppRoute.SETTINGS);
      return;
    }

    setIsProcessingVideos(true);
    
    for (let i = 0; i < videoQueue.length; i++) {
      const current = videoQueue[i];
      if (current.status === 'completed') continue;

      setVideoQueue(prev => prev.map(item => 
        item.id === current.id ? { ...item, status: 'generating', progress: 20 } : item
      ));

      try {
        const videoUrl = await GeminiService.generateVideo(
          current.imageData, 
          current.mimeType, 
          videoModel, 
          videoAspectRatio,
          current.dialogue
        );

        setVideoQueue(prev => prev.map(item => 
          item.id === current.id ? { 
            ...item, 
            videoUrl, 
            status: 'completed', 
            progress: 100 
          } : item
        ));
      } catch (error: any) {
        console.error("Erro no vídeo:", error);
        setVideoQueue(prev => prev.map(item => 
          item.id === current.id ? { ...item, status: 'error', progress: 0 } : item
        ));
      }
    }
    setIsProcessingVideos(false);
  };

  const removeFromQueue = (id: string) => {
    setVideoQueue(prev => prev.filter(item => item.id !== id));
  };

  const renderVideoGeneration = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header>
        <h1 className="text-3xl font-bold text-white">AI Video Creator</h1>
        <p className="text-zinc-500 mt-1">Transforme imagens em vídeos com diálogos e movimentos labiais.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div 
              onClick={() => videoInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-center"
            >
              <svg className="w-12 h-12 text-zinc-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span className="text-zinc-300 font-medium">Clique para subir imagens</span>
              <span className="text-zinc-500 text-xs mt-1">PNG, JPG suportados</span>
              <input 
                type="file" 
                ref={videoInputRef} 
                multiple 
                className="hidden" 
                accept="image/*" 
                onChange={handleVideoUpload} 
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Modelo Veo</label>
                <select
                  value={videoModel}
                  onChange={(e) => setVideoModel(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="veo-3.1-fast-generate-preview">Veo 3.1 Fast</option>
                  <option value="veo-3.1-generate-preview">Veo 3.1 High Quality</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Aspect Ratio</label>
                <select
                  value={videoAspectRatio}
                  onChange={(e) => setVideoAspectRatio(e.target.value as AspectRatio)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="16:9">16:9 Landscape</option>
                  <option value="9:16">9:16 Portrait</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerateAllVideos}
              disabled={isProcessingVideos || videoQueue.length === 0}
              className={`w-full py-4 rounded-xl font-bold transition-all shadow-lg ${
                isProcessingVideos || videoQueue.length === 0
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
              }`}
            >
              {isProcessingVideos ? 'Processando Fila...' : `Gerar ${videoQueue.length} Vídeos`}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2">
          {videoQueue.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {videoQueue.map((item) => (
                <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden relative group flex flex-col">
                   <div className={`aspect-video bg-zinc-950 relative`}>
                    {item.status === 'completed' && item.videoUrl ? (
                      <video 
                        src={item.videoUrl} 
                        controls 
                        className="w-full h-full object-cover"
                        poster={item.imageData}
                      />
                    ) : (
                      <img src={item.imageData} className="w-full h-full object-cover opacity-50 blur-sm" />
                    )}
                    
                    {item.status !== 'completed' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-black/40">
                        {item.status === 'generating' ? (
                          <>
                            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                            <span className="text-white text-sm font-medium">Gerando Vídeo...</span>
                          </>
                        ) : item.status === 'waiting' ? (
                          <span className="text-zinc-400 text-sm font-bold uppercase tracking-wider">Aguardando</span>
                        ) : (
                          <span className="text-red-400 text-sm">Falha na geração</span>
                        )}
                        <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-4 overflow-hidden">
                          <div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${item.progress}%` }} />
                        </div>
                      </div>
                    )}

                    <button 
                      onClick={() => removeFromQueue(item.id)}
                      className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all z-20"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  
                  <div className="p-4 space-y-3 bg-zinc-900/50 flex-1">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 tracking-widest">Fala do Personagem / Instrução</label>
                      <textarea
                        value={item.dialogue}
                        onChange={(e) => handleUpdateDialogue(item.id, e.target.value)}
                        placeholder="O que o personagem deve dizer?"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 h-20 resize-none"
                        disabled={item.status !== 'waiting'}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${item.status === 'completed' ? 'text-green-500' : 'text-zinc-600'}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full min-h-[400px] border-2 border-dashed border-zinc-800 rounded-3xl flex flex-col items-center justify-center text-center p-8">
              <h3 className="text-xl font-semibold text-zinc-400">Fila Vazia</h3>
              <p className="text-zinc-500 mt-2 text-sm max-w-xs">Suba múltiplas imagens para gerar uma sequência de vídeos com diálogos sincronizados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const refImg: ReferenceImage = {
          data: reader.result as string,
          mimeType: file.type
        };
        setExplainerReferenceImages(prev => [...prev, refImg]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeReferenceImage = (index: number) => {
    setExplainerReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerateExplainer = async () => {
    if (!explainerScript.trim()) return;
    if (!localStorage.getItem('GEMINI_API_KEY') && !process.env.API_KEY) {
      alert("Por favor, configure sua API Key nas Configurações antes de gerar mascotes.");
      setRoute(AppRoute.SETTINGS);
      return;
    }

    setIsExplainerProcessing(true);
    setExplainerError(undefined);
    setExplainerScenes([]);

    try {
      const sceneData = await GeminiService.generateMascotPrompts(
        explainerScript, 
        explainerSceneCount, 
        explainerReferenceImages
      );
      
      const initialScenes: Scene[] = sceneData.map((d) => ({
        id: Math.random().toString(36).substr(2, 9),
        description: d.description,
        imagePrompt: d.imagePrompt,
        aspectRatio: explainerAspectRatio,
        status: 'generating' as const
      }));
      setExplainerScenes(initialScenes);

      for (let i = 0; i < initialScenes.length; i++) {
        try {
          const imageUrl = await GeminiService.generateSceneImage(
            initialScenes[i].imagePrompt, 
            explainerAspectRatio,
            explainerReferenceImages
          );
          setExplainerScenes(prev => prev.map((s, idx) => 
            idx === i ? { ...s, imageUrl, status: 'completed' as const } : s
          ));
        } catch (error: any) {
          setExplainerScenes(prev => prev.map((s, idx) => 
            idx === i ? { ...s, status: 'error' as const } : s
          ));
        }
      }
    } catch (err: any) {
      setExplainerError(err.message || 'Erro ao criar mascotes.');
    } finally {
      setIsExplainerProcessing(false);
    }
  };

  const renderExplainer = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header>
        <h1 className="text-3xl font-bold text-white">Mascot Explainer</h1>
        <p className="text-zinc-500 mt-1">Criação de mascotes animados 3D consistentes.</p>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Cenas</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={explainerSceneCount}
                  onChange={(e) => setExplainerSceneCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Formato</label>
                <select
                  value={explainerAspectRatio}
                  onChange={(e) => setExplainerAspectRatio(e.target.value as AspectRatio)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="1:1">1:1 Square</option>
                  <option value="16:9">16:9 Landscape</option>
                  <option value="9:16">9:16 Portrait</option>
                </select>
              </div>
            </div>
            
            <textarea
              value={explainerScript}
              onChange={(e) => setExplainerScript(e.target.value)}
              placeholder="Descreva seu personagem..."
              className="w-full h-64 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            
             <div className="flex flex-wrap gap-2 mb-2">
                {explainerReferenceImages.map((img, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-zinc-700">
                    <img src={img.data} className="w-full h-full object-cover" />
                    <button onClick={() => removeReferenceImage(idx)} className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-lg p-0.5"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>
                ))}
                <button onClick={() => fileInputRef.current?.click()} className="w-16 h-16 rounded-lg border-2 border-dashed border-zinc-700 flex items-center justify-center text-zinc-500 hover:border-zinc-500">+</button>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
             </div>
             
            <button
              onClick={handleGenerateExplainer}
              disabled={isExplainerProcessing || !explainerScript.trim()}
              className="w-full py-4 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg"
            >
              {isExplainerProcessing ? 'Gerando...' : 'Criar Mascote'}
            </button>
            {explainerError && <p className="text-red-400 text-xs mt-2">{explainerError}</p>}
          </div>
        </div>
        <div className="lg:col-span-2">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {explainerScenes.map((scene, idx) => <SceneCard key={scene.id} scene={scene} index={idx} />)}
           </div>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="max-w-2xl mx-auto py-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h2 className="text-2xl font-bold text-white">Configurações</h2>
        <p className="text-zinc-500">Gerencie sua chave API.</p>
      </header>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-8 shadow-2xl">
        <div className="space-y-6">
          <label className="block text-sm font-bold text-zinc-200 mb-3">Google Gemini API Key</label>
          <div className="flex gap-3">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Insira sua chave API..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button onClick={handleSaveKey} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all">Salvar</button>
          </div>
          <p className="text-xs text-zinc-500">A chave será salva no localStorage do seu navegador.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-black text-zinc-50">
      <Sidebar currentRoute={route} onNavigate={setRoute} />
      <main className="flex-1 ml-64 p-10 max-w-7xl mx-auto w-full">
        {route === AppRoute.EXPLAINER && renderExplainer()}
        {route === AppRoute.VIDEO_GENERATION && renderVideoGeneration()}
        {route === AppRoute.SETTINGS && renderSettings()}
      </main>
    </div>
  );
};

export default App;
