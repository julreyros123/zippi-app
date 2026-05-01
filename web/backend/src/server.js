require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// --- Crash early if critical env vars are missing ---
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set in .env');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;
const ALLOWED_ORIGIN = process.env.CLIENT_URL || 'http://localhost:5173';
const ALLOWED_ORIGIN_MOBILE = process.env.MOBILE_URL || 'exp://127.0.0.1:19000';

// Whitelist allowed origins for CSRF protection
const allowedOrigins = [
  ALLOWED_ORIGIN,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

// Add production origins if env vars are set
if (process.env.NODE_ENV === 'production' && process.env.PRODUCTION_URL) {
  allowedOrigins.push(process.env.PRODUCTION_URL);
}

const app = express();
const server = http.createServer(app);

// --- Security Headers ---
app.use(helmet());

// --- CORS: Whitelist specific origins for CSRF protection ---
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true // Allow credentials (cookies, auth headers)
}));

app.use(express.json());

// --- Protect against HTTP Parameter Pollution attacks ---
app.use(hpp());

// --- Rate Limiters ---
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Reduced from 10000 to 1000 standard requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Reduced from 1000 to max 20 login/register attempts per 15 min for production
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again in 15 minutes.' },
});

const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Max 30 messages per minute per user
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages, please slow down.' },
  keyGenerator: (req) => req.user?.id || req.ip,
  skip: (req) => !req.user, // Only apply to authenticated users
});

const connectionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Max 20 connection requests per hour per user
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many connection requests, please try again later.' },
  keyGenerator: (req) => req.user?.id || req.ip,
  skip: (req) => !req.user,
});

app.use(globalLimiter);

// --- Socket.io: Restrict to known frontend origin ---
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// --- Online users tracking ---
const onlineUsers = new Map(); // userId -> Set of socket IDs

// --- Socket.io: JWT Auth middleware ---
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId} (${socket.id})`);

  // Track online user
  if (!onlineUsers.has(socket.userId)) {
    onlineUsers.set(socket.userId, new Set());
  }
  onlineUsers.get(socket.userId).add(socket.id);

  // Notify all users that this user is online
  io.emit('user_online', { userId: socket.userId });

  socket.on('join_channel', (channelId) => {
    socket.join(channelId);
    console.log(`User ${socket.userId} joined channel ${channelId}`);
  });

  socket.on('send_message', (data) => {
    // Use socket.to() NOT io.to() — sender already added via REST response,
    // so only broadcast to OTHER members of the channel
    socket.to(data.channelId).emit('receive_message', data);
  });

  socket.on('delete_message', ({ channelId, messageId }) => {
    socket.to(channelId).emit('message_deleted', { messageId });
  });

  socket.on('edit_message', (data) => {
    socket.to(data.channelId).emit('message_edited', data);
  });

  socket.on('typing', ({ channelId, username }) => {
    socket.to(channelId).emit('user_typing', { username });
  });

  socket.on('stop_typing', ({ channelId, username }) => {
    socket.to(channelId).emit('user_stopped_typing', { username });
  });

  socket.on('add_reaction', ({ channelId, messageId, emoji, username }) => {
    io.to(channelId).emit('receive_reaction', { messageId, emoji, username });
  });

  socket.on('notebook_update', ({ channelId, notebook }) => {
    socket.to(channelId).emit('notebook_updated', { notebook });
  });

  socket.on('dashboard_update', ({ type, targetUserId }) => {
    socket.broadcast.emit('dashboard_update', { type, targetUserId });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId} (${socket.id})`);

    // Remove from online tracking
    const userSockets = onlineUsers.get(socket.userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        onlineUsers.delete(socket.userId);
        // Notify all users that this user is offline
        io.emit('user_offline', { userId: socket.userId });
      }
    }
  });
});

// Export online users for use in controllers
global.onlineUsers = onlineUsers;

// --- Routes ---
const authRoutes = require('./routes/auth');
const channelsRoutes = require('./routes/channels');
const messagesRoutes = require('./routes/messages');
const usersRoutes = require('./routes/users');
const connectionsRoutes = require('./routes/connections');
const eventsRoutes = require('./routes/events');
const announcementsRoutes = require('./routes/announcements');
const uploadRoutes = require('./routes/upload');

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Zippi Backend is running' });
});

// Serve uploaded files
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Apply strict rate limit to auth endpoints
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/channels', channelsRoutes);
app.use('/api/channels', messagesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/connections', connectionsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/upload', uploadRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS allowed origin: ${ALLOWED_ORIGIN}`);
});

// Export io for use in controllers
module.exports = { io, messageLimiter, connectionLimiter };
