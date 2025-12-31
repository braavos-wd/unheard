import React, { useState, useMemo } from 'react';
import { EchoEntry } from '../types';
import { GoogleGenAI } from "@google/genai";

interface Props {
  echoes: EchoEntry[];
  onSelectEcho: (id: string) => void;
}

const SearchDiscovery: React.FC<Props> = ({ echoes, onSelectEcho }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<EchoEntry[]>([]);
  const [matchExplanation, setMatchExplanation] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const resonanceNodes = useMemo(() => {
    const counts: Record<string, number> = {};
    const commonTags = ['Anxiety', 'Gratitude', 'Solitude', 'Healing', 'Urban', 'Growth', 'Ritual'];
    
    echoes.forEach(e => {
      commonTags.forEach(tag => {
        if (e.content.toLowerCase().includes(tag.toLowerCase()) || 
            e.title.toLowerCase().includes(tag.toLowerCase())) {
          counts[tag] = (counts[tag] || 0) + 1;
        }
      });
    });

    return commonTags.map(tag => ({
      name: tag,
      weight: (counts[tag] || 0) + 1,
    }));
  }, [echoes]);

  const handleSearch = async (inputQuery: string) => {
    const q = inputQuery || query;
    if (!q) return;

    setIsSearching(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Current User Sentiment Query: "${q}". \nAvailable Echoes: ${JSON.stringify(echoes.map(e => ({ id: e.id, title: e.title, content: e.content.substring(0, 150) })))}. \nReturn a JSON object with 'matchIds' (array of strings) and 'reason' (a short empathetic sentence explaining why these resonances match the mood).`,
        config: { responseMimeType: 'application/json' }
      });

      const data = JSON.parse(response.text || "{}");
      const matched = echoes.filter(e => data.matchIds?.includes(e.id));
      setResults(matched);
      setMatchExplanation(data.reason || '');
    } catch (err) {
      console.error("Search distillation failed", err);
    }
    setIsSearching(false);
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto pb-32">
      {/* Header & Main Search Section */}
      <div className="mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h2 className="text-7xl font-bold uppercase tracking-tighter leading-none mb-4">The Hub</h2>
            <p className="text-xs text-dim font-mono uppercase tracking-[0.4em]">Semantic discovery engine.</p>
          </div>
          <div className="text-right hidden md:block">
            <span className="text-[10px] font-mono uppercase text-serene font-bold tracking-widest block mb-1">Active Nodes</span>
            <span className="text-3xl font-bold font-mono tracking-tighter">{echoes.length}</span>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSearch(''); }} className="relative mb-8">
          <div className="relative group">
            <input 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What frequency are you on?..."
              className="w-full bg-white border-4 border-accent p-8 text-3xl font-bold uppercase tracking-tight focus:bg-surface outline-none transition-all placeholder:text-zinc-200 shadow-[8px_8px_0_0_rgba(0,0,0,0.05)] focus:shadow-[12px_12px_0_0_rgba(59,130,246,0.1)]"
            />
            <button 
              type="submit"
              disabled={isSearching}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-6 bg-accent text-white hover:bg-serene transition-all flex items-center gap-4 font-mono text-[10px] uppercase tracking-widest disabled:opacity-50"
            >
              {isSearching ? <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin"></div> : (
                <>
                  Distill Resonance
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Condensed Resonance Field (Mood Quick-Filters) */}
        <div className="bg-surface brutalist-border p-6 mb-8 overflow-hidden relative">
          <div className="flex items-center gap-6 overflow-x-auto hide-scrollbar">
            <span className="text-[9px] font-mono uppercase text-dim tracking-widest whitespace-nowrap border-r border-border pr-6">Trending Moods:</span>
            {resonanceNodes.map((node) => (
              <button
                key={node.name}
                onClick={() => { setQuery(node.name); handleSearch(node.name); }}
                className="group flex items-center gap-3 whitespace-nowrap hover:text-serene transition-colors"
              >
                <span className={`font-mono text-[11px] uppercase tracking-widest font-bold ${query === node.name ? 'text-serene' : 'text-accent'}`}>
                  {node.name}
                </span>
                <span className="bg-white border border-border px-2 py-0.5 text-[8px] font-mono text-dim group-hover:border-serene group-hover:text-serene transition-all">
                  {node.weight}
                </span>
              </button>
            ))}
          </div>
        </div>

        {matchExplanation && (
          <div className="p-10 border-l-12 border-serene bg-white shadow-xl animate-in fade-in slide-in-from-left-4 mb-12">
             <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-2 bg-serene rounded-full animate-pulse"></div>
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-serene font-bold">Resonance Insights</p>
             </div>
             <p className="text-2xl text-accent font-medium leading-tight italic max-w-3xl">"{matchExplanation}"</p>
          </div>
        )}
      </div>

      {/* Results Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {results.length > 0 ? (
          results.map(echo => (
            <div 
              key={echo.id}
              onClick={() => onSelectEcho(echo.id)}
              className="brutalist-border p-12 bg-white cursor-pointer group hover:bg-accent hover:text-white transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                 <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
              </div>
              <div className="flex items-center gap-3 mb-6 text-[10px] font-mono text-dim group-hover:text-white/60 uppercase tracking-widest">
                <span>{echo.authorName}</span>
                <span className="font-bold border-l border-current pl-3">MATCH</span>
              </div>
              <h3 className="text-4xl font-bold uppercase tracking-tighter leading-none mb-8">
                {echo.title}
              </h3>
              <p className="text-sm opacity-60 line-clamp-2 leading-relaxed font-sans">{echo.content}</p>
            </div>
          ))
        ) : query && !isSearching ? (
          <div className="col-span-full py-32 brutalist-border border-dashed text-center bg-surface">
            <p className="font-mono text-xs uppercase text-dim tracking-[0.5em] italic">No collective frequency matched your query.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default SearchDiscovery;