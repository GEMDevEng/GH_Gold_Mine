import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import axios from 'axios';
import { User } from '../models/User';
import { UserSession } from '../models/UserSession';
import { logger } from '../utils/logger';

export interface GitHubUser {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
  bio?: string;
  company?: string;
  location?: string;
  public_repos: number;
  followers: number;
  following: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult {
  user: any;
  tokens: AuthTokens;
  isNewUser: boolean;
}

class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly githubClientId: string;
  private readonly githubClientSecret: string;
  private readonly accessTokenExpiry = '15m';
  private readonly refreshTokenExpiry = '7d';

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'dev-jwt-refresh-secret';
    this.githubClientId = process.env.GITHUB_CLIENT_ID || '';
    this.githubClientSecret = process.env.GITHUB_CLIENT_SECRET || '';

    // Security validation
    if (process.env.NODE_ENV === 'production') {
      if (this.jwtSecret === 'dev-jwt-secret' || this.jwtRefreshSecret === 'dev-jwt-refresh-secret') {
        throw new Error('Production JWT secrets must be changed from default values');
      }
      if (this.jwtSecret.length < 32 || this.jwtRefreshSecret.length < 32) {
        throw new Error('Production JWT secrets must be at least 32 characters long');
      }
    }

    if (!this.githubClientId || !this.githubClientSecret) {
      logger.warn('GitHub OAuth credentials not configured');
    }
  }

  /**
   * Generate GitHub OAuth authorization URL
   */
  generateGitHubAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.githubClientId,
      scope: 'user:email',
      state: state || crypto.randomBytes(16).toString('hex'),
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange GitHub OAuth code for access token
   */
  async exchangeGitHubCode(code: string): Promise<string> {
    try {
      const response = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: this.githubClientId,
          client_secret: this.githubClientSecret,
          code,
        },
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (response.data.error) {
        throw new Error(`GitHub OAuth error: ${response.data.error_description}`);
      }

      return response.data.access_token;
    } catch (error) {
      logger.error('Failed to exchange GitHub code:', error);
      throw new Error('Failed to authenticate with GitHub');
    }
  }

  /**
   * Fetch user data from GitHub API
   */
  async fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
    try {
      const [userResponse, emailResponse] = await Promise.all([
        axios.get('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }),
        axios.get('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }),
      ]);

      const user = userResponse.data;
      const emails = emailResponse.data;
      
      // Find primary email
      const primaryEmail = emails.find((email: any) => email.primary)?.email || user.email;

      return {
        ...user,
        email: primaryEmail,
      };
    } catch (error) {
      logger.error('Failed to fetch GitHub user:', error);
      throw new Error('Failed to fetch user data from GitHub');
    }
  }

  /**
   * Create or update user from GitHub data
   */
  async createOrUpdateUser(githubUser: GitHubUser, githubAccessToken: string): Promise<{ user: any; isNewUser: boolean }> {
    try {
      let user = await User.findOne({ githubId: githubUser.id.toString() });
      let isNewUser = false;

      if (!user) {
        // Create new user
        user = new User({
          githubId: githubUser.id.toString(),
          username: githubUser.login,
          email: githubUser.email,
          name: githubUser.name || githubUser.login,
          avatar: githubUser.avatar_url,
          githubAccessToken: this.encryptToken(githubAccessToken),
          isActive: true,
          createdAt: new Date(),
          lastLoginAt: new Date(),
          subscription: {
            plan: 'free',
            status: 'active',
            startDate: new Date(),
          },
          usage: {
            apiCalls: 0,
            analysesRun: 0,
            projectsDiscovered: 0,
            lastResetAt: new Date(),
          },
          preferences: {
            emailNotifications: true,
            analysisAlerts: true,
            weeklyDigest: false,
            theme: 'auto',
          },
          savedRepositories: [],
          analysisHistory: [],
          searchHistory: [],
        });
        
        await user.save();
        isNewUser = true;
        logger.info(`Created new user: ${githubUser.login}`);
      } else {
        // Update existing user
        user.name = githubUser.name || user.name;
        user.email = githubUser.email || user.email;
        user.avatar = githubUser.avatar_url;
        user.githubAccessToken = this.encryptToken(githubAccessToken);
        user.lastLoginAt = new Date();
        
        await user.save();
        logger.info(`Updated existing user: ${githubUser.login}`);
      }

      // Remove sensitive data before returning
      const userObject = user.toObject();
      delete userObject.githubAccessToken;
      
      return { user: userObject, isNewUser };
    } catch (error) {
      logger.error('Failed to create/update user:', error);
      throw new Error('Failed to create user account');
    }
  }

  /**
   * Generate JWT tokens for user
   */
  async generateTokens(userId: string): Promise<AuthTokens> {
    try {
      const accessToken = jwt.sign(
        { userId, type: 'access' },
        this.jwtSecret,
        { expiresIn: this.accessTokenExpiry }
      );

      const refreshToken = jwt.sign(
        { userId, type: 'refresh' },
        this.jwtRefreshSecret,
        { expiresIn: this.refreshTokenExpiry }
      );

      // Store refresh token in database
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await UserSession.create({
        userId,
        tokenHash,
        expiresAt,
        createdAt: new Date(),
      });

      return {
        accessToken,
        refreshToken,
        expiresIn: 15 * 60, // 15 minutes in seconds
      };
    } catch (error) {
      logger.error('Failed to generate tokens:', error);
      throw new Error('Failed to generate authentication tokens');
    }
  }

  /**
   * Verify JWT access token
   */
  async verifyAccessToken(token: string): Promise<{ userId: string }> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return { userId: decoded.userId };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      throw new Error('Invalid token');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as any;
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if refresh token exists in database
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const session = await UserSession.findOne({
        userId: decoded.userId,
        tokenHash,
        expiresAt: { $gt: new Date() },
      });

      if (!session) {
        throw new Error('Invalid or expired refresh token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(decoded.userId);

      // Remove old refresh token
      await UserSession.deleteOne({ _id: session._id });

      return tokens;
    } catch (error) {
      logger.error('Failed to refresh token:', error);
      throw new Error('Failed to refresh authentication token');
    }
  }

  /**
   * Logout user by invalidating refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await UserSession.deleteOne({ tokenHash });
    } catch (error) {
      logger.error('Failed to logout user:', error);
      // Don't throw error for logout failures
    }
  }

  /**
   * Complete GitHub OAuth flow
   */
  async completeGitHubAuth(code: string): Promise<AuthResult> {
    try {
      // Exchange code for GitHub access token
      const githubAccessToken = await this.exchangeGitHubCode(code);
      
      // Fetch user data from GitHub
      const githubUser = await this.fetchGitHubUser(githubAccessToken);
      
      // Create or update user in database
      const { user, isNewUser } = await this.createOrUpdateUser(githubUser, githubAccessToken);
      
      // Generate JWT tokens
      const tokens = await this.generateTokens(user._id);

      return {
        user,
        tokens,
        isNewUser,
      };
    } catch (error) {
      logger.error('Failed to complete GitHub auth:', error);
      throw error;
    }
  }

  /**
   * Encrypt sensitive token for storage
   */
  private encryptToken(token: string): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(this.jwtSecret, 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt stored token
   */
  private decryptToken(encryptedToken: string): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(this.jwtSecret, 'salt', 32);
    
    const [ivHex, encrypted] = encryptedToken.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

export const authService = new AuthService();
export default authService;
