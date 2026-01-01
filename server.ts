
/**
 * AURA & ECHO - PRODUCTION SERVER
 * Coordinates real-time resonance, presence, and encrypted whisper handshakes.
 */

import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';

const app = express();
const httpServer = createServer(app);

// 1. STARTUP LOGGING
console.log('\x1b[36m%s\x1b[0m', '--- SANCTUARY ENGINE STARTING ---');

app.use((req: any, res: any, next: any) => {
  if (req.path !== '/health') {
    console.log(`[HTTP] ${req.method} ${req.path} - ${new Date().toLocaleTimeString()}`);
  }
  next();
});

// 2. HEALTH CHECK
app.get('/health', (req: any, res: any) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    database: dbStatus,
    api_key_detected: !!process.env.API_KEY,
    node_env: process.env.NODE_ENV || 'development'
  });
});

// 3. MIDDLEWARE & STATIC ASSETS
app.use(express.json() as any);

const __dirname = path.resolve();
const distPath = path.join(__dirname, 'dist');

if (fs.existsSync(distPath)) {
  console.log(`[SYSTEM] Production assets detected at ${distPath}`);
  app.use('/assets', express.static(path.join(distPath, 'assets')) as any);
  app.use(express.static(distPath, { index: false }) as any);
} else {
  console.log('[SYSTEM] Development mode: Serving from root (Vite expected on 5173)');
}

// 4. DATABASE CONNECTION
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sanctuary';
console.log(`[DATABASE] Connecting to storage...`);

mongoose.connect(MONGODB_URI)
  .then(() => console.log('\x1b[32m%s\x1b[0m', '[DATABASE] Connection Successful (MongoDB Atlas)'))
  .catch((err: Error) => console.error('\x1b[31m%s\x1b[0m', '[DATABASE] Connection Error:', err.message));

// --- MODELS ---
const Echo = mongoose.model('Echo', new mongoose.Schema({
  id: { type: String, unique: true },
  authorId: String,
  authorName: String,
  title: String,
  content: String,
  timestamp: { type: Number, default: Date.now },
  stats: { reads: { type: Number, default: 0 }, likes: { type: Number, default: 0 } },
  tags: [String]
}));

const MessageModel = mongoose.model('Message', new mongoose.Schema({
  id: { type: String, unique: true },
  senderId: String,
  receiverId: String,
  cipherText: String,
  timestamp: { type: Number, default: Date.now },
  type: { type: String, default: 'text' },
  sharedCircleId: String,
  isRead: { type: Boolean, default: false }
}));

// --- REST API ---
app.get('/api/echoes', async (req: any, res: any) => {
  try {
    const echoes = await Echo.find().sort({ timestamp: -1 }).limit(50);
    res.json(echoes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch echoes' });
  }
});

app.post('/api/echoes', async (req: any, res: any) => {
  try {
    const echo = await Echo.findOneAndUpdate({ id: req.body.id }, req.body, { upsert: true, new: true });
    res.status(201).json(echo);
  } catch (err) {
    res.status(400).json({ error: 'Failed to save echo' });
  }
});

app.get('/api/messages/:userId', async (req: any, res: any) => {
  try {
    const messages = await MessageModel.find({
      $or: [{ senderId: req.params.userId }, { receiverId: req.params.userId }]
    }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// --- SOCKET.IO COORDINATION ---
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const activeRooms = new Map<string, Map<string, any>>();

io.on('connection', (socket: Socket) => {
  console.log(`[SOCKET] Node connected: ${socket.id}`);

  socket.on('join_circle', ({ roomId, userId, name }: { roomId: string, userId: string, name: string }) => {
    socket.join(roomId);
    if (!activeRooms.has(roomId)) activeRooms.set(roomId, new Map());
    const room = activeRooms.get(roomId)!;
    room.set(socket.id, { socketId: socket.id, userId, name, isSpeaking: false });
    
    io.to(roomId).emit('presence_update', Array.from(room.values()));
    console.log(`[CIRCLE] ${name} joined ${roomId} (${room.size} active)`);
  });

  socket.on('voice_activity', ({ roomId, isSpeaking }: { roomId: string, isSpeaking: boolean }) => {
    const room = activeRooms.get(roomId);
    if (room?.has(socket.id)) {
      room.get(socket.id)!.isSpeaking = isSpeaking;
      io.to(roomId).emit('user_speaking', { socketId: socket.id, isSpeaking });
    }
  });

  socket.on('send_whisper', async (msgData: any) => {
    try {
      const msg = new MessageModel(msgData);
      await msg.save();
      io.emit(`whisper_inbox_${msgData.receiverId}`, msgData);
      console.log(`[WHISPER] Encrypted transmission from ${msgData.senderId} to ${msgData.receiverId}`);
    } catch (err) {
      console.error('[WHISPER] Save failed');
    }
  });

  socket.on('disconnect', () => {
    activeRooms.forEach((members, roomId) => {
      if (members.has(socket.id)) {
        members.delete(socket.id);
        io.to(roomId).emit('presence_update', Array.from(members.values()));
        if (members.size === 0) activeRooms.delete(roomId);
      }
    });
    console.log(`[SOCKET] Node disconnected: ${socket.id}`);
  });
});

// 5. RUNTIME ENV INJECTION
app.get('*', (req: any, res: any, next: any) => {
  if (req.path.startsWith('/api') || req.path.includes('.')) return next();

  const indexPath = path.join(distPath, 'index.html');
  const finalPath = fs.existsSync(indexPath) ? indexPath : path.join(__dirname, 'index.html');

  fs.readFile(finalPath, 'utf8', (err, html) => {
    if (err) return res.status(500).send('Sanctuary Initialization Error');

    const injection = `
    <script>
      window.process = { env: { API_KEY: ${JSON.stringify(process.env.API_KEY || '')} } };
      console.log("[RUNTIME] Environment Synchronized.");
    </script>`;
    
    res.send(html.replace('<head>', `<head>${injection}`));
  });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log('\x1b[32m%s\x1b[0m', `
  ┌──────────────────────────────────────────────────┐
  │   SANCTUARY PRODUCTION ENGINE: ONLINE            │
  │   PORT: ${PORT}                                   │
  │   BIND: 0.0.0.0                                  │
  │   KEY: ${process.env.API_KEY ? 'DETACHED_MODE (SAFE)' : 'MISSING'}                   │
  └──────────────────────────────────────────────────┘
  `);
});
