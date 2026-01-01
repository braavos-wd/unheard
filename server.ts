
/**
 * AURA & ECHO - PRODUCTION SERVER
 * Coordinates real-time resonance, presence, and encrypted whisper handshakes.
 * Uses MongoDB for persistent sanctuary logs and user meshes.
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import path from 'path';

const app = express();
app.use(express.json() as any);

// Serve static files from the 'dist' directory (Vite build output)
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'dist')) as any);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// --- DATABASE CONFIGURATION ---
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sanctuary';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('[DATABASE] Connected to Mesh Storage (MongoDB)'))
  .catch(err => console.error('[DATABASE] Connection error:', err));

// --- MODELS ---
const EchoSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  authorId: String,
  authorName: String,
  title: String,
  content: String,
  timestamp: { type: Number, default: Date.now },
  stats: {
    reads: { type: Number, default: 0 },
    likes: { type: Number, default: 0 }
  },
  tags: [String]
});
const Echo = mongoose.model('Echo', EchoSchema);

const MessageSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  senderId: String,
  receiverId: String,
  cipherText: String,
  timestamp: { type: Number, default: Date.now },
  type: { type: String, default: 'text' },
  sharedCircleId: String,
  isRead: { type: Boolean, default: false }
});
const Message = mongoose.model('Message', MessageSchema);

// --- VITALITY CHECK (HEALTHCHECK) ---
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    database: dbStatus,
    timestamp: Date.now()
  });
});

// --- REST API ---
app.get('/api/echoes', async (req, res) => {
  try {
    const echoes = await Echo.find().sort({ timestamp: -1 }).limit(50);
    res.json(echoes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch echoes' });
  }
});

app.post('/api/echoes', async (req, res) => {
  try {
    const echoData = req.body;
    const echo = await Echo.findOneAndUpdate(
      { id: echoData.id },
      echoData,
      { upsert: true, new: true }
    );
    res.status(201).json(echo);
  } catch (err) {
    res.status(400).json({ error: 'Failed to save echo' });
  }
});

app.get('/api/messages/:userId', async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ senderId: req.params.userId }, { receiverId: req.params.userId }]
    }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch whispers' });
  }
});

// --- REAL-TIME COORDINATION (Socket.io) ---
interface Member {
  socketId: string;
  userId: string;
  name: string;
}

interface RoomState {
  members: Map<string, Member>;
  activeAsset?: string;
}

const activeRooms = new Map<string, RoomState>();

io.on('connection', (socket) => {
  socket.on('join_circle', ({ roomId, userId, name }) => {
    socket.join(roomId);
    if (!activeRooms.has(roomId)) {
      activeRooms.set(roomId, { members: new Map() });
    }
    const room = activeRooms.get(roomId)!;
    room.members.set(socket.id, { socketId: socket.id, userId, name });
    io.to(roomId).emit('presence_update', Array.from(room.members.values()));
  });

  socket.on('send_whisper', async (msgData) => {
    try {
      const msg = new Message(msgData);
      await msg.save();
      io.emit(`whisper_inbox_${msgData.receiverId}`, msg);
    } catch (err) {
      console.error('[WHISPER] Broadcast failed');
    }
  });

  socket.on('disconnect', () => {
    activeRooms.forEach((room, roomId) => {
      if (room.members.has(socket.id)) {
        room.members.delete(socket.id);
        io.to(roomId).emit('presence_update', Array.from(room.members.values()));
        if (room.members.size === 0) activeRooms.delete(roomId);
      }
    });
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`
  ┌──────────────────────────────────────────────────┐
  │   SANCTUARY PRODUCTION ENGINE ACTIVE             │
  │   PORT: ${PORT}                                   │
  │   MONGODB: ${MONGODB_URI.split('@').pop()}       │
  │   HEALTHCHECK: /health                           │
  └──────────────────────────────────────────────────┘
  `);
});
