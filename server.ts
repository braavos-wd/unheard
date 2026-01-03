import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { MongoClient, ServerApiVersion, Collection, Db, Document } from 'mongodb';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import cors from 'cors';

/**
 * AURA & ECHO - PRODUCTION ENGINE
 * Refactored for extreme stability and rapid health-check response.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- EMERGENCY CRASH HANDLERS ---
process.on('uncaughtException', (err) => {
  console.error('[FATAL ERROR] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL ERROR] Unhandled Rejection at:', promise, 'reason:', reason);
});

// --- INTERFACES ---
interface User {
  socketId: string;
  userId: string;
  name: string;
  isSpeaking: boolean;
}

interface Message extends Document {
  senderId: string;
  receiverId: string;
  cipherText: string;
  timestamp: number;
  type: string;
  sharedCircleId?: string;
  isRead: boolean;
}

interface Echo extends Document {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  timestamp: number;
  stats: {
    reads: number;
    likes: number;
    plays: number;
  };
  tags: string[];
}

// --- INITIALIZATION ---
const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const SERVER_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sanctuary';

let dbClient: MongoClient | null = null;
let db: Db | null = null;
let isDbConnected = false;
const activeRooms = new Map<string, Map<string, User>>();

// --- 1. PRIORITY ONE: HEALTH CHECK ---
// We define this first to bypass any logging/logic that might slow it down.
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'online',
    database: isDbConnected ? 'connected' : 'connecting',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// --- 2. MIDDLEWARES ---
// Fix: Use explicit path '/' and any casting for cors middleware to avoid PathParams overload mismatch
app.use('/', cors() as any);
app.use(express.json());

// Request Logging
app.use((req: any, _res: any, next: NextFunction) => {
  if (req.path !== '/health') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// --- 3. DATABASE (BACKGROUND CONNECTION) ---
async function connectToDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB Sanctuary...');
    dbClient = new MongoClient(MONGODB_URI, {
      serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000
    });

    await dbClient.connect();
    db = dbClient.db();
    isDbConnected = true;
    console.log('✅ MongoDB Sanctuary Connected');
    await db.command({ ping: 1 });
  } catch (error) {
    isDbConnected = false;
    console.error('❌ MongoDB Connection Failure:', error);
    console.warn('⚠️ Sanctuary operating in Local-Only mode.');
  }
}

function getCollection<T extends Document>(name: string): Collection<T> {
  if (!db || !isDbConnected) throw new Error('Database Offline');
  return db.collection<T>(name);
}

// --- 4. API ROUTES ---
app.get('/api/echoes', async (_req, res) => {
  try {
    const echoes = isDbConnected 
      ? await getCollection<Echo>('echoes').find().sort({ timestamp: -1 }).limit(50).toArray()
      : [];
    res.json(echoes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch echoes' });
  }
});

app.post('/api/echoes', async (req: any, res: any) => {
  try {
    if (!isDbConnected) return res.status(503).json({ error: 'Sync unavailable' });
    const echo: Echo = {
      id: req.body.id || Date.now().toString(),
      authorId: req.body.authorId || '',
      authorName: req.body.authorName || '',
      title: req.body.title || '',
      content: req.body.content || '',
      timestamp: req.body.timestamp || Date.now(),
      stats: req.body.stats || { reads: 0, likes: 0, plays: 0 },
      tags: req.body.tags || []
    };
    await getCollection<Echo>('echoes').updateOne({ id: echo.id }, { $set: echo }, { upsert: true });
    res.status(201).json(echo);
  } catch (error) {
    res.status(400).json({ error: 'Invalid broadcast' });
  }
});

app.get('/api/messages/:userId', async (req: any, res: any) => {
  try {
    if (!isDbConnected) return res.json([]);
    const messages = await getCollection<Message>('messages')
      .find({ $or: [{ senderId: req.params.userId }, { receiverId: req.params.userId }] })
      .sort({ timestamp: 1 }).toArray();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Whisper history unreachable' });
  }
});

// --- 5. SOCKET ENGINE ---
io.on('connection', (socket: Socket) => {
  socket.on('join_circle', ({ roomId, userId, name }) => {
    socket.join(roomId);
    if (!activeRooms.has(roomId)) activeRooms.set(roomId, new Map());
    const room = activeRooms.get(roomId)!;
    room.set(socket.id, { socketId: socket.id, userId, name, isSpeaking: false });
    io.to(roomId).emit('presence_update', Array.from(room.values()));
  });

  socket.on('voice_activity', ({ roomId, isSpeaking }) => {
    const room = activeRooms.get(roomId);
    if (room?.has(socket.id)) {
      room.get(socket.id)!.isSpeaking = isSpeaking;
      io.to(roomId).emit('user_speaking', { socketId: socket.id, isSpeaking });
    }
  });

  socket.on('send_whisper', async (msgData: any) => {
    const message = {
      ...msgData,
      timestamp: Date.now(),
      isRead: false
    };
    if (isDbConnected) {
      try { await getCollection<Message>('messages').insertOne(message); } catch (e) {}
    }
    io.emit(`whisper_inbox_${msgData.receiverId}`, message);
  });

  socket.on('disconnect', () => {
    activeRooms.forEach((members, roomId) => {
      if (members.has(socket.id)) {
        members.delete(socket.id);
        io.to(roomId).emit('presence_update', Array.from(members.values()));
      }
    });
  });
});

// --- 6. STATIC FILES & SPA FALLBACK ---
const distPath = path.resolve(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Global SPA Fallback using regex to bypass Express 5 path-to-regexp parser bugs
app.get(/^(?!\/api).*$/, (req: any, res: any) => {
  const distIndex = path.join(distPath, 'index.html');
  const rootIndex = path.join(__dirname, 'index.html');
  const targetPath = fs.existsSync(distIndex) ? distIndex : rootIndex;

  if (fs.existsSync(targetPath)) {
    fs.readFile(targetPath, 'utf8', (err, html) => {
      if (err) return res.status(500).send('Integrity check failed.');
      const apiKey = process.env.API_KEY || '';
      const injection = `<script>window.process = { env: { API_KEY: ${JSON.stringify(apiKey)} } };</script>`;
      res.send(html.replace('<head>', `<head>${injection}`));
    });
  } else {
    res.status(404).send('Sanctuary Core Missing.');
  }
});

// Global Error Handler
// Fix: Use explicit path '/' and any casting for error handler middleware to avoid PathParams overload mismatch
app.use('/', (err: any, _req: any, res: any, _next: NextFunction) => {
  console.error('[CRITICAL] Sanctuary System Anomaly:', err);
  res.status(500).json({ error: 'Internal Temporal Resonance Error' });
});

// --- 7. STARTUP SEQUENCE ---
function startServer() {
  console.log('🚀 Initiating Sanctuary Engine on port', SERVER_PORT);
  
  // Bind to port IMMEDIATELY to pass platform health checks
  httpServer.listen(SERVER_PORT, '0.0.0.0', () => {
    console.log(`🌍 Sanctuary Online: http://0.0.0.0:${SERVER_PORT}`);
    console.log(`🔑 Key Injection Ready`);
    
    // Connect to database in the background
    connectToDatabase();
  });
}

// --- 8. LIFECYCLE ---
const shutdown = async (signal: string) => {
  console.log(`🛑 Received ${signal}. Closing Sanctuary...`);
  io.close();
  if (dbClient) await dbClient.close();
  httpServer.close(() => process.exit(0));
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();