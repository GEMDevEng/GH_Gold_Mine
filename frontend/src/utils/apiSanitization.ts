import { sanitize, securityValidation } from '../hooks/useValidation';

/**
 * API request sanitization utilities
 */

export interface SanitizationOptions {
  allowHtml?: boolean;
  maxLength?: number;
  trimWhitespace?: boolean;
  removeEmptyStrings?: boolean;
  validateSecurity?: boolean;
}

const DEFAULT_OPTIONS: SanitizationOptions = {
  allowHtml: false,
  maxLength: 10000,
  trimWhitespace: true,
  removeEmptyStrings: true,
  validateSecurity: true,
};

/**
 * Sanitize a single value based on its type
 */
export const sanitizeValue = (
  value: any,
  options: SanitizationOptions = {}
): any => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    let sanitized = value;

    // Trim whitespace
    if (opts.trimWhitespace) {
      sanitized = sanitized.trim();
    }

    // Remove empty strings if configured
    if (opts.removeEmptyStrings && sanitized === '') {
      return null;
    }

    // Security validation
    if (opts.validateSecurity && !securityValidation.isSafe(sanitized)) {
      throw new Error('Input contains potentially dangerous content');
    }

    // Sanitize based on HTML allowance
    if (opts.allowHtml) {
      // Allow HTML but sanitize dangerous scripts
      sanitized = sanitize.string(sanitized);
    } else {
      // Escape all HTML
      sanitized = sanitize.html(sanitized);
    }

    // Enforce max length
    if (opts.maxLength && sanitized.length > opts.maxLength) {
      sanitized = sanitized.substring(0, opts.maxLength);
    }

    return sanitized;
  }

  if (typeof value === 'number') {
    // Validate number is finite
    if (!isFinite(value)) {
      throw new Error('Invalid number value');
    }
    return value;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item, options));
  }

  if (typeof value === 'object') {
    return sanitizeObject(value, options);
  }

  return value;
};

/**
 * Sanitize an object recursively
 */
export const sanitizeObject = (
  obj: Record<string, any>,
  options: SanitizationOptions = {}
): Record<string, any> => {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Sanitize the key itself
    const sanitizedKey = sanitizeValue(key, { ...options, allowHtml: false });
    
    if (typeof sanitizedKey !== 'string') {
      continue; // Skip invalid keys
    }

    // Sanitize the value
    try {
      const sanitizedValue = sanitizeValue(value, options);
      
      // Only include non-null values if removeEmptyStrings is true
      if (options.removeEmptyStrings && sanitizedValue === null) {
        continue;
      }
      
      sanitized[sanitizedKey] = sanitizedValue;
    } catch (error) {
      // Skip values that fail sanitization
      console.warn(`Failed to sanitize value for key "${key}":`, error);
    }
  }

  return sanitized;
};

/**
 * Sanitize search parameters
 */
export const sanitizeSearchParams = (params: Record<string, any>): Record<string, any> => {
  return sanitizeObject(params, {
    allowHtml: false,
    maxLength: 200,
    trimWhitespace: true,
    removeEmptyStrings: true,
    validateSecurity: true,
  });
};

/**
 * Sanitize repository data
 */
export const sanitizeRepositoryData = (data: Record<string, any>): Record<string, any> => {
  return sanitizeObject(data, {
    allowHtml: false,
    maxLength: 1000,
    trimWhitespace: true,
    removeEmptyStrings: false, // Keep empty strings for optional fields
    validateSecurity: true,
  });
};

/**
 * Sanitize user input data
 */
export const sanitizeUserInput = (data: Record<string, any>): Record<string, any> => {
  return sanitizeObject(data, {
    allowHtml: false,
    maxLength: 500,
    trimWhitespace: true,
    removeEmptyStrings: true,
    validateSecurity: true,
  });
};

/**
 * Sanitize form data
 */
export const sanitizeFormData = (data: Record<string, any>): Record<string, any> => {
  return sanitizeObject(data, {
    allowHtml: false,
    maxLength: 2000,
    trimWhitespace: true,
    removeEmptyStrings: false,
    validateSecurity: true,
  });
};

/**
 * Validate and sanitize API request payload
 */
export const sanitizeApiRequest = (
  data: any,
  endpoint: string
): any => {
  if (!data) return data;

  // Choose sanitization strategy based on endpoint
  if (endpoint.includes('/search')) {
    return sanitizeSearchParams(data);
  }
  
  if (endpoint.includes('/repositories')) {
    return sanitizeRepositoryData(data);
  }
  
  if (endpoint.includes('/auth') || endpoint.includes('/user')) {
    return sanitizeUserInput(data);
  }

  // Default sanitization
  return sanitizeObject(data, DEFAULT_OPTIONS);
};

/**
 * Sanitize URL parameters
 */
export const sanitizeUrlParams = (params: Record<string, string>): Record<string, string> => {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    // Sanitize key and value
    const sanitizedKey = sanitize.string(key);
    const sanitizedValue = sanitize.string(value);

    // Validate for security
    if (!securityValidation.isSafe(sanitizedKey) || !securityValidation.isSafe(sanitizedValue)) {
      throw new Error(`Unsafe URL parameter: ${key}`);
    }

    sanitized[sanitizedKey] = sanitizedValue;
  }

  return sanitized;
};

/**
 * Create a sanitized query string
 */
export const createSanitizedQueryString = (params: Record<string, any>): string => {
  const sanitizedParams = sanitizeSearchParams(params);
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(sanitizedParams)) {
    if (value !== null && value !== undefined && value !== '') {
      searchParams.append(key, String(value));
    }
  }

  return searchParams.toString();
};

/**
 * Sanitize response data from API
 */
export const sanitizeApiResponse = (data: any): any => {
  if (!data) return data;

  // For arrays, sanitize each item
  if (Array.isArray(data)) {
    return data.map(item => sanitizeApiResponse(item));
  }

  // For objects, sanitize recursively
  if (typeof data === 'object') {
    return sanitizeObject(data, {
      allowHtml: false,
      trimWhitespace: true,
      removeEmptyStrings: false,
      validateSecurity: false, // Don't validate security for responses
    });
  }

  // For primitives, return as-is (responses are generally trusted)
  return data;
};

/**
 * Middleware function to sanitize all outgoing requests
 */
export const createSanitizationMiddleware = () => {
  return (config: any) => {
    // Sanitize request data
    if (config.data) {
      config.data = sanitizeApiRequest(config.data, config.url || '');
    }

    // Sanitize URL parameters
    if (config.params) {
      config.params = sanitizeSearchParams(config.params);
    }

    return config;
  };
};

/**
 * Error handler for sanitization failures
 */
export class SanitizationError extends Error {
  constructor(message: string, public field?: string, public value?: any) {
    super(message);
    this.name = 'SanitizationError';
  }
}

/**
 * Safe sanitization that catches errors
 */
export const safeSanitize = (
  data: any,
  options?: SanitizationOptions
): { success: boolean; data?: any; error?: string } => {
  try {
    const sanitized = sanitizeValue(data, options);
    return { success: true, data: sanitized };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sanitization failed'
    };
  }
};
