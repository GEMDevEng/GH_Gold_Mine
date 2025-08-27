import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

// Form validation types
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface FieldError {
  message: string;
  type: string;
}

export interface FormState {
  values: Record<string, any>;
  errors: Record<string, FieldError>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}

// Form context
interface FormContextType {
  state: FormState;
  setValue: (name: string, value: any) => void;
  setError: (name: string, error: FieldError | null) => void;
  setTouched: (name: string, touched: boolean) => void;
  validateField: (name: string, value: any, rules?: ValidationRule) => string | null;
  handleSubmit: (onSubmit: (values: Record<string, any>) => Promise<void> | void) => (e: React.FormEvent) => Promise<void>;
}

const FormContext = createContext<FormContextType | null>(null);

export const useForm = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useForm must be used within a Form component');
  }
  return context;
};

// Form component
export interface FormProps {
  children: React.ReactNode;
  initialValues?: Record<string, any>;
  validationRules?: Record<string, ValidationRule>;
  onSubmit?: (values: Record<string, any>) => Promise<void> | void;
  className?: string;
}

export const Form: React.FC<FormProps> = ({
  children,
  initialValues = {},
  validationRules = {},
  onSubmit,
  className = '',
}) => {
  const [state, setState] = useState<FormState>({
    values: initialValues,
    errors: {},
    touched: {},
    isSubmitting: false,
    isValid: true,
  });

  const validateField = useCallback((name: string, value: any, rules?: ValidationRule): string | null => {
    const fieldRules = rules || validationRules[name];
    if (!fieldRules) return null;

    // Required validation
    if (fieldRules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return 'This field is required';
    }

    // Skip other validations if field is empty and not required
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return null;
    }

    // String length validations
    if (typeof value === 'string') {
      if (fieldRules.minLength && value.length < fieldRules.minLength) {
        return `Must be at least ${fieldRules.minLength} characters`;
      }
      if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
        return `Must be no more than ${fieldRules.maxLength} characters`;
      }
    }

    // Pattern validation
    if (fieldRules.pattern && typeof value === 'string' && !fieldRules.pattern.test(value)) {
      return 'Invalid format';
    }

    // Custom validation
    if (fieldRules.custom) {
      return fieldRules.custom(value);
    }

    return null;
  }, [validationRules]);

  const setValue = useCallback((name: string, value: any) => {
    setState(prev => {
      const newValues = { ...prev.values, [name]: value };
      const error = validateField(name, value);
      const newErrors = { ...prev.errors };
      
      if (error) {
        newErrors[name] = { message: error, type: 'validation' };
      } else {
        delete newErrors[name];
      }

      const isValid = Object.keys(newErrors).length === 0;

      return {
        ...prev,
        values: newValues,
        errors: newErrors,
        isValid,
      };
    });
  }, [validateField]);

  const setError = useCallback((name: string, error: FieldError | null) => {
    setState(prev => {
      const newErrors = { ...prev.errors };
      
      if (error) {
        newErrors[name] = error;
      } else {
        delete newErrors[name];
      }

      const isValid = Object.keys(newErrors).length === 0;

      return {
        ...prev,
        errors: newErrors,
        isValid,
      };
    });
  }, []);

  const setTouched = useCallback((name: string, touched: boolean) => {
    setState(prev => ({
      ...prev,
      touched: { ...prev.touched, [name]: touched },
    }));
  }, []);

  const handleSubmit = useCallback((onSubmitCallback: (values: Record<string, any>) => Promise<void> | void) => {
    return async (e: React.FormEvent) => {
      e.preventDefault();
      
      setState(prev => ({ ...prev, isSubmitting: true }));

      try {
        // Validate all fields
        const newErrors: Record<string, FieldError> = {};
        const newTouched: Record<string, boolean> = {};

        Object.keys(validationRules).forEach(name => {
          const error = validateField(name, state.values[name]);
          newTouched[name] = true;
          if (error) {
            newErrors[name] = { message: error, type: 'validation' };
          }
        });

        setState(prev => ({
          ...prev,
          errors: newErrors,
          touched: { ...prev.touched, ...newTouched },
          isValid: Object.keys(newErrors).length === 0,
        }));

        if (Object.keys(newErrors).length === 0) {
          await onSubmitCallback(state.values);
        }
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setState(prev => ({ ...prev, isSubmitting: false }));
      }
    };
  }, [state.values, validationRules, validateField]);

  const contextValue: FormContextType = {
    state,
    setValue,
    setError,
    setTouched,
    validateField,
    handleSubmit,
  };

  return (
    <FormContext.Provider value={contextValue}>
      <form onSubmit={onSubmit ? handleSubmit(onSubmit) : undefined} className={className}>
        {children}
      </form>
    </FormContext.Provider>
  );
};

// Form field component
export interface FormFieldProps {
  name: string;
  children: (props: {
    value: any;
    error?: FieldError;
    touched: boolean;
    onChange: (value: any) => void;
    onBlur: () => void;
  }) => React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({ name, children }) => {
  const { state, setValue, setTouched } = useForm();

  const value = state.values[name] || '';
  const error = state.errors[name];
  const touched = state.touched[name] || false;

  const handleChange = (newValue: any) => {
    setValue(name, newValue);
  };

  const handleBlur = () => {
    setTouched(name, true);
  };

  return (
    <>
      {children({
        value,
        error,
        touched,
        onChange: handleChange,
        onBlur: handleBlur,
      })}
    </>
  );
};

// Form message component
export interface FormMessageProps {
  type: 'error' | 'success' | 'info';
  children: React.ReactNode;
  className?: string;
}

export const FormMessage: React.FC<FormMessageProps> = ({
  type,
  children,
  className = '',
}) => {
  const baseClasses = 'flex items-center space-x-2 text-sm p-3 rounded-md';
  
  const typeClasses = {
    error: 'bg-error-50 text-error-700 border border-error-200',
    success: 'bg-success-50 text-success-700 border border-success-200',
    info: 'bg-primary-50 text-primary-700 border border-primary-200',
  };

  const Icon = type === 'error' ? AlertCircle : CheckCircle;

  return (
    <div className={`${baseClasses} ${typeClasses[type]} ${className}`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{children}</span>
    </div>
  );
};
