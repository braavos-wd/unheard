import React from 'react';

interface Props {
  activeView: string;
  setActiveView: (view: any) => void;
}

const Navigation: React.FC<Props> = ({ activeView, setActiveView }) => {
  const tabs = [
    { id: 'echoes', label: 'Echoes', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
    { id: 'circles', label: 'Circles', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z' },
    { id: 'messages', label: 'Whispers', icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z' },
    { id: 'studio', label: 'Reflect', icon: 'M12 4v16m8-8H4' },
    { id: 'crucible', label: 'Crucible', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
    { id: 'profile', label: 'Identity', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' }
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-2xl border-t border-border z-[200] px-4 sm:px-6 py-4 sm:py-6 flex justify-center shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
      <div className="flex gap-4 sm:gap-16 w-full max-w-lg justify-between sm:justify-center">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`flex flex-col items-center gap-1.5 sm:gap-2 group transition-all flex-1 sm:flex-initial ${
              activeView === tab.id ? 'text-accent scale-105 sm:scale-110' : 'text-dim hover:text-accent'
            }`}
          >
            <svg className={`w-5 h-5 sm:w-6 sm:h-6 ${activeView === tab.id ? 'stroke-2' : 'stroke-1'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
            </svg>
            <span className="text-[7px] sm:text-[9px] font-mono uppercase tracking-widest font-black text-center">{tab.label}</span>
            {activeView === tab.id && <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-accent rounded-full mt-0.5 animate-pulse"></div>}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;