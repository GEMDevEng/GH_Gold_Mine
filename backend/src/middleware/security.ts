import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { logger } from '../config/logger';

/**
 * Security headers middleware using Helmet
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.github.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for development
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

/**
 * Request sanitization middleware
 */
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction) => {
  // Remove potentially dangerous characters from query parameters
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        // Remove script tags and other dangerous patterns
        req.query[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .trim();
      }
    }
  }

  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  next();
};

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): void {
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      obj[key] = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    } else if (typeof value === 'object' && value !== null) {
      sanitizeObject(value);
    }
  }
}

/**
 * IP whitelist middleware for sensitive operations
 */
export const ipWhitelist = (allowedIPs: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (allowedIPs.length === 0) {
      return next(); // No restrictions if no IPs specified
    }

    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    if (!clientIP || !allowedIPs.includes(clientIP)) {
      logger.warn(`Access denied for IP: ${clientIP}`, { 
        path: req.path, 
        method: req.method,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Your IP address is not authorized to access this resource',
      });
    }

    next();
  };
};

/**
 * Request size limiter middleware
 */
export const requestSizeLimiter = (maxSizeBytes: number = 1024 * 1024) => { // 1MB default
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('content-length') || '0');

    if (contentLength > maxSizeBytes) {
      logger.warn(`Request too large: ${contentLength} bytes`, {
        path: req.path,
        method: req.method,
        maxAllowed: maxSizeBytes
      });

      res.status(413).json({
        success: false,
        error: 'Request too large',
        message: `Request size exceeds maximum allowed size of ${maxSizeBytes} bytes`,
      });
      return;
    }

    next();
  };
};

/**
 * User agent validation middleware
 */
export const validateUserAgent = (req: Request, res: Response, next: NextFunction): void => {
  const userAgent = req.get('User-Agent');

  if (!userAgent) {
    logger.warn('Request without User-Agent header', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });

    res.status(400).json({
      success: false,
      error: 'Bad request',
      message: 'User-Agent header is required',
    });
    return;
  }

  // Block known malicious user agents
  const maliciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nessus/i,
    /burp/i,
    /nmap/i,
    /masscan/i,
    /zap/i,
    /acunetix/i,
  ];

  if (maliciousPatterns.some(pattern => pattern.test(userAgent))) {
    logger.warn(`Blocked malicious User-Agent: ${userAgent}`, {
      path: req.path,
      method: req.method,
      ip: req.ip
    });

    res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'Request blocked',
    });
    return;
  }

  next();
};

/**
 * Request method validation middleware
 */
export const validateRequestMethod = (allowedMethods: string[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!allowedMethods.includes(req.method)) {
      logger.warn(`Invalid request method: ${req.method}`, {
        path: req.path,
        ip: req.ip,
        allowedMethods
      });

      res.status(405).json({
        success: false,
        error: 'Method not allowed',
        message: `Method ${req.method} is not allowed for this endpoint`,
      });
      return;
    }

    next();
  };
};

/**
 * Security logging middleware
 */
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  // Log security-relevant information
  const securityInfo = {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer'),
    origin: req.get('Origin'),
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString(),
  };

  // Log suspicious patterns
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /union.*select/i,  // SQL injection
    /<script/i,  // XSS
    /javascript:/i,  // XSS
    /eval\(/i,  // Code injection
    /exec\(/i,  // Code injection
  ];

  const requestString = JSON.stringify(req.query) + JSON.stringify(req.body);
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(requestString));

  if (isSuspicious) {
    logger.warn('Suspicious request detected', { 
      ...securityInfo,
      query: req.query,
      body: req.body
    });
  }

  next();
};

/**
 * CORS configuration for production
 */
export const corsConfig = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

/**
 * Production security middleware stack
 */
export const productionSecurity = [
  securityHeaders,
  sanitizeRequest,
  validateUserAgent,
  securityLogger,
  requestSizeLimiter(),
];
