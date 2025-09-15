import dotenv from 'dotenv';
import { createApp, startServer, setupProcessHandlers } from './server';

// Load environment variables
dotenv.config();

// Create and start the server
const app = createApp();
setupProcessHandlers();
startServer(app);
