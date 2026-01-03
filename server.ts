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
 * Refactored for extreme stability and observability.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- EMERGENCY CRASH HANDLERS ---
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
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

// --- BOOTSTRAP ---
const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const SERVER_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sanctuary';

let dbClient: MongoClient;
let db: Db;
let isDbConnected = false;
const activeRooms = new Map<string, Map<string, User>>();

// --- 1. CRITICAL: HIGH-PRIORITY HEALTH CHECK ---
// Define this BEFORE any complex middleware to ensure the load balancer gets a 200 fast.
app.get('/health', (_req: any, res: any) => {
  res.status(200).json({
    status: 'online',
    database: isDbConnected ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// --- 2. MIDDLEWARES ---
// Fix: Use explicit path '/' to satisfy Express type overloads and avoid PathParams mismatch
app.use('/', cors());
app.use(express.json());

// Request Logging
app.use((req: any, _res: any, next: NextFunction) => {
  if (req.path !== '/health') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// --- 3. DATABASE CONNECTION ---
async function connectToDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB Sanctuary...');
    dbClient = new MongoClient(MONGODB_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
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
  if (!isDbConnected) throw new Error('Database Offline');
  return db.collection<T>(name);
}

// --- 4. API ROUTES ---

app.get('/api/echoes', async (_req: any, res: any) => {
  try {
    const echoes = isDbConnected 
      ? await getCollection<Echo>('echoes').find().sort({ timestamp: -1 }).limit(50).toArray()
      : [];
    res.json(echoes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch echoes' });
  }
});

app.post('/api/echoes', async (req: any, res: any): Promise<void> => {
  try {
    if (!isDbConnected) {
      res.status(503).json({ error: 'Sync unavailable' });
      return;
    }
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

app.get('/api/messages/:userId', async (req: any, res: any): Promise<void> => {
  try {
    if (!isDbConnected) {
      res.json([]);
      return;
    }
    const messages = await getCollection<Message>('messages')
      .find({ $or: [{ senderId: req.params.userId }, { receiverId: req.params.userId }] })
      .sort({ timestamp: 1 })
      .toArray();
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
    const message: Message = {
      senderId: msgData.senderId || '',
      receiverId: msgData.receiverId || '',
      cipherText: msgData.cipherText || '',
      timestamp: Date.now(),
      type: msgData.type || 'text',
      sharedCircleId: msgData.sharedCircleId,
      isRead: false
    } as any;
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
        if (members.size === 0) activeRooms.delete(roomId);
      }
    });
  });
});

// --- 6. STATIC ASSETS & SPA TERMINATION ---
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

/**
 * WORLD-CLASS SPA FALLBACK
 * We use a terminal middleware instead of a wildcard string ('*') to avoid
 * Express 5 path-to-regexp v8 crashes.
 */
// Fix: Added explicit path '/' and NextFunction to the signature to satisfy Express RequestHandler overloads
app.use('/', (req: Request, res: Response, _next: NextFunction) => {
  // Guard: Never serve HTML for missing API endpoints
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found in Sanctuary records' });
  }

  const distIndex = path.join(distPath, 'index.html');
  const rootIndex = path.join(__dirname, 'index.html');
  const targetPath = fs.existsSync(distIndex) ? distIndex : rootIndex;

  if (!fs.existsSync(targetPath)) {
    return res.status(500).send('Sanctuary Configuration Error: No index.html found');
  }

  return fs.readFile(targetPath, 'utf8', (err, html) => {
    if (err) {
      console.error('[SPA ERROR] Could not read index.html:', err);
      return res.status(500).send('Sanctuary Integrity Failure');
    }
    return res.status(200).send(html);
  });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[SYSTEM ANOMALY]', err);
  res.status(500).json({ error: 'Internal Temporal Resonance Error' });
});

// --- 7. LIFECYCLE ---
const shutdown = async (signal: string) => {
  console.log(`🛑 Received ${signal}. Shutting down Sanctuary...`);
  io.close();
  if (isDbConnected && dbClient) {
    try {
      await dbClient.close();
      console.log('✅ Database connection closed.');
    } catch (e) {
      console.error('❌ Error closing database:', e);
    }
  }
  httpServer.close(() => {
    console.log('✅ HTTP Server closed. Exit 0.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM')); process.on('SIGINT', () => shutdown('SIGINT'));

async function startServer() {
  console.log('🚀 Initiating Sanctuary Engine...');
  await connectToDatabase();
  
  httpServer.listen(SERVER_PORT, '0.0.0.0', () => {
    console.log(`🌍 Sanctuary Online: http://0.0.0.0:${SERVER_PORT}`);
    console.log(`🔑 Key Injection Ready`);
  });
}

startServer().catch(e => {
  console.error('Fatal Startup Error:', e);
  process.exit(1);
});
