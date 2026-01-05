import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { MongoClient, ServerApiVersion, Collection, Db, Document } from 'mongodb';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import cors from 'cors';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * AURA & ECHO - PRODUCTION ENGINE
 * Refactored for extreme stability and rapid health-check response.
 */

// --- EMERGENCY CRASH HANDLERS ---
process.on('uncaughtException', (err) => {
  console.error('[FATAL ERROR] Uncaught Exception:', err);
  // Don't exit in production, let the process manager handle it
  if (process.env.NODE_ENV === 'development') process.exit(1);
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

interface Message {
  senderId: string;
  receiverId: string;
  cipherText: string;
  timestamp: number;
  type: string;
  sharedCircleId?: string;
  isRead: boolean;
}

interface Echo {
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
  reads: number;
  likes: number;
  plays: number;
  tags: string[];
}

// --- INITIALIZATION ---
const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { 
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.ALLOWED_ORIGINS?.split(',') || []
      : '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

const SERVER_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'unheard';

let dbClient: MongoClient | null = null;
let db: Db | null = null;
let isDbConnected = false;
const activeRooms = new Map<string, Map<string, User>>();

// --- 1. MIDDLEWARES ---
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || []
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request Logging Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// --- 2. HEALTH CHECK ---
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'online',
    database: isDbConnected ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  });
});

// --- 3. DATABASE CONNECTION ---
async function connectToDatabase() {
  if (dbClient && isDbConnected) return;
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    const client = new MongoClient(MONGO_URI, {
      serverApi: { 
        version: ServerApiVersion.v1, 
        strict: true, 
        deprecationErrors: true 
      },
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });
    
    await client.connect();
    
    // Verify connection
    await client.db('admin').command({ ping: 1 });
    
    dbClient = client;
    db = client.db(DB_NAME);
    isDbConnected = true;
    
    // Set up error handlers
    client.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      isDbConnected = false;
    });
    
    client.on('disconnected', () => {
      console.log('MongoDB connection lost');
      isDbConnected = false;
    });
    
    console.log('✅ MongoDB Connected');
    return db;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    isDbConnected = false;
    // Don't throw, allow server to start in limited mode
    return null;
  }
}

function getCollection<T extends Document>(name: string): Collection<T> {
  if (!db || !isDbConnected) {
    throw new Error('Database connection not available');
  }
  return db.collection<T>(name);
}

// --- 4. API ROUTES ---

app.get('/api/echoes', async (_req: Request, res: Response) => {
  try {
    const echoes = isDbConnected 
      ? await getCollection<Echo>('echoes')
          .find()
          .sort({ timestamp: -1 })
          .limit(50)
          .toArray()
      : [];
    res.json(echoes);
  } catch (error: unknown) {
    console.error('Error fetching echoes:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    const errorResponse: { error: string; details?: string } = {
      error: 'Failed to retrieve echoes',
    };
    
    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = errorMessage;
    }
    
    res.status(500).json(errorResponse);
  }
});

app.post('/api/echoes', async (req: Request, res: Response) => {
  if (!isDbConnected) {
    return res.status(503).json({ 
      error: 'Service temporarily unavailable',
      details: 'Database connection not available'
    });
  }

  try {
    const echo: Echo = {
      id: req.body.id || Date.now().toString(),
      authorId: req.body.authorId || '',
      authorName: req.body.authorName || 'Anonymous',
      title: req.body.title || '',
      content: req.body.content || '',
      timestamp: Date.now(),
      stats: {
        reads: 0,
        likes: 0,
        plays: 0
      },
      reads: 0,
      likes: 0,
      plays: 0,
      tags: Array.isArray(req.body.tags) ? req.body.tags : []
    };
    
    const result = await getCollection<Echo>('echoes').insertOne(echo);
    res.status(201).json({ ...echo, _id: result.insertedId });
  } catch (error: unknown) {
    console.error('Error creating echo:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    const errorResponse: { error: string; details?: string } = {
      error: 'Failed to create echo',
    };
    
    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = errorMessage;
    }
    
    res.status(500).json(errorResponse);
  }
});

app.get('/api/messages/:userId', async (req: Request, res: Response) => {
  if (!isDbConnected) {
    return res.json([]);
  }

  try {
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
  } catch (error: unknown) {
    console.error('Error fetching messages:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    const errorResponse: { error: string; details?: string } = {
      error: 'Failed to retrieve messages',
    };
    
    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = errorMessage;
    }
    
    res.status(500).json(errorResponse);
  }
});

// --- 5. WEBSOCKET CONNECTIONS ---

