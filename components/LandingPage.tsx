import React from 'react';

interface Props {
  onEnter: () => void;
}

const LandingPage: React.FC<Props> = ({ onEnter }) => {
  return (
    <div className="fixed inset-0 z-[2000] bg-white flex flex-col items-center justify-center p-6 sm:p-8 text-center overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
      
      {/* Dynamic Background Element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[800px] h-[300px] sm:h-[800px] bg-serene/5 rounded-full blur-[60px] sm:blur-[120px] animate-pulse"></div>

      <div className="relative z-10 max-w-4xl mx-auto space-y-8 sm:space-y-12">
        <header className="space-y-4">
          <span className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.4em] sm:tracking-[0.5em] text-serene font-black animate-in fade-in slide-in-from-bottom-4 duration-1000">The Urban Sanctuary</span>
          <h1 className="text-5xl sm:text-7xl lg:text-9xl font-black uppercase tracking-tighter leading-[0.8] animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 break-words">
            Unheard <br className="hidden sm:block"/> No More.
          </h1>
        </header>

        <p className="text-base sm:text-xl md:text-2xl text-dim max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500 font-sans italic">
          The city is loud, but the soul is quiet. A space for the thoughts that don't fit a caption.
        </p>

        <div className="pt-6 sm:pt-12 animate-in fade-in zoom-in duration-1000 delay-700">
          <button 
            onClick={onEnter}
            className="group relative w-full sm:w-auto px-12 sm:px-20 py-6 sm:py-8 bg-accent text-white font-mono text-xs sm:text-sm uppercase tracking-[0.3em] sm:tracking-[0.5em] font-black overflow-hidden transition-all"
          >
            <span className="relative z-10">Enter Sanctuary</span>
            <div className="absolute inset-0 bg-serene translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500"></div>
          </button>
        </div>

        <footer className="pt-12 sm:pt-24 flex flex-col sm:flex-row justify-center gap-6 sm:gap-12 font-mono text-[8px] sm:text-[10px] uppercase tracking-widest text-dim animate-in fade-in delay-1000 font-bold">
          <div className="flex flex-col gap-1">
            <span className="text-accent font-black">1. Echo</span>
            <span className="opacity-50">Reflect</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-accent font-black">2. Circle</span>
            <span className="opacity-50">Speak</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-accent font-black">3. Resonance</span>
            <span className="opacity-50">Connect</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;