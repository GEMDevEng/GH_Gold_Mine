/**
 * Frontend security utilities and middleware
 */

import { securityValidation } from '../hooks/useValidation';

/**
 * Content Security Policy utilities
 */
export const CSP = {
  // Check if a URL is safe to load
  isSafeUrl: (url: string): boolean => {
    try {
      const parsedUrl = new URL(url);
      
      // Only allow HTTPS and HTTP protocols
      if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
        return false;
      }
      
      // Block known malicious domains (basic list)
      const blockedDomains = [
        'malware.com',
        'phishing.com',
        'suspicious.net'
      ];
      
      return !blockedDomains.some(domain => 
        parsedUrl.hostname.includes(domain)
      );
    } catch {
      return false;
    }
  },

  // Sanitize URL for safe usage
  sanitizeUrl: (url: string): string | null => {
    if (!CSP.isSafeUrl(url)) {
      return null;
    }
    
    try {
      const parsedUrl = new URL(url);
      // Remove any dangerous query parameters
      parsedUrl.searchParams.delete('javascript');
      parsedUrl.searchParams.delete('vbscript');
      return parsedUrl.toString();
    } catch {
      return null;
    }
  }
};

/**
 * Input sanitization for different contexts
 */
export const InputSanitizer = {
  // Sanitize for display in HTML
  forDisplay: (input: string): string => {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  // Sanitize for use in attributes
  forAttribute: (input: string): string => {
    return input
      .replace(/[<>"'&]/g, (match) => {
        const entities: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return entities[match] || match;
      });
  },

  // Sanitize for use in JavaScript contexts
  forJavaScript: (input: string): string => {
    return input
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  },

  // Sanitize for use in CSS
  forCSS: (input: string): string => {
    return input.replace(/[<>"'&\\]/g, '\\$&');
  }
};

/**
 * Rate limiting for client-side operations
 */
export class ClientRateLimit {
  private attempts: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxAttempts: number;

  constructor(windowMs: number = 60000, maxAttempts: number = 5) {
    this.windowMs = windowMs;
    this.maxAttempts = maxAttempts;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < this.windowMs);
    
    if (validAttempts.length >= this.maxAttempts) {
      return false;
    }

    // Record this attempt
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);
    
    return true;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }

  getRemainingAttempts(key: string): number {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    const validAttempts = attempts.filter(time => now - time < this.windowMs);
    
    return Math.max(0, this.maxAttempts - validAttempts.length);
  }
}

/**
 * Session security utilities
 */
export const SessionSecurity = {
  // Generate a secure session ID
  generateSessionId: (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },

  // Check if session is expired
  isSessionExpired: (timestamp: number, maxAge: number = 24 * 60 * 60 * 1000): boolean => {
    return Date.now() - timestamp > maxAge;
  },

  // Secure token storage
  storeToken: (token: string, key: string = 'authToken'): void => {
    try {
      // Add timestamp for expiration checking
      const tokenData = {
        token,
        timestamp: Date.now(),
        fingerprint: SessionSecurity.generateFingerprint()
      };
      
      localStorage.setItem(key, JSON.stringify(tokenData));
    } catch (error) {
      console.error('Failed to store token:', error);
    }
  },

  // Retrieve and validate token
  getToken: (key: string = 'authToken'): string | null => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const tokenData = JSON.parse(stored);
      
      // Check if token is expired
      if (SessionSecurity.isSessionExpired(tokenData.timestamp)) {
        localStorage.removeItem(key);
        return null;
      }

      // Check fingerprint for session hijacking protection
      if (tokenData.fingerprint !== SessionSecurity.generateFingerprint()) {
        localStorage.removeItem(key);
        return null;
      }

      return tokenData.token;
    } catch (error) {
      console.error('Failed to retrieve token:', error);
      return null;
    }
  },

  // Generate browser fingerprint for session validation
  generateFingerprint: (): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Browser fingerprint', 2, 2);
    }
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(36);
  }
};

/**
 * Form security utilities
 */
export const FormSecurity = {
  // Generate CSRF token
  generateCSRFToken: (): string => {
    return SessionSecurity.generateSessionId();
  },

  // Validate form submission timing (prevent automated attacks)
  validateSubmissionTiming: (startTime: number, minTime: number = 1000): boolean => {
    const elapsed = Date.now() - startTime;
    return elapsed >= minTime;
  },

  // Check for suspicious form behavior
  detectSuspiciousActivity: (formData: Record<string, any>): boolean => {
    // Check for common bot patterns
    const suspiciousPatterns = [
      // Honeypot fields (should be empty)
      formData.honeypot && formData.honeypot !== '',
      
      // Too many fields filled too quickly
      Object.keys(formData).length > 20,
      
      // Suspicious content
      Object.values(formData).some(value => 
        typeof value === 'string' && !securityValidation.isSafe(value)
      )
    ];

    return suspiciousPatterns.some(Boolean);
  }
};

/**
 * Error handling security
 */
export const SecureErrorHandler = {
  // Sanitize error messages for display
  sanitizeErrorMessage: (error: any): string => {
    if (typeof error === 'string') {
      return InputSanitizer.forDisplay(error);
    }
    
    if (error instanceof Error) {
      return InputSanitizer.forDisplay(error.message);
    }
    
    return 'An unexpected error occurred';
  },

  // Log security events
  logSecurityEvent: (event: string, details: Record<string, any> = {}): void => {
    const securityLog = {
      timestamp: new Date().toISOString(),
      event,
      details: {
        ...details,
        userAgent: navigator.userAgent,
        url: window.location.href,
        fingerprint: SessionSecurity.generateFingerprint()
      }
    };

    // In production, this should be sent to a security monitoring service
    console.warn('Security Event:', securityLog);
  }
};

/**
 * Global security middleware
 */
export const SecurityMiddleware = {
  // Initialize security measures
  initialize: (): void => {
    // Set up global error handler
    window.addEventListener('error', (event) => {
      SecureErrorHandler.logSecurityEvent('javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Set up unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      SecureErrorHandler.logSecurityEvent('unhandled_promise_rejection', {
        reason: event.reason
      });
    });

    // Monitor for suspicious activity
    SecurityMiddleware.monitorSuspiciousActivity();
  },

  // Monitor for suspicious activity
  monitorSuspiciousActivity: (): void => {
    let rapidClickCount = 0;
    let lastClickTime = 0;

    document.addEventListener('click', () => {
      const now = Date.now();
      if (now - lastClickTime < 100) {
        rapidClickCount++;
        if (rapidClickCount > 10) {
          SecureErrorHandler.logSecurityEvent('suspicious_rapid_clicking', {
            count: rapidClickCount
          });
        }
      } else {
        rapidClickCount = 0;
      }
      lastClickTime = now;
    });
  }
};

// Rate limiters for common operations
export const rateLimiters = {
  search: new ClientRateLimit(60000, 30), // 30 searches per minute
  login: new ClientRateLimit(300000, 5),  // 5 login attempts per 5 minutes
  api: new ClientRateLimit(60000, 100),   // 100 API calls per minute
};
