// File: src/index.ts
import express, { Request, Response, RequestHandler } from 'express';
import { launchRouter } from './routes/pumpfun/pumpfunLaunch';
// import { buildCompressedNftListingTx } from './utils/compressedNftListing';
import tokenMillRouter from './routes/tokenmill/tokenMillRoutes';
import { pumpSwapRouter } from './routes/pumpfun/pumpSwapRoutes';
import http from 'http';
import cors from 'cors';
import meteoraDBCRouter from './routes/meteora/meteoraDBCRoutes';
import { setupConnection } from './utils/connection';
import raydiumLaunchpadRoutes from './routes/raydium/launchpad.routes';
import tokenRoutes from './routes/tokenRoutes';
import userRoutes from './routes/userRoutes';
import * as UserController from './controllers/userController';
import { runMigrations, generateMigrationInstructions } from './db/migration';

const app = express();
app.use(express.json({ limit: '10mb' }));

// Set trust proxy for App Engine environment
// This is critical to make WebSockets work behind App Engine's proxy
app.set('trust proxy', true);

// Add CORS middleware with expanded options for WebSocket
const corsOptions = {
  origin: '*', // Or restrict to specific origins in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Forwarded-Proto', 'X-Requested-With', 'Accept'],
  credentials: true,
  maxAge: 86400 // 24 hours for preflight cache
};
app.use(cors(corsOptions));

// Create HTTP server for Socket.IO
const server = http.createServer(app);

// Use the routes
app.use('/api/pumpfun', launchRouter);
app.use('/api/raydium/launchpad', raydiumLaunchpadRoutes);
app.use('/api/pump-swap', pumpSwapRouter);
app.use('/api', tokenMillRouter);
app.use('/api/meteora', meteoraDBCRouter);
app.use('/api/tokens', tokenRoutes);
app.use('/api/users', userRoutes);

// Add profile routes that map to user controller functions
// This maintains backward compatibility with any existing frontend code
app.get('/api/profile', UserController.getUserProfile as unknown as RequestHandler);
app.post('/api/profile/createUser', UserController.createOrUpdateUser as unknown as RequestHandler);
app.post('/api/profile/updateUsername', UserController.updateUsername as unknown as RequestHandler);
app.post('/api/profile/updateDescription', UserController.updateDescription as unknown as RequestHandler);
app.delete('/api/profile/delete-account', UserController.deleteAccount as unknown as RequestHandler);

// Add route to manually trigger migrations (useful for deployment)
app.post('/api/admin/run-migrations', async (req, res) => {
  try {
    await runMigrations();
    res.status(200).json({ success: true, message: 'Migrations completed successfully' });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ success: false, error: 'Failed to run migrations' });
  }
});

// Add a route to get migration SQL instructions
app.get('/api/admin/migration-instructions', async (req, res) => {
  try {
    const instructionsPath = generateMigrationInstructions();
    // Return the SQL for each migration
    const fs = require('fs');
    const instructions = fs.readFileSync(instructionsPath, 'utf8');
    res.status(200).json({ success: true, instructions });
  } catch (error) {
    console.error('Error generating migration instructions:', error);
    res.status(500).json({ success: false, error: 'Failed to generate migration instructions' });
  }
});

// Setup connection to Solana
setupConnection();

// Start the Express server.
// Note: We now try connecting to the database and running migrations,
// but if these fail we log the error and continue to start the server.
const PORT = process.env.PORT || 8080;

(async function startServer() {
  // Try to run migrations on startup
  try {
    console.log('Attempting to run database migrations...');
    await runMigrations();
    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations on startup:', error);
    console.log('Generating migration instructions instead...');
    try {
      const instructionsPath = generateMigrationInstructions();
      console.log(`Please run the SQL manually using the instructions at: ${instructionsPath}`);
    } catch (err) {
      console.error('Failed to generate migration instructions:', err);
    }
    console.log('Continuing server startup despite migration failure...');
  }
  
  // Use the HTTP server instead of app.listen
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Server started at: ${new Date().toISOString()}`);
  });
})();
