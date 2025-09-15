import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { logger } from './logger';
import { productionSecurity, corsConfig } from '../middleware/security';
import { performanceMiddleware } from '../services/performanceService';
import {
  apiPerformanceMiddleware,
  memoryTrackingMiddleware,
  errorTrackingMiddleware,
  rateLimitTrackingMiddleware
} from '../middleware/performanceMiddleware';

export function configureMiddleware(app: express.Application): void {
  // Security middleware
  if (process.env.NODE_ENV === 'production') {
    app.use(productionSecurity);
  } else {
    // Development security (less restrictive)
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
  }

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(limiter);

  // CORS configuration
  if (process.env.NODE_ENV === 'production') {
    app.use(cors(corsConfig));
  } else {
    // Development CORS (more permissive)
    app.use(cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));
  }

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Performance monitoring middleware
  app.use(performanceMiddleware);
  app.use(apiPerformanceMiddleware);
  app.use(memoryTrackingMiddleware);
  app.use(rateLimitTrackingMiddleware);

  // Logging middleware
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path} - ${req.ip}`);
    next();
  });
}
