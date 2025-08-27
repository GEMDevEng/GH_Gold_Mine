import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  createSanitizationMiddleware,
  sanitizeApiResponse,
  createSanitizedQueryString
} from '../utils/apiSanitization';

// Types for API responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface Repository {
  _id: string;
  githubId: number;
  fullName: string;
  name: string;
  description?: string;
  url: string;
  homepage?: string;
  owner: {
    login: string;
    type: 'User' | 'Organization';
    avatar: string;
    url: string;
    githubId: number;
  };
  metrics: {
    stars: number;
    forks: number;
    watchers: number;
    openIssues: number;
    size: number;
    lastCommitDate: string;
    lastReleaseDate?: string;
    contributorCount: number;
    commitCount: number;
    branchCount: number;
    releaseCount: number;
    issueCount: number;
    pullRequestCount: number;
    languages: Record<string, number>;
    license?: string;
    topics: string[];
  };
  activity: {
    commitFrequency: number;
    issueActivity: number;
    prActivity: number;
    contributorActivity: number;
    lastActivity: string;
    activityScore: number;
  };
  quality: {
    hasReadme: boolean;
    hasLicense: boolean;
    hasContributing: boolean;
    hasCodeOfConduct: boolean;
    hasIssueTemplate: boolean;
    hasPrTemplate: boolean;
    documentationScore: number;
    codeQualityScore: number;
  };
  revival: {
    potentialScore: number;
    reasons: string[];
    concerns: string[];
    recommendation: 'high' | 'medium' | 'low' | 'not-recommended';
  };
  tags: string[];
  isArchived: boolean;
  isFork: boolean;
  isPrivate: boolean;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
  analyzedAt: string;
  lastSyncAt: string;
}

export interface SearchFilters {
  query?: string;
  language?: string;
  minStars?: number;
  maxStars?: number;
  minForks?: number;
  maxForks?: number;
  lastCommitBefore?: string;
  lastCommitAfter?: string;
  hasIssues?: boolean;
  hasWiki?: boolean;
  hasPages?: boolean;
  archived?: boolean;
  fork?: boolean;
  sort?: 'stars' | 'forks' | 'updated' | 'created';
  order?: 'asc' | 'desc';
  perPage?: number;
  page?: number;
}

export interface SearchResponse {
  repositories: Repository[];
  totalCount: number;
  page: number;
  perPage: number;
  searchId: string;
  cached: boolean;
}

export interface CollectionJob {
  _id: string;
  userId: string;
  name: string;
  filters: SearchFilters;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: {
    current: number;
    total: number;
    percentage: number;
    stage: string;
  };
  results: {
    found: number;
    analyzed: number;
    highPotential: number;
    repositories: string[];
  };
  settings: {
    maxResults: number;
    analysisDepth: 'basic' | 'detailed' | 'comprehensive';
    includeArchived: boolean;
    includeForks: boolean;
  };
  startedAt: string;
  completedAt?: string;
  estimatedCompletionAt?: string;
  error?: string;
  logs: Array<{
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    data?: any;
  }>;
}

export interface RateLimitInfo {
  core: {
    limit: number;
    remaining: number;
    reset: Date;
    used: number;
  };
  search: {
    limit: number;
    remaining: number;
    reset: Date;
    used: number;
  };
}

