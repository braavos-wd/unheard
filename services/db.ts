
import { EchoEntry, FundraisingProposal, User, Comment, CircleRoom, Message } from '../types';

const STORAGE_KEYS = {
  PULSES: 'aura_pulses',
  PROPOSALS: 'aura_proposals',
  USER: 'aura_user_profile',
  CIRCLES: 'aura_circles',
  MESSAGES: 'aura_messages'
};

// When deployed on Sliplane, the frontend and backend usually share the same origin
const API_BASE = (typeof window !== 'undefined' && window.location.hostname === 'localhost') 
  ? 'http://localhost:4000/api' 
  : '/api';

export const db = {
  // --- ECHOES ---
  getPulses: async (): Promise<EchoEntry[]> => {
    try {
      const res = await fetch(`${API_BASE}/echoes`);
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(STORAGE_KEYS.PULSES, JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn('Sync failed, using local mesh');
    }
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.PULSES) || '[]');
  },
  
  savePulse: async (pulse: EchoEntry) => {
    const pulses = JSON.parse(localStorage.getItem(STORAGE_KEYS.PULSES) || '[]');
    localStorage.setItem(STORAGE_KEYS.PULSES, JSON.stringify([pulse, ...pulses]));
    
    try {
      await fetch(`${API_BASE}/echoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pulse)
      });
    } catch (e) {
      console.error('Remote broadcast failed');
    }
    db.recalculateAura();
  },

  // FIX: Implemented missing addComment method to handle community resonance (comments) on echoes
  addComment: (echoId: string, comment: Comment) => {
    const pulses = JSON.parse(localStorage.getItem(STORAGE_KEYS.PULSES) || '[]');
    const updated = pulses.map((p: any) => {
      if (p.id === echoId) {
        return { ...p, comments: [...(p.comments || []), comment] };
      }
      return p;
    });
    localStorage.setItem(STORAGE_KEYS.PULSES, JSON.stringify(updated));
    // In a production scenario, we would also emit this to the server/socket
  },
  
  // --- MESSAGES (HYBRID) ---
  getMessages: async (userId: string): Promise<Message[]> => {
    try {
      const res = await fetch(`${API_BASE}/messages/${userId}`);
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn('Whisper mesh offline');
    }
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.MESSAGES) || '[]');
  },

  saveMessage: async (msg: Message) => {
    // 1. Local Persistence (Latency Zero)
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.MESSAGES) || '[]');
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify([...all, msg]));
    
    // 2. Server Persistence (The Mirror)
    // Note: In MessagingSuite, we'll also emit this via Socket.io for real-time delivery
    try {
      // Typically the socket saves to DB, but we can also use a REST fallback here
    } catch (e) {}
  },

  // --- IDENTITY & AURA ---
  getUser: (defaultUser: User): User => {
    if (typeof window === 'undefined') return defaultUser;
    const stored = localStorage.getItem(STORAGE_KEYS.USER);
    if (!stored) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(defaultUser));
      return defaultUser;
    }
    return JSON.parse(stored);
  },
  
  saveUser: (user: User) => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },

  toggleFollow: (authorId: string): User => {
    const user = db.getUser({} as any);
    if (!user.following) user.following = [];
    const index = user.following.indexOf(authorId);
    if (index === -1) {
      user.following.push(authorId);
    } else {
      user.following.splice(index, 1);
    }
    db.saveUser(user);
    return user;
  },

  recalculateAura: () => {
    const user = db.getUser({} as any);
    const echoes = JSON.parse(localStorage.getItem(STORAGE_KEYS.PULSES) || '[]');
    const myEchoes = echoes.filter((e: any) => e.authorId === user.id);
    user.auraScore = 100 + (myEchoes.length * 15);
    db.saveUser(user);
    return user;
  },

  nukeChat: (myId: string, partnerId: string) => {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.MESSAGES) || '[]');
    const filtered = all.filter((m: any) => 
      !( (m.senderId === myId && m.receiverId === partnerId) || 
         (m.senderId === partnerId && m.receiverId === myId) )
    );
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(filtered));
  },

  // --- SYSTEM DEFAULTS ---
  getProposals: (): FundraisingProposal[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.PROPOSALS);
    if (!stored) return [];
    return JSON.parse(stored);
  },

  updateProposal: (id: string, type: 'for' | 'against', weight: number): FundraisingProposal[] => {
    const proposals = db.getProposals();
    const updated = proposals.map(p => {
      if (p.id === id) {
        const votes = { ...p.votes };
        votes[type] = (votes[type] || 0) + weight;
        return { ...p, votes };
      }
      return p;
    });
    localStorage.setItem(STORAGE_KEYS.PROPOSALS, JSON.stringify(updated));
    return updated;
  },

  getCircles: (): CircleRoom[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.CIRCLES);
    const defaultCircles: CircleRoom[] = [
      { 
        id: 'r-safe', 
        title: 'Urban Solitude: Night Reflections', 
        tags: ['Anxiety', 'Solitude'], 
        members: [], 
        isLive: true, 
        startTime: Date.now(),
        timesHeld: 42,
        location: { city: 'New York', latlng: { lat: 40.7128, lng: -74.0060 } }
      }
    ];
    return stored ? [...defaultCircles, ...JSON.parse(stored)] : defaultCircles;
  },

  saveCircle: (circle: CircleRoom) => {
    const stored = localStorage.getItem(STORAGE_KEYS.CIRCLES);
    const userCircles = stored ? JSON.parse(stored) : [];
    localStorage.setItem(STORAGE_KEYS.CIRCLES, JSON.stringify([circle, ...userCircles]));
  }
};
