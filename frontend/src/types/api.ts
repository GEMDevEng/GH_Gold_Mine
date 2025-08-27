// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Repository Types
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
    language: string;
    topics: string[];
    license?: string;
  };
  activity: {
    lastCommit: Date;
    lastRelease?: Date;
    commitFrequency: number;
    issueActivity: number;
    prActivity: number;
    activityScore: number;
    lastActivity: Date;
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
  analysis?: RepositoryAnalysis;
  tags: string[];
  isArchived: boolean;
  isFork: boolean;
  isPrivate: boolean;
  defaultBranch: string;
  createdAt: Date;
  updatedAt: Date;
  analyzedAt: Date;
  lastSyncAt: Date;
  lastAnalyzedAt?: Date;
}

// Search and Filter Types
export interface SearchFilters {
  query?: string;
  language?: string;
  minStars?: number;
  maxStars?: number;
  minForks?: number;
  maxForks?: number;
  topics?: string[];
  hasLicense?: boolean;
  hasReadme?: boolean;
  lastActivity?: {
    from?: Date;
    to?: Date;
  };
  createdAt?: {
    from?: Date;
    to?: Date;
  };
  size?: {
    min?: number;
    max?: number;
  };
  revivalPotential?: 'high' | 'medium' | 'low';
  sortBy?: 'stars' | 'forks' | 'updated' | 'created' | 'revival-score';
  sortOrder?: 'asc' | 'desc';
}

// Collection Job Types
export interface CollectionJob {
  _id: string;
  userId: string;
  name: string;
  filters: SearchFilters;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  results: {
    found: number;
    analyzed: number;
    highPotential: number;
  };
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

// Rate Limiting Types
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

// Statistics Types
export interface Statistics {
  totalRepositories: number;
  totalUsers: number;
  totalAnalyses: number;
  averageRevivalScore: number;
  topLanguages: Array<{
    language: string;
    count: number;
  }>;
  recentActivity: Array<{
    date: string;
    repositories: number;
    analyses: number;
  }>;
}

// Analysis Engine Types
export interface RepositoryAnalysis {
  repositoryId: string;
  analyzedAt: Date;
  codeQuality: CodeQualityMetrics;
  businessEvaluation: BusinessEvaluationMetrics;
  revivalPotential: RevivalPotentialScore;
  recommendations: string[];
  summary: string;
}

export interface CodeQualityMetrics {
  complexity: number; // 0-100, higher is better (less complex)
  maintainability: number; // 0-100
  testCoverage: number; // 0-100
  documentation: number; // 0-100
  codeStyle: number; // 0-100
  dependencies: number; // 0-100
  security: number; // 0-100
  overallScore: number; // 0-100
}

export interface BusinessEvaluationMetrics {
  marketDemand: number; // 0-100
  competitorAnalysis: number; // 0-100
  userEngagement: number; // 0-100
  monetizationPotential: number; // 0-100
  scalabilityScore: number; // 0-100
  riskAssessment: number; // 0-100
  overallScore: number; // 0-100
}

export interface RevivalPotentialScore {
  score: number; // 0-100
  recommendation: 'high' | 'medium' | 'low' | 'not-recommended';
  factors: {
    abandonment: number; // 0-100
    community: number; // 0-100
    technical: number; // 0-100
    business: number; // 0-100
    marketTiming?: number; // 0-100
    competitiveAdvantage?: number; // 0-100
    revivalComplexity?: number; // 0-100
    communityReadiness?: number; // 0-100
  };
  confidence: number; // 0-100
  reasoning?: string[]; // Enhanced reasoning for the recommendation
  weights?: Record<string, number>; // Dynamic weights used in calculation
}

// User and Authentication Types
export interface User {
  _id: string;
  name: string;
  email: string;
  githubId?: number;
  githubUsername?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}
