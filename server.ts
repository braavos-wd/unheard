import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { MongoClient, ServerApiVersion, Collection, Db, Document } from 'mongodb';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import cors from 'cors';

// ES Modules equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Type definitions
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

// Initialize Express app
const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Configuration
const SERVER_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sanctuary';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Database connection
let dbClient: MongoClient;
let db: Db;
let isDbConnected = false;
const activeRooms = new Map<string, Map<string, User>>();

// Middleware
// @ts-ignore
app.use(cors());
app.use(express.json());

// Request logging
app.use((req: any, _res: any, next: NextFunction) => {
  if (req.path !== '/health') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// Database connection
async function connectToDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    dbClient = new MongoClient(MONGODB_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });

    await dbClient.connect();
    db = dbClient.db();
    isDbConnected = true;
    console.log('✅ Connected to MongoDB');
    
    // Test the connection
    await db.command({ ping: 1 });
  } catch (error) {
    isDbConnected = false;
    console.error('❌ MongoDB connection error:', error);
    console.warn('⚠️  Running in offline mode - database features disabled');
  }
}

// Database collections
function getCollection<T extends Document>(name: string): Collection<T> {
  if (!isDbConnected) {
    throw new Error('Database not connected');
  }
  return db.collection<T>(name);
}

// Health check endpoint
app.get('/health', (_req: any, res: any) => {
  res.json({
    status: 'ok',
    database: isDbConnected ? 'connected' : 'disconnected',
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// API Endpoints
app.get('/api/echoes', async (_req: any, res: any) => {
  try {
    const echoes = isDbConnected 
      ? await getCollection<Echo>('echoes')
          .find()
          .sort({ timestamp: -1 })
          .limit(50)
          .toArray()
      : [];
    res.json(echoes);
  } catch (error) {
    console.error('Error fetching echoes:', error);
    res.status(500).json({ error: 'Failed to fetch echoes' });
  }
});

app.post('/api/echoes', async (req: any, res: any): Promise<void> => {
  try {
    if (!isDbConnected) {
      res.status(503).json({ error: 'Database unavailable' });
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

    await getCollection<Echo>('echoes').updateOne(
      { id: echo.id },
      { $set: echo },
      { upsert: true }
    );

    res.status(201).json(echo);
  } catch (error) {
    console.error('Error saving echo:', error);
    res.status(400).json({ error: 'Failed to save echo' });
  }
});

app.get('/api/messages/:userId', async (req: any, res: any): Promise<void> => {
  try {
    if (!isDbConnected) {
      res.json([]);
      return;
    }
    
    const messages = await getCollection<Message>('messages')
      .find({
        $or: [
          { senderId: req.params.userId },
          { receiverId: req.params.userId }
        ]
      })
      .sort({ timestamp: 1 })
      .toArray();
      
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// WebSocket connection handling
io.on('connection', (socket: Socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('join_circle', ({ roomId, userId, name }) => {
    socket.join(roomId);
    if (!activeRooms.has(roomId)) {
      activeRooms.set(roomId, new Map());
    }
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
    };

    if (isDbConnected) {
      try {
        await getCollection<Message>('messages').insertOne(message);
      } catch (error) {
        console.error('Error saving message:', error);
      }
    }

    io.emit(`whisper_inbox_${msgData.receiverId}`, message);
  });

  socket.on('disconnect', () => {
    activeRooms.forEach((members, roomId) => {
      if (members.has(socket.id)) {
        members.delete(socket.id);
        io.to(roomId).emit('presence_update', Array.from(members.values()));
        if (members.size === 0) {
          activeRooms.delete(roomId);
        }
      }
    });
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// 4. STATIC ASSETS & SPA FALLBACK
const distPath = path.join(__dirname, 'dist');

// Serve static assets
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

/**
 * SPA FALLBACK CATCH-ALL
 * FIX: In Express 5, the raw '*' wildcard throws "Missing parameter name".
 * We use '/:path*' which is the named equivalent for catch-all routing.
 */
app.get('/:path*', (req: any, res: any) => {
  // Ignore API requests in the catch-all
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }

  const indexPath = path.join(distPath, 'index.html');
  const rootIndexPath = path.join(__dirname, 'index.html');
  const finalPath = fs.existsSync(indexPath) ? indexPath : rootIndexPath;

  if (fs.existsSync(finalPath)) {
    // Read and inject the API_KEY so it's available in the browser via process.env.API_KEY
    fs.readFile(finalPath, 'utf8', (err, html) => {
      if (err) {
        return res.status(500).send('Sanctuary Loading Error');
      }
      const injection = `<script>window.process = { env: { API_KEY: ${JSON.stringify(process.env.API_KEY || '')} } };</script>`;
      res.send(html.replace('<head>', `<head>${injection}`));
    });
  } else {
    res.status(404).send('Sanctuary Offline - Index not found');
  }
});

// Error handling middleware
app.use((err: any, _req: any, res: any, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal sanctuary engine error' });
});

// Graceful shutdown
const shutdown = async () => {
  console.log('🛑 Shutting down server...');
  io.close();
  if (isDbConnected && dbClient) {
    await dbClient.close();
  }
  httpServer.close(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server
async function startServer() {
  await connectToDatabase();
  
  httpServer.listen(SERVER_PORT, '0.0.0.0', () => {
    console.log(`🚀 Sanctuary Server running on port ${SERVER_PORT}`);
    console.log(`💾 Database: ${isDbConnected ? 'Connected' : 'Disconnected'}`);
  });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});