
import React from 'react';

interface Props {
  onEnter: () => void;
}

const LandingPage: React.FC<Props> = ({ onEnter }) => {
  return (
    <div className="fixed inset-0 z-[2000] bg-white flex flex-col items-center justify-center p-8 text-center overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
      
      {/* Dynamic Background Element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-serene/5 rounded-full blur-[120px] animate-pulse"></div>

      <div className="relative z-10 max-w-4xl mx-auto space-y-12">
        <header className="space-y-4">
          <span className="font-mono text-xs uppercase tracking-[0.5em] text-serene animate-in fade-in slide-in-from-bottom-4 duration-1000">The Urban Sanctuary</span>
          <h1 className="text-7xl md:text-9xl font-bold uppercase tracking-tighter leading-[0.8] animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            Unheard <br/> No More.
          </h1>
        </header>

        <p className="text-xl md:text-2xl text-dim max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500 font-sans">
          The city is loud, but the soul is quiet. We built a space for the thoughts you can't tweet, the feelings that don't fit a caption, and the resonance of shared existence.
        </p>

        <div className="pt-12 animate-in fade-in zoom-in duration-1000 delay-700">
          <button 
            onClick={onEnter}
            className="group relative px-20 py-8 bg-accent text-white font-mono text-sm uppercase tracking-[0.5em] font-bold overflow-hidden transition-all hover:px-24"
          >
            <span className="relative z-10">Enter the Sanctuary</span>
            <div className="absolute inset-0 bg-serene translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500"></div>
          </button>
        </div>

        <footer className="pt-24 flex flex-col md:flex-row justify-center gap-12 font-mono text-[10px] uppercase tracking-widest text-dim animate-in fade-in delay-1000">
          <div className="flex flex-col gap-2">
            <span className="text-accent font-bold">1. Echo</span>
            <span>Reflect on your truth</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-accent font-bold">2. Circle</span>
            <span>Speak into the void</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-accent font-bold">3. Resonance</span>
            <span>You are never alone</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