export interface Statistics {
  totalRepositories: number;
  revivalPotential: {
    high: number;
    medium: number;
    low: number;
    notRecommended: number;
  };
  topLanguages: Array<{
    _id: string;
    count: number;
  }>;
  recentlyAnalyzed: number;
}

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token and sanitize data
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Apply sanitization middleware
        const sanitizationMiddleware = createSanitizationMiddleware();
        return sanitizationMiddleware(config);
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling and sanitization
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        // Sanitize response data
        if (response.data) {
          response.data = sanitizeApiResponse(response.data);
        }
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Repository search and discovery
  async searchRepositories(filters: SearchFilters): Promise<SearchResponse> {
    // The sanitization is now handled by the request interceptor
    const response = await this.api.get<ApiResponse<SearchResponse>>('/repositories/search', {
      params: filters,
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Search failed');
    }

    return response.data.data!;
  }

  async getRepository(id: string): Promise<Repository> {
    const response = await this.api.get<ApiResponse<Repository>>(`/repositories/${id}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get repository');
    }
    
    return response.data.data!;
  }

  async getRepositoryByName(owner: string, repo: string): Promise<Repository> {
    const response = await this.api.get<ApiResponse<Repository>>(`/repositories/github/${owner}/${repo}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get repository');
    }
    
    return response.data.data!;
  }

  async getHighPotentialRepositories(params: {
    page?: number;
    limit?: number;
    minScore?: number;
    language?: string;
  } = {}): Promise<{ repositories: Repository[]; pagination: any }> {
    const response = await this.api.get<ApiResponse<{ repositories: Repository[]; pagination: any }>>('/repositories/high-potential', {
      params,
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get high potential repositories');
    }
    
    return response.data.data!;
  }

  // Collection jobs
  async startCollectionJob(data: {
    name: string;
    filters: SearchFilters;
    settings?: {
      maxResults?: number;
      analysisDepth?: 'basic' | 'detailed' | 'comprehensive';
      includeArchived?: boolean;
      includeForks?: boolean;
    };
  }): Promise<{ jobId: string; message: string }> {
    const response = await this.api.post<ApiResponse<{ jobId: string; message: string }>>('/repositories/jobs', data);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to start collection job');
    }
    
    return response.data.data!;
  }

  async getJobStatus(jobId: string): Promise<CollectionJob> {
    const response = await this.api.get<ApiResponse<CollectionJob>>(`/repositories/jobs/${jobId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get job status');
    }
    
    return response.data.data!;
  }

  async cancelJob(jobId: string): Promise<{ message: string }> {
    const response = await this.api.delete<ApiResponse<{ message: string }>>(`/repositories/jobs/${jobId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to cancel job');
    }
    
    return response.data.data!;
  }

  async getUserJobs(limit?: number): Promise<CollectionJob[]> {
    const response = await this.api.get<ApiResponse<CollectionJob[]>>('/repositories/jobs', {
      params: { limit },
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get user jobs');
    }
    
    return response.data.data!;
  }

  // Statistics and monitoring
  async getRateLimit(): Promise<RateLimitInfo> {
    const response = await this.api.get<ApiResponse<RateLimitInfo>>('/repositories/rate-limit');
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get rate limit');
    }
    
    return response.data.data!;
  }

  async getStatistics(): Promise<Statistics> {
    const response = await this.api.get<ApiResponse<Statistics>>('/repositories/statistics');
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get statistics');
    }
    
    return response.data.data!;
  }

  // Authentication (existing methods)
  async login(email: string, password: string): Promise<{ token: string; user: any }> {
    const response = await this.api.post<ApiResponse<{ token: string; user: any }>>('/auth/login', {
      email,
      password,
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Login failed');
    }
    
    return response.data.data!;
  }

  async register(userData: { name: string; email: string; password: string }): Promise<{ token: string; user: any }> {
    const response = await this.api.post<ApiResponse<{ token: string; user: any }>>('/auth/register', userData);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Registration failed');
    }
    
    return response.data.data!;
  }

  async getCurrentUser(): Promise<any> {
    const response = await this.api.get<ApiResponse<any>>('/auth/me');
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get user');
    }
    
    return response.data.data!;
  }

  // Analysis API methods
  async analyzeRepository(owner: string, repo: string): Promise<RepositoryAnalysis> {
    const response = await this.api.post<ApiResponse<RepositoryAnalysis>>(`/analysis/${owner}/${repo}`);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to analyze repository');
    }

    return response.data.data!;
  }

  async getRepositoryAnalysis(owner: string, repo: string): Promise<RepositoryAnalysis> {
    const response = await this.api.get<ApiResponse<RepositoryAnalysis>>(`/analysis/${owner}/${repo}`);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get repository analysis');
    }

    return response.data.data!;
  }

  async batchAnalyzeRepositories(repositories: { owner: string; repo: string }[]): Promise<{
    results: Array<{
      repository: string;
      analysis: RepositoryAnalysis;
      success: boolean;
    }>;
    errors: Array<{
      repository: { owner: string; repo: string };
      error: string;
      success: boolean;
    }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  }> {
    const response = await this.api.post<ApiResponse<any>>('/analysis/batch', { repositories });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to batch analyze repositories');
    }

    return response.data.data!;
  }

  async getAnalysisStats(): Promise<{
    totalAnalyzed: number;
    averageRevivalScore: number;
    highPotential: number;
    mediumPotential: number;
    lowPotential: number;
  }> {
    const response = await this.api.get<ApiResponse<any>>('/analysis/stats');

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get analysis stats');
    }

    return response.data.data!;
  }

  // Repository Details
  async getRepository(fullName: string): Promise<Repository> {
    const response = await this.api.get<ApiResponse<Repository>>(`/repositories/${encodeURIComponent(fullName)}`);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get repository');
    }

    return response.data.data!;
  }

  async saveRepository(repositoryId: string): Promise<void> {
    const response = await this.api.post<ApiResponse<void>>(`/repositories/${repositoryId}/save`);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to save repository');
    }
  }

  async unsaveRepository(repositoryId: string): Promise<void> {
    const response = await this.api.delete<ApiResponse<void>>(`/repositories/${repositoryId}/save`);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to unsave repository');
    }
  }

  // Repository Analysis
  async getRepositoryAnalysis(fullName: string): Promise<RepositoryAnalysis> {
    const response = await this.api.get<ApiResponse<RepositoryAnalysis>>(`/analysis/${encodeURIComponent(fullName)}`);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get repository analysis');
    }

    return response.data.data!;
  }

  async runRepositoryAnalysis(fullName: string): Promise<RepositoryAnalysis> {
    const response = await this.api.post<ApiResponse<RepositoryAnalysis>>(`/analysis/${encodeURIComponent(fullName)}`);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to run repository analysis');
    }

    return response.data.data!;
  }

  // User Dashboard Methods
  async getCurrentUser(): Promise<any> {
    const response = await this.api.get<ApiResponse<any>>('/auth/me');

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get current user');
    }

    return response.data.data!;
  }

  async completeGitHubAuth(code: string): Promise<any> {
    const response = await this.api.post<ApiResponse<any>>('/auth/github/callback', { code });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Authentication failed');
    }

    return response.data.data!;
  }

  async logout(): Promise<void> {
    const response = await this.api.post<ApiResponse<void>>('/auth/logout');

    if (!response.data.success) {
      throw new Error(response.data.error || 'Logout failed');
    }
  }

  async updateUserProfile(userData: any): Promise<any> {
    const response = await this.api.put<ApiResponse<any>>('/auth/me', userData);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update profile');
    }

    return response.data.data!;
  }

  async getSavedRepositories(): Promise<Repository[]> {
    const response = await this.api.get<ApiResponse<Repository[]>>('/users/saved-repositories');

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get saved repositories');
    }

    return response.data.data!;
  }

  async getAnalysisHistory(): Promise<any[]> {
    const response = await this.api.get<ApiResponse<any[]>>('/users/analysis-history');

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get analysis history');
    }

    return response.data.data!;
  }

  async getUsageStats(): Promise<any> {
    const response = await this.api.get<ApiResponse<any>>('/auth/usage');

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get usage statistics');
    }

    return response.data.data!;
  }

  async getPersonalizedRecommendations(): Promise<Repository[]> {
    const response = await this.api.get<ApiResponse<Repository[]>>('/users/recommendations');

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get recommendations');
    }

    return response.data.data!;
  }

  // Performance Monitoring Methods
  async getPerformanceMetrics(timeWindow?: number): Promise<any> {
    const params = timeWindow ? { timeWindow } : {};
    const response = await this.api.get<ApiResponse<any>>('/monitoring/metrics', { params });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get performance metrics');
    }

    return response.data.data!;
  }

  async getPerformanceAlerts(): Promise<any> {
    const response = await this.api.get<ApiResponse<any>>('/monitoring/alerts');

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get performance alerts');
    }

    return response.data.data!;
  }

  async getAnalysisBaseline(): Promise<any> {
    const response = await this.api.get<ApiResponse<any>>('/monitoring/analysis-baseline');

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get analysis baseline');
    }

    return response.data.data!;
  }

  async getSystemStats(): Promise<any> {
    const response = await this.api.get<ApiResponse<any>>('/monitoring/system-stats');

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get system stats');
    }

    return response.data.data!;
  }
}

export const apiService = new ApiService();
export default apiService;
