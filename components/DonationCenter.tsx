
import React, { useState } from 'react';
import { FundraisingProposal } from '../types';

const DonationCenter: React.FC = () => {
  const [proposals] = useState<FundraisingProposal[]>([
    {
      id: 'f-1',
      creatorId: 'user-noir',
      title: 'Urban Sound Archive - Brooklyn',
      description: 'Preserving the acoustic signature of industrial spaces before luxury redevelopment. Funding for 3D binaural gear.',
      target: 250,
      raised: 180,
      currency: 'USDC',
      votes: { for: 450, against: 12 },
      status: 'active'
    },
    {
      id: 'f-2',
      creatorId: 'user-alpha',
      title: 'Decentralized Server Collective',
      description: 'Acquiring hardware for local nodes to ensure the Echo chambers remain outside institutional control.',
      target: 400,
      raised: 240,
      currency: 'USDC',
      votes: { for: 120, against: 89 },
      status: 'pending'
    }
  ]);

  return (
    <div className="space-y-12">
      <div className="border border-zinc-800 p-8">
        <h2 className="text-3xl font-bold tracking-tighter uppercase mb-2">The Crucible</h2>
        <p className="text-xs font-mono text-dim uppercase tracking-widest mb-8">Where ideas are tested. Only the validated survive.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {proposals.map(proposal => (
            <div key={proposal.id} className="brutalist-card p-6 flex flex-col">
              <header className="mb-4">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[9px] font-mono px-2 py-0.5 border ${
                    proposal.status === 'active' ? 'border-accent' : 'border-zinc-700 text-dim'
                  } uppercase`}>
                    {proposal.status}
                  </span>
                  <span className="text-[10px] font-mono text-dim uppercase">Target: {proposal.target} {proposal.currency}</span>
                </div>
                <h3 className="text-lg font-bold uppercase tracking-tight">{proposal.title}</h3>
              </header>
              
              <p className="text-xs text-zinc-400 mb-6 flex-1">
                {proposal.description}
              </p>

              <div className="space-y-4">
                <div className="w-full h-1 bg-zinc-900 relative">
                  <div 
                    className="absolute inset-y-0 left-0 bg-accent" 
                    style={{ width: `${(proposal.raised / proposal.target) * 100}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest">
                  <div className="flex gap-4">
                    <button className="text-accent hover:underline decoration-1">[ VOTE FOR ]</button>
                    <button className="text-dim hover:text-white transition-colors">[ AGAINST ]</button>
                  </div>
                  <span>{Math.round((proposal.raised / proposal.target) * 100)}% Funded</span>
                </div>

                <button className="w-full py-2 bg-accent text-black font-mono text-xs uppercase tracking-widest hover:bg-zinc-200 transition-colors">
                  Contribute {proposal.currency}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-zinc-800 p-8 bg-zinc-900/30">
        <h3 className="text-sm font-mono text-dim uppercase mb-4 tracking-widest">Start a Proposal</h3>
        <p className="text-xs text-zinc-500 mb-6 max-w-lg">
          Submit your vision. If 60% of active Aura accounts validate your intent within 72 hours, the funding bridge will open.
        </p>
        <button className="px-6 py-2 border border-zinc-700 font-mono text-[10px] uppercase hover:border-accent">
          Initiate Staking
        </button>
      </div>
    </div>
  );
};

export default DonationCenter;
