import React, { useState, useCallback, useEffect } from 'react';
import { Input } from './Input';
import { useValidation, ValidationRule, sanitize, securityRule } from '../../hooks/useValidation';
import { AlertCircle, CheckCircle } from 'lucide-react';

export interface ValidatedInputProps {
  name: string;
  label?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'url' | 'search';
  value?: string | number;
  defaultValue?: string | number;
  rules?: ValidationRule;
  sanitizeOnBlur?: boolean;
  showValidationIcon?: boolean;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  onChange?: (value: string | number, isValid: boolean) => void;
  onValidationChange?: (isValid: boolean, error: string | null) => void;
}

export const ValidatedInput: React.FC<ValidatedInputProps> = ({
  name,
  label,
  placeholder,
  type = 'text',
  value: controlledValue,
  defaultValue = '',
  rules = {},
  sanitizeOnBlur = true,
  showValidationIcon = true,
  className = '',
  disabled = false,
  required = false,
  onChange,
  onValidationChange,
}) => {
  const [internalValue, setInternalValue] = useState<string | number>(
    controlledValue !== undefined ? controlledValue : defaultValue
  );
  const [touched, setTouched] = useState(false);
  const [sanitized, setSanitized] = useState(false);
  
  const { validateField, getFieldError, clearErrors } = useValidation();

  // Use controlled value if provided, otherwise use internal state
  const currentValue = controlledValue !== undefined ? controlledValue : internalValue;
  const currentError = getFieldError(name);
  const isValid = !currentError && touched;
  const hasError = !!currentError && touched;

  // Combine security rule with provided rules
  const combinedRules: ValidationRule = {
    ...rules,
    required: required || rules.required,
    custom: (value: any) => {
      // First run security validation
      const securityError = securityRule.custom?.(value);
      if (securityError) return securityError;
      
      // Then run custom validation if provided
      return rules.custom ? rules.custom(value) : null;
    }
  };

  // Sanitize value based on type
  const sanitizeValue = useCallback((val: string | number): string | number => {
    if (typeof val !== 'string') return val;

    switch (type) {
      case 'email':
        return sanitize.string(val).toLowerCase();
      case 'url':
        return sanitize.url(val);
      case 'number':
        const num = sanitize.number(val);
        return num !== null ? num : val;
      default:
        return sanitize.string(val);
    }
  }, [type]);

  // Handle value changes
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    
    // Update internal state if not controlled
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }

    // Clear previous errors when user starts typing
    if (currentError) {
      clearErrors(name);
    }

    // Call onChange callback
    if (onChange) {
      onChange(newValue, !currentError);
    }
  }, [type, controlledValue, currentError, clearErrors, name, onChange]);

  // Handle blur event
  const handleBlur = useCallback(() => {
    setTouched(true);
    
    let valueToValidate = currentValue;

    // Sanitize on blur if enabled
    if (sanitizeOnBlur && typeof currentValue === 'string') {
      const sanitizedValue = sanitizeValue(currentValue);
      valueToValidate = sanitizedValue;
      
      if (sanitizedValue !== currentValue) {
        setSanitized(true);
        
        // Update internal state if not controlled
        if (controlledValue === undefined) {
          setInternalValue(sanitizedValue);
        }
        
        // Call onChange with sanitized value
        if (onChange) {
          onChange(sanitizedValue, true);
        }
      }
    }

    // Validate the field
    const error = validateField(name, valueToValidate, combinedRules);
    const isFieldValid = !error;

    // Call validation change callback
    if (onValidationChange) {
      onValidationChange(isFieldValid, error);
    }
  }, [
    currentValue,
    sanitizeOnBlur,
    sanitizeValue,
    controlledValue,
    onChange,
    validateField,
    name,
    combinedRules,
    onValidationChange
  ]);

  // Handle focus event
  const handleFocus = useCallback(() => {
    setSanitized(false);
  }, []);

  // Update internal value when controlled value changes
  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue]);

  // Get input type for HTML input element
  const getInputType = (): string => {
    switch (type) {
      case 'email':
        return 'email';
      case 'password':
        return 'password';
      case 'number':
        return 'number';
      case 'url':
        return 'url';
      case 'search':
        return 'search';
      default:
        return 'text';
    }
  };

  // Get validation icon
  const getValidationIcon = () => {
    if (!showValidationIcon || !touched) return null;
    
    if (hasError) {
      return <AlertCircle className="w-4 h-4 text-error-500" />;
    }
    
    if (isValid && currentValue) {
      return <CheckCircle className="w-4 h-4 text-success-500" />;
    }
    
    return null;
  };

  // Get input classes
  const getInputClasses = () => {
    const baseClasses = 'relative';
    
    if (hasError) {
      return `${baseClasses} border-error-300 focus:border-error-500 focus:ring-error-500`;
    }
    
    if (isValid && currentValue) {
      return `${baseClasses} border-success-300 focus:border-success-500 focus:ring-success-500`;
    }
    
    return baseClasses;
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Label */}
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}
      
      {/* Input Container */}
      <div className="relative">
        <Input
          id={name}
          name={name}
          type={getInputType()}
          value={currentValue}
          placeholder={placeholder}
          disabled={disabled}
          className={`${getInputClasses()} ${showValidationIcon ? 'pr-10' : ''}`}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${name}-error` : undefined}
        />
        
        {/* Validation Icon */}
        {showValidationIcon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {getValidationIcon()}
          </div>
        )}
      </div>
      
      {/* Error Message */}
      {hasError && (
        <p id={`${name}-error`} className="text-sm text-error-600 flex items-center">
          <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
          {currentError}
        </p>
      )}
      
      {/* Sanitization Notice */}
      {sanitized && (
        <p className="text-sm text-blue-600 flex items-center">
          <CheckCircle className="w-4 h-4 mr-1 flex-shrink-0" />
          Input was automatically cleaned for security
        </p>
      )}
      
      {/* Help Text for Required Fields */}
      {required && !hasError && !touched && (
        <p className="text-sm text-gray-500">This field is required</p>
      )}
    </div>
  );
};

// Specialized input components
export const EmailInput: React.FC<Omit<ValidatedInputProps, 'type' | 'rules'> & { rules?: ValidationRule }> = (props) => (
  <ValidatedInput
    {...props}
    type="email"
    rules={{
      required: true,
      email: true,
      maxLength: 254,
      ...props.rules
    }}
  />
);

export const PasswordInput: React.FC<Omit<ValidatedInputProps, 'type' | 'rules'> & { rules?: ValidationRule }> = (props) => (
  <ValidatedInput
    {...props}
    type="password"
    rules={{
      required: true,
      minLength: 8,
      maxLength: 128,
      ...props.rules
    }}
  />
);

export const SearchInput: React.FC<Omit<ValidatedInputProps, 'type' | 'rules'> & { rules?: ValidationRule }> = (props) => (
  <ValidatedInput
    {...props}
    type="search"
    rules={{
      maxLength: 200,
      ...props.rules
    }}
  />
);

export const NumberInput: React.FC<Omit<ValidatedInputProps, 'type' | 'rules'> & { 
  rules?: ValidationRule;
  min?: number;
  max?: number;
}> = ({ min, max, rules, ...props }) => (
  <ValidatedInput
    {...props}
    type="number"
    rules={{
      min,
      max,
      ...rules
    }}
  />
);
