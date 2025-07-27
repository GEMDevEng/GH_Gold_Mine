import axios from 'axios';
import { User, IUser } from '../models/User';
import { generateTokens } from '../utils/jwt';
import { logger } from '../config/logger';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  refresh_token?: string;
}

interface GitHubUser {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
  bio: string | null;
  location: string | null;
  company: string | null;
  blog: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
}

/**
 * Exchange GitHub authorization code for access token
 */
export const exchangeCodeForToken = async (code: string): Promise<string> => {
  try {
    const response = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      },
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    const data: GitHubTokenResponse = response.data;
    
    if (!data.access_token) {
      throw new Error('No access token received from GitHub');
    }

    return data.access_token;
  } catch (error) {
    logger.error('Failed to exchange code for token:', error);
    throw new Error('Failed to authenticate with GitHub');
  }
};

/**
 * Get GitHub user information using access token
 */
export const getGitHubUser = async (accessToken: string): Promise<GitHubUser> => {
  try {
    const response = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    return response.data;
  } catch (error) {
    logger.error('Failed to get GitHub user:', error);
    throw new Error('Failed to get user information from GitHub');
  }
};

/**
 * Get GitHub user email (primary email)
 */
export const getGitHubUserEmail = async (accessToken: string): Promise<string> => {
  try {
    const response = await axios.get('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    const emails = response.data;
    const primaryEmail = emails.find((email: any) => email.primary && email.verified);
    
    if (!primaryEmail) {
      throw new Error('No verified primary email found');
    }

    return primaryEmail.email;
  } catch (error) {
    logger.error('Failed to get GitHub user email:', error);
    throw new Error('Failed to get user email from GitHub');
  }
};

/**
 * Create or update user from GitHub data
 */
export const createOrUpdateUser = async (githubUser: GitHubUser, accessToken: string, email?: string): Promise<IUser> => {
  try {
    const userEmail = email || githubUser.email;
    
    if (!userEmail) {
      throw new Error('Email is required');
    }

    // Check if user already exists
    let user = await User.findOne({ githubId: githubUser.id.toString() });

    if (user) {
      // Update existing user
      user.username = githubUser.login;
      user.email = userEmail;
      user.name = githubUser.name || githubUser.login;
      user.avatar = githubUser.avatar_url;
      user.bio = githubUser.bio || undefined;
      user.location = githubUser.location || undefined;
      user.company = githubUser.company || undefined;
      user.blog = githubUser.blog || undefined;
      user.publicRepos = githubUser.public_repos;
      user.followers = githubUser.followers;
      user.following = githubUser.following;
      user.accessToken = accessToken;
      user.lastLoginAt = new Date();
      
      await user.save();
      logger.info(`Updated existing user: ${user.username}`);
    } else {
      // Create new user
      user = new User({
        githubId: githubUser.id.toString(),
        username: githubUser.login,
        email: userEmail,
        name: githubUser.name || githubUser.login,
        avatar: githubUser.avatar_url,
        bio: githubUser.bio || undefined,
        location: githubUser.location || undefined,
        company: githubUser.company || undefined,
        blog: githubUser.blog || undefined,
        publicRepos: githubUser.public_repos,
        followers: githubUser.followers,
        following: githubUser.following,
        githubCreatedAt: new Date(githubUser.created_at),
        accessToken,
        lastLoginAt: new Date(),
      });
      
      await user.save();
      logger.info(`Created new user: ${user.username}`);
    }

    return user;
  } catch (error) {
    logger.error('Failed to create or update user:', error);
    throw new Error('Failed to create or update user');
  }
};

/**
 * Complete GitHub OAuth flow
 */
export const completeGitHubAuth = async (code: string) => {
  try {
    // Exchange code for access token
    const accessToken = await exchangeCodeForToken(code);
    
    // Get user information
    const githubUser = await getGitHubUser(accessToken);
    
    // Get user email if not provided in user object
    let email = githubUser.email;
    if (!email) {
      email = await getGitHubUserEmail(accessToken);
    }
    
    // Create or update user
    const user = await createOrUpdateUser(githubUser, accessToken, email);
    
    // Generate JWT tokens
    const tokens = generateTokens(user);
    
    return {
      user,
      tokens,
    };
  } catch (error) {
    logger.error('GitHub auth flow failed:', error);
    throw error;
  }
};

/**
 * Refresh GitHub user data
 */
export const refreshGitHubUserData = async (user: IUser): Promise<IUser> => {
  try {
    const githubUser = await getGitHubUser(user.accessToken);
    
    // Update user data
    user.name = githubUser.name || githubUser.login;
    user.avatar = githubUser.avatar_url;
    user.bio = githubUser.bio || undefined;
    user.location = githubUser.location || undefined;
    user.company = githubUser.company || undefined;
    user.blog = githubUser.blog || undefined;
    user.publicRepos = githubUser.public_repos;
    user.followers = githubUser.followers;
    user.following = githubUser.following;
    
    await user.save();
    
    return user;
  } catch (error) {
    logger.error('Failed to refresh GitHub user data:', error);
    throw new Error('Failed to refresh user data');
  }
};