io.on('connection', (socket: Socket) => {
  console.log('New connection:', socket.id);

  socket.on('join_room', (roomId: string, user: User) => {
    try {
      if (!roomId || !user || !user.userId) {
        throw new Error('Invalid room or user data');
      }
      
      socket.join(roomId);
      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, new Map());
      }
      
      activeRooms.get(roomId)?.set(socket.id, { 
        ...user, 
        socketId: socket.id 
      });
      
      io.to(roomId).emit('presence_update', 
        Array.from(activeRooms.get(roomId)?.values() || [])
      );
    } catch (error) {
      console.error('Error in join_room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  socket.on('send_whisper', async (msgData: any) => {
    try {
      if (!msgData || !msgData.receiverId || !msgData.senderId) {
        throw new Error('Invalid message data');
      }
      
      const message = {
        ...msgData,
        timestamp: Date.now(),
        isRead: false
      };
      
      if (isDbConnected) {
        await getCollection<Message>('messages').insertOne(message);
      }
      
      io.to(msgData.receiverId).emit('receive_whisper', message);
    } catch (error) {
      console.error('Error sending whisper:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('disconnect', () => {
    activeRooms.forEach((members, roomId) => {
      if (members.has(socket.id)) {
        members.delete(socket.id);
        io.to(roomId).emit('presence_update', Array.from(members.values()));
        
        // Clean up empty rooms
        if (members.size === 0) {
          activeRooms.delete(roomId);
        }
      }
    });
  });
  
  // Heartbeat to keep connection alive
  const heartbeatInterval = setInterval(() => {
    socket.emit('ping');
  }, 30000);
  
  socket.on('pong', () => {
    // Connection is alive
  });
  
  socket.on('disconnect', () => {
    clearInterval(heartbeatInterval);
  });
});

// --- 6. STATIC FILES & SPA FALLBACK ---
const distPath = path.resolve(__dirname, 'dist');
const publicPath = path.resolve(__dirname, 'public');

// Serve static files from dist directory (production) or public (development)
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, { maxAge: '1y' }));
} else if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath, { maxAge: '1h' }));
}

// API 404 handler
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// SPA Fallback - must be the last route
app.get('*', (req: Request, res: Response) => {
  // Don't serve HTML for API requests
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  const indexPath = path.join(
    fs.existsSync(distPath) ? distPath : __dirname,
    'index.html'
  );
  
  if (!fs.existsSync(indexPath)) {
    return res.status(500).send('Application frontend not found');
  }
  
  // Inject environment variables if needed
  fs.readFile(indexPath, 'utf8', (err, html) => {
    if (err) {
      console.error('Error reading index.html:', err);
      return res.status(500).send('Error loading application');
    }
    
    // Inject environment variables
    const envScript = `
      <script>
        window.env = ${JSON.stringify({
          NODE_ENV: process.env.NODE_ENV,
          API_URL: process.env.API_URL || '',
          SOCKET_URL: process.env.SOCKET_URL || '',
          // Add other public env vars here
        })};
      </script>
    `;
    
    const injectedHtml = html.replace('</head>', `${envScript}</head>`);
    res.send(injectedHtml);
  });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Global error handler:', err);
  
  if (res.headersSent) {
    return next(err);
  }
  
  const statusCode = err.status || 500;
  const errorResponse = {
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };
  
  res.status(statusCode).json(errorResponse);
});

// --- 7. START SERVER ---
async function startServer() {
  try {
    // Connect to database
    await connectToDatabase();
    
    // Start the server
    const server = httpServer.listen(SERVER_PORT, '0.0.0.0', () => {
      const address = server.address();
      const host = typeof address === 'string' ? address : `${address?.address}:${address?.port}`;
      console.log(`🚀 Server running at http://${host}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔌 Database: ${isDbConnected ? 'Connected' : 'Disconnected'}`);
      console.log(`📡 WebSocket: ${io.engine.clientsCount} active connections`);
    });
    
    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.syscall !== 'listen') throw error;
      
      switch (error.code) {
        case 'EACCES':
          console.error(`Port ${SERVER_PORT} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          console.error(`Port ${SERVER_PORT} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });
    
    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
      
      // Close WebSocket connections
      io.close(() => {
        console.log('✅ WebSocket server closed');
      });
      
      // Close database connection
      if (dbClient) {
        await dbClient.close();
        console.log('✅ MongoDB connection closed');
      }
      
      // Close HTTP server
      server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
      });
      
      // Force exit after timeout
      setTimeout(() => {
        console.warn('⚠️ Forcing shutdown...');
        process.exit(1);
      }, 10000);
    };
    
    // Handle signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      shutdown('uncaughtException');
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();