import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

// Types
export interface User {
  _id: string;
  githubId: string;
  username: string;
  email: string;
  name: string;
  avatar: string;
  bio?: string;
  location?: string;
  company?: string;
  blog?: string;
  publicRepos: number;
  followers: number;
  following: number;
  githubCreatedAt: string;
  preferences: {
    emailNotifications: boolean;
    analysisAlerts: boolean;
    weeklyDigest: boolean;
    theme: 'light' | 'dark' | 'auto';
  };
  subscription: {
    plan: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'inactive' | 'cancelled';
    expiresAt?: string;
  };
  usage: {
    apiCalls: number;
    analysesRun: number;
    projectsDiscovered: number;
    lastResetAt: string;
  };
  isActive: boolean;
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; tokens: AuthTokens } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'CLEAR_ERROR' };

// Initial state
const initialState: AuthState = {
  user: null,
  tokens: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
};

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        tokens: action.payload.tokens,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        tokens: null,
        isLoading: false,
        isAuthenticated: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        tokens: null,
        isAuthenticated: false,
        error: null,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

// Context
interface AuthContextType extends AuthState {
  login: (code: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  updateProfile: (preferences: Partial<User['preferences']>) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load tokens from localStorage on mount
  useEffect(() => {
    const storedTokens = localStorage.getItem('auth_tokens');
    const storedUser = localStorage.getItem('auth_user');

    if (storedTokens && storedUser) {
      try {
        const tokens = JSON.parse(storedTokens);
        const user = JSON.parse(storedUser);
        
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: { user, tokens },
        });
      } catch (error) {
        // Clear invalid stored data
        localStorage.removeItem('auth_tokens');
        localStorage.removeItem('auth_user');
      }
    }
  }, []);

  // Save tokens to localStorage when they change
  useEffect(() => {
    if (state.tokens && state.user) {
      localStorage.setItem('auth_tokens', JSON.stringify(state.tokens));
      localStorage.setItem('auth_user', JSON.stringify(state.user));
    } else {
      localStorage.removeItem('auth_tokens');
      localStorage.removeItem('auth_user');
    }
  }, [state.tokens, state.user]);

  const login = async (code: string): Promise<void> => {
    dispatch({ type: 'AUTH_START' });

    try {
      const response = await fetch('/api/auth/github/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Authentication failed');
      }

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: data.data.user,
          tokens: data.data.tokens,
        },
      });
    } catch (error) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error instanceof Error ? error.message : 'Authentication failed',
      });
      throw error;
    }
  };

  const logout = (): void => {
    dispatch({ type: 'LOGOUT' });
  };

  const refreshToken = async (): Promise<void> => {
    if (!state.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: state.tokens.refreshToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Token refresh failed');
      }

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: state.user!,
          tokens: data.data.tokens,
        },
      });
    } catch (error) {
      dispatch({ type: 'LOGOUT' });
      throw error;
    }
  };

  const updateProfile = async (preferences: Partial<User['preferences']>): Promise<void> => {
    if (!state.tokens?.accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.tokens.accessToken}`,
        },
        body: JSON.stringify({ preferences }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Profile update failed');
      }

      dispatch({
        type: 'UPDATE_USER',
        payload: data.data.user,
      });
    } catch (error) {
      throw error;
    }
  };

  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    refreshToken,
    updateProfile,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
