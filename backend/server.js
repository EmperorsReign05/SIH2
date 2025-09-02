const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
require('dotenv').config();

// Database
const knex = require('./config/database');
const { Model } = require('objection');

// Web3 and Blockchain
const { ethers } = require('ethers');
const Web3 = require('web3');

// IPFS
const { create } = require('ipfs-http-client');

// Routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const fieldDataRoutes = require('./routes/fieldData');
const carbonCreditsRoutes = require('./routes/carbonCredits');
const verificationRoutes = require('./routes/verification');
const analyticsRoutes = require('./routes/analytics');
const blockchainRoutes = require('./routes/blockchain');

// Middleware
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Initialize app
const app = express();
const PORT = process.env.PORT || 3001;

// Set up Objection.js
Model.knex(knex);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes, then...
  delayMs: 500 // begin adding 500ms of delay per request above 50
});

app.use(limiter);
app.use(speedLimiter);

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);
app.use('/api/field-data', authMiddleware, fieldDataRoutes);
app.use('/api/carbon-credits', authMiddleware, carbonCreditsRoutes);
app.use('/api/verification', authMiddleware, verificationRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);
app.use('/api/blockchain', authMiddleware, blockchainRoutes);

// Web3 Provider Setup
const setupWeb3 = () => {
  try {
    const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
    const web3 = new Web3(process.env.POLYGON_RPC_URL);
    
    // Store in app.locals for route access
    app.locals.web3 = web3;
    app.locals.ethersProvider = provider;
    
    logger.info('Web3 provider initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Web3 provider:', error);
  }
};

// IPFS Setup
const setupIPFS = async () => {
  try {
    const ipfs = create({
      host: process.env.IPFS_HOST || 'ipfs.infura.io',
      port: process.env.IPFS_PORT || 5001,
      protocol: process.env.IPFS_PROTOCOL || 'https',
    });
    
    app.locals.ipfs = ipfs;
    logger.info('IPFS client initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize IPFS client:', error);
  }
};

// Database connection test
const testDatabaseConnection = async () => {
  try {
    await knex.raw('SELECT 1');
    logger.info('Database connection successful');
  } catch (error) {
    logger.error('Database connection failed:', error);
    process.exit(1);
  }
};

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    knex.destroy(() => {
      logger.info('Database connection closed');
      process.exit(0);
    });
  });
};

// Start server
const server = app.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  
  // Initialize services
  await testDatabaseConnection();
  setupWeb3();
  await setupIPFS();
  
  logger.info('Blue Carbon MRV Backend initialized successfully');
});

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;
