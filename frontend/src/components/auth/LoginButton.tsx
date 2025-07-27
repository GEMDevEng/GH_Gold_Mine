import React, { useState } from 'react';
import { Github, Loader2 } from 'lucide-react';

interface LoginButtonProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline';
}

export const LoginButton: React.FC<LoginButtonProps> = ({
  className = '',
  size = 'md',
  variant = 'primary',
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    
    try {
      // Get GitHub OAuth URL from backend
      const response = await fetch('/api/auth/github/url');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to get OAuth URL');
      }

      // Redirect to GitHub OAuth
      window.location.href = data.data.url;
    } catch (error) {
      console.error('Login failed:', error);
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline',
  };

  return (
    <button
      onClick={handleLogin}
      disabled={isLoading}
      className={`
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        inline-flex items-center gap-2 font-medium rounded-lg
        transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Github className="w-4 h-4" />
      )}
      {isLoading ? 'Connecting...' : 'Sign in with GitHub'}
    </button>
  );
};
