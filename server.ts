/**
 * AURA & ECHO - UNIFIED PRODUCTION SERVER
 * Coordinates real-time resonance, presence, and static asset delivery.
 */

import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';

const app = express();
const httpServer = createServer(app);

// 1. SYSTEM LOGGING & MIDDLEWARE
console.log('\x1b[36m%s\x1b[0m', '--- SANCTUARY ENGINE INITIALIZING ---');

app.use((req: any, res: any, next: any) => {
  if (req.path !== '/health') {
    console.log(`[HTTP] ${req.method} ${req.path} - ${new Date().toLocaleTimeString()}`);
  }
  next();
});

app.use(express.json() as any);

// 2. HEALTH & STATUS
app.get('/health', (req: any, res: any) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    database: dbStatus,
    api_key_synced: !!process.env.API_KEY,
    mode: fs.existsSync(path.join(path.resolve(), 'dist')) ? 'UNIFIED_PRODUCTION' : 'DEVELOPMENT'
  });
});

// 3. DATABASE CONNECTION
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sanctuary';
console.log(`[DATABASE] Connecting to storage mesh...`);

mongoose.connect(MONGODB_URI)
  .then(() => console.log('\x1b[32m%s\x1b[0m', '[DATABASE] Connected Successfully (Atlas)'))
  .catch((err: Error) => console.error('\x1b[31m%s\x1b[0m', '[DATABASE] Connection Failure:', err.message));

// --- DATA MODELS ---
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

// --- REST API ENDPOINTS ---
app.get('/api/echoes', async (req: any, res: any) => {
  try {
    const echoes = await Echo.find().sort({ timestamp: -1 }).limit(50);
    res.json(echoes);
  } catch (err) {
    res.status(500).json({ error: 'Sync failed' });
  }
});

app.post('/api/echoes', async (req: any, res: any) => {
  try {
    const echo = await Echo.findOneAndUpdate({ id: req.body.id }, req.body, { upsert: true, new: true });
    res.status(201).json(echo);
  } catch (err) {
    res.status(400).json({ error: 'Broadcast failed' });
  }
});

app.get('/api/messages/:userId', async (req: any, res: any) => {
  try {
    const messages = await MessageModel.find({
      $or: [{ senderId: req.params.userId }, { receiverId: req.params.userId }]
    }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Whisper mesh offline' });
  }
});

// --- REAL-TIME MESH (SOCKET.IO) ---
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const activeRooms = new Map<string, Map<string, any>>();

io.on('connection', (socket: Socket) => {
  console.log(`[MESH] Node established: ${socket.id}`);

  socket.on('join_circle', ({ roomId, userId, name }: { roomId: string, userId: string, name: string }) => {
    socket.join(roomId);
    if (!activeRooms.has(roomId)) activeRooms.set(roomId, new Map());
    const room = activeRooms.get(roomId)!;
    room.set(socket.id, { socketId: socket.id, userId, name, isSpeaking: false });
    
    io.to(roomId).emit('presence_update', Array.from(room.values()));
    console.log(`[CIRCLE] ${name} joined sanctuary ${roomId}`);
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
      console.log(`[WHISPER] Encrypted transmission: ${socket.id} -> ${msgData.receiverId}`);
    } catch (err) {
      console.error('[WHISPER] Encryption/Save error');
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
    console.log(`[MESH] Node severed: ${socket.id}`);
  });
});

// 4. UNIFIED SERVING & ENV INJECTION
const __dirname = path.resolve();
const distPath = path.join(__dirname, 'dist');

if (fs.existsSync(distPath)) {
  console.log('\x1b[32m%s\x1b[0m', `[SYSTEM] Production Mode: Serving assets from ${distPath}`);
  app.use('/assets', express.static(path.join(distPath, 'assets')) as any);
  app.use(express.static(distPath, { index: false }) as any);
}

// CRITICAL FIX FOR EXPRESS 5:
// Catch-all route must be written as '(.*)' instead of '*'
app.get('(.*)', (req: any, res: any, next: any) => {
  if (req.path.startsWith('/api') || req.path.includes('.')) return next();

  const indexPath = path.join(distPath, 'index.html');
  const finalPath = fs.existsSync(indexPath) ? indexPath : path.join(__dirname, 'index.html');

  fs.readFile(finalPath, 'utf8', (err, html) => {
    if (err) return res.status(500).send('Sanctuary Loading Error');

    // Inject runtime variables into the browser
    const injection = `
    <script>
      window.process = { env: { API_KEY: ${JSON.stringify(process.env.API_KEY || '')} } };
      console.log("[RUNTIME] Sanctuary Environment Synced.");
    </script>`;
    
    res.send(html.replace('<head>', `<head>${injection}`));
  });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log('\x1b[32m%s\x1b[0m', `
  ┌──────────────────────────────────────────────────┐
  │   SANCTUARY ENGINE ONLINE                        │
  │   PORT: ${PORT}                                   │
  │   GEMINI: ${process.env.API_KEY ? 'SYNCHRONIZED' : 'PENDING KEY'}                    │
  │   MODE: ${fs.existsSync(distPath) ? 'UNIFIED PRODUCTION' : 'STANDALONE API'}           │
  └──────────────────────────────────────────────────┘
  `);
});