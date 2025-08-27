import { RestEndpointMethodTypes } from '@octokit/rest';

// GitHub API response types
export type GitHubRepository = RestEndpointMethodTypes['repos']['get']['response']['data'];
export type GitHubSearchResponse = RestEndpointMethodTypes['search']['repos']['response']['data'];
export type GitHubSearchRepository = GitHubSearchResponse['items'][0];
export type GitHubCommit = RestEndpointMethodTypes['repos']['listCommits']['response']['data'][0];
export type GitHubContributor = RestEndpointMethodTypes['repos']['listContributors']['response']['data'][0];
export type GitHubLanguages = RestEndpointMethodTypes['repos']['listLanguages']['response']['data'];
export type GitHubReleases = RestEndpointMethodTypes['repos']['listReleases']['response']['data'];
export type GitHubIssues = RestEndpointMethodTypes['issues']['listForRepo']['response']['data'];
export type GitHubPullRequests = RestEndpointMethodTypes['pulls']['list']['response']['data'];

// Custom types for our application
export interface RepositorySearchFilters {
  query?: string;
  language?: string;
  minStars?: number;
  maxStars?: number;
  minForks?: number;
  maxForks?: number;
  lastCommitBefore?: Date;
  lastCommitAfter?: Date;
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

export interface RepositoryMetrics {
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  size: number;
  lastCommitDate: Date;
  lastReleaseDate?: Date;
  contributorCount: number;
  commitCount: number;
  branchCount: number;
  releaseCount: number;
  issueCount: number;
  pullRequestCount: number;
  languages: Record<string, number>;
  license?: string;
  topics: string[];
}

export interface RepositoryActivity {
  commitFrequency: number; // commits per month
  issueActivity: number; // issues opened/closed per month
  prActivity: number; // PRs opened/merged per month
  contributorActivity: number; // active contributors per month
  lastActivity: Date;
  activityScore: number; // 0-100 score based on recent activity
}

export interface RepositoryAnalysis {
  id: string;
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
  };
  metrics: RepositoryMetrics;
  activity: RepositoryActivity;
  quality: {
    hasReadme: boolean;
    hasLicense: boolean;
    hasContributing: boolean;
    hasCodeOfConduct: boolean;
    hasIssueTemplate: boolean;
    hasPrTemplate: boolean;
    documentationScore: number; // 0-100
    codeQualityScore: number; // 0-100
  };
  revival: {
    potentialScore: number; // 0-100 overall revival potential
    reasons: string[]; // reasons why it has potential
    concerns: string[]; // potential issues or concerns
    recommendation: 'high' | 'medium' | 'low' | 'not-recommended';
  };
  createdAt: Date;
  updatedAt: Date;
  analyzedAt: Date;
}

export interface GitHubRateLimit {
  limit: number;
  remaining: number;
  reset: Date;
  used: number;
}

export interface GitHubApiError {
  message: string;
  status: number;
  headers?: Record<string, string>;
  documentation_url?: string;
}

// Search query builder types
export interface SearchQueryBuilder {
  language?: string;
  stars?: string;
  forks?: string;
  size?: string;
  pushed?: string;
  created?: string;
  updated?: string;
  user?: string;
  org?: string;
  repo?: string;
  topic?: string;
  license?: string;
  is?: 'public' | 'private' | 'fork';
  archived?: boolean;
  good_first_issues?: string;
  help_wanted_issues?: string;
}

export interface DiscoveryJob {
  id: string;
  userId: string;
  filters: RepositorySearchFilters;
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

// Rate limiting types
export interface RateLimitInfo {
  core: GitHubRateLimit;
  search: GitHubRateLimit;
  graphql: GitHubRateLimit;
  integration_manifest: GitHubRateLimit;
  source_import: GitHubRateLimit;
  code_scanning_upload: GitHubRateLimit;
  actions_runner_registration: GitHubRateLimit;
  scim: GitHubRateLimit;
}

export interface ApiUsageTracking {
  userId: string;
  endpoint: string;
  timestamp: Date;
  rateLimitRemaining: number;
  rateLimitReset: Date;
  responseTime: number;
  success: boolean;
  error?: string;
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
