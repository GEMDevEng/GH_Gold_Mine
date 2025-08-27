import { useState, useCallback } from 'react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  email?: boolean;
  url?: boolean;
  custom?: (value: any) => string | null;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Common validation patterns
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/.+/,
  githubUsername: /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/,
  githubRepo: /^[a-zA-Z0-9._-]+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  noSpecialChars: /^[a-zA-Z0-9\s-_]+$/,
};

// Sanitization functions
export const sanitize = {
  string: (value: string): string => {
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  },
  
  html: (value: string): string => {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  },
  
  number: (value: string | number): number | null => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? null : num;
  },
  
  integer: (value: string | number): number | null => {
    const num = typeof value === 'string' ? parseInt(value, 10) : Math.floor(value);
    return isNaN(num) ? null : num;
  },
  
  url: (value: string): string => {
    try {
      const url = new URL(value);
      return url.toString();
    } catch {
      return '';
    }
  }
};

// Validation functions
const validateField = (value: any, rules: ValidationRule, fieldName: string): string | null => {
  // Required validation
  if (rules.required && (value === undefined || value === null || value === '')) {
    return `${fieldName} is required`;
  }

  // Skip other validations if field is empty and not required
  if (value === undefined || value === null || value === '') {
    return null;
  }

  // String validations
  if (typeof value === 'string') {
    // Length validations
    if (rules.minLength && value.length < rules.minLength) {
      return `${fieldName} must be at least ${rules.minLength} characters`;
    }
    if (rules.maxLength && value.length > rules.maxLength) {
      return `${fieldName} must be no more than ${rules.maxLength} characters`;
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      return `${fieldName} format is invalid`;
    }

    // Email validation
    if (rules.email && !VALIDATION_PATTERNS.email.test(value)) {
      return `${fieldName} must be a valid email address`;
    }

    // URL validation
    if (rules.url && !VALIDATION_PATTERNS.url.test(value)) {
      return `${fieldName} must be a valid URL`;
    }
  }

  // Number validations
  if (typeof value === 'number') {
    if (rules.min !== undefined && value < rules.min) {
      return `${fieldName} must be at least ${rules.min}`;
    }
    if (rules.max !== undefined && value > rules.max) {
      return `${fieldName} must be no more than ${rules.max}`;
    }
  }

  // Custom validation
  if (rules.custom) {
    return rules.custom(value);
  }

  return null;
};

export const useValidation = () => {
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const validate = useCallback((
    data: Record<string, any>,
    rules: Record<string, ValidationRule>
  ): ValidationResult => {
    const newErrors: ValidationError[] = [];

    Object.entries(rules).forEach(([fieldName, fieldRules]) => {
      const value = data[fieldName];
      const error = validateField(value, fieldRules, fieldName);
      
      if (error) {
        newErrors.push({ field: fieldName, message: error });
      }
    });

    setErrors(newErrors);
    return {
      isValid: newErrors.length === 0,
      errors: newErrors
    };
  }, []);

  const validateField = useCallback((
    fieldName: string,
    value: any,
    rules: ValidationRule
  ): string | null => {
    const error = validateField(value, rules, fieldName);
    
    setErrors(prev => {
      const filtered = prev.filter(e => e.field !== fieldName);
      return error ? [...filtered, { field: fieldName, message: error }] : filtered;
    });

    return error;
  }, []);

  const clearErrors = useCallback((fieldName?: string) => {
    if (fieldName) {
      setErrors(prev => prev.filter(e => e.field !== fieldName));
    } else {
      setErrors([]);
    }
  }, []);

  const getFieldError = useCallback((fieldName: string): string | null => {
    const error = errors.find(e => e.field === fieldName);
    return error ? error.message : null;
  }, [errors]);

  const hasErrors = errors.length > 0;

  return {
    validate,
    validateField,
    clearErrors,
    getFieldError,
    errors,
    hasErrors
  };
};

// Common validation rule sets
export const COMMON_RULES = {
  email: {
    required: true,
    email: true,
    maxLength: 254
  },
  
  password: {
    required: true,
    minLength: 8,
    maxLength: 128,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
  },
  
  username: {
    required: true,
    minLength: 3,
    maxLength: 39,
    pattern: VALIDATION_PATTERNS.githubUsername
  },
  
  repositoryName: {
    required: true,
    minLength: 1,
    maxLength: 100,
    pattern: VALIDATION_PATTERNS.githubRepo
  },
  
  searchQuery: {
    maxLength: 200,
    pattern: VALIDATION_PATTERNS.noSpecialChars
  },
  
  url: {
    url: true,
    maxLength: 2048
  },
  
  positiveInteger: {
    min: 0,
    custom: (value: any) => {
      const num = sanitize.integer(value);
      return num === null ? 'Must be a valid number' : null;
    }
  },
  
  score: {
    min: 0,
    max: 100,
    custom: (value: any) => {
      const num = sanitize.number(value);
      return num === null ? 'Must be a valid score between 0 and 100' : null;
    }
  }
};

// Security validation helpers
export const securityValidation = {
  // Check for potential XSS
  hasXSS: (value: string): boolean => {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi
    ];
    return xssPatterns.some(pattern => pattern.test(value));
  },

  // Check for potential SQL injection
  hasSQLInjection: (value: string): boolean => {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
      /('|(\\')|(;)|(\\))/gi
    ];
    return sqlPatterns.some(pattern => pattern.test(value));
  },

  // Check for directory traversal
  hasDirectoryTraversal: (value: string): boolean => {
    return /\.\.\//.test(value) || /\.\.\\/.test(value);
  },

  // Comprehensive security check
  isSafe: (value: string): boolean => {
    return !securityValidation.hasXSS(value) &&
           !securityValidation.hasSQLInjection(value) &&
           !securityValidation.hasDirectoryTraversal(value);
  }
};

// Custom validation rule for security
export const securityRule: ValidationRule = {
  custom: (value: string) => {
    if (typeof value !== 'string') return null;
    
    if (securityValidation.hasXSS(value)) {
      return 'Input contains potentially dangerous content';
    }
    if (securityValidation.hasSQLInjection(value)) {
      return 'Input contains potentially dangerous content';
    }
    if (securityValidation.hasDirectoryTraversal(value)) {
      return 'Input contains potentially dangerous content';
    }
    
    return null;
  }
};
