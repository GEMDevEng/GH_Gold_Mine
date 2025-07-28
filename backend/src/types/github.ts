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
