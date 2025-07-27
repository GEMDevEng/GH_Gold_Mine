import jwt from 'jsonwebtoken';
import { IUser } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  githubId: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate JWT token for user
 */
export const generateToken = (user: IUser): string => {
  const payload: JWTPayload = {
    userId: user._id,
    username: user.username,
    email: user.email,
    githubId: user.githubId,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRE,
  } as jwt.SignOptions);
};

/**
 * Verify JWT token and return payload
 */
export const verifyToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token verification failed');
    }
  }
};

/**
 * Generate refresh token (longer expiry)
 */
export const generateRefreshToken = (user: IUser): string => {
  const payload = {
    userId: user._id,
    type: 'refresh',
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '30d',
  } as jwt.SignOptions);
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): { userId: string } => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; type: string };
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    return { userId: decoded.userId };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    } else {
      throw new Error('Refresh token verification failed');
    }
  }
};

/**
 * Extract token from Authorization header
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

/**
 * Generate tokens for user (access + refresh)
 */
export const generateTokens = (user: IUser) => {
  const accessToken = generateToken(user);
  const refreshToken = generateRefreshToken(user);
  
  return {
    accessToken,
    refreshToken,
    expiresIn: JWT_EXPIRE,
  };
};
