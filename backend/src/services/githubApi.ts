// @ts-nocheck
import { Octokit } from '@octokit/rest';
import NodeCache from 'node-cache';
import { logger } from '../config/logger';
import {
  GitHubRepository,
  GitHubSearchResponse,
  RepositorySearchFilters,
  RepositoryMetrics,
  RepositoryActivity,
  RepositoryAnalysis,
  GitHubRateLimit,
  RateLimitInfo,
  SearchQueryBuilder,
  ApiUsageTracking
} from '../types/github';

class GitHubApiService {
  private octokit: Octokit;
  private cache: NodeCache;
  private rateLimitCache: NodeCache;
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly RATE_LIMIT_CACHE_TTL = 3600; // 1 hour
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  constructor() {
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      logger.warn('GitHub token not provided. API requests will be limited.');
    }

    this.octokit = new Octokit({
      auth: githubToken,
      userAgent: 'GitHub-Project-Miner/1.0.0',
      throttle: {
        onRateLimit: (retryAfter: number, options: any) => {
          logger.warn(`Rate limit exceeded. Retrying after ${retryAfter} seconds.`);
          return true; // Retry
        },
        onAbuseLimit: (retryAfter: number, options: any) => {
          logger.error(`Abuse detection triggered. Retrying after ${retryAfter} seconds.`);
          return true; // Retry
        },
      },
    });

    // Cache for API responses
    this.cache = new NodeCache({ 
      stdTTL: this.CACHE_TTL,
      checkperiod: 60,
      useClones: false
    });

    // Cache for rate limit info
    this.rateLimitCache = new NodeCache({ 
      stdTTL: this.RATE_LIMIT_CACHE_TTL,
      checkperiod: 300
    });
  }

  /**
   * Get current rate limit status
   */
  async getRateLimit(): Promise<RateLimitInfo> {
    try {
      const cacheKey = 'rate_limit_info';
      const cached = this.rateLimitCache.get<RateLimitInfo>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const response = await this.octokit.rest.rateLimit.get();
      const rateLimitInfo: RateLimitInfo = {
        core: {
          limit: response.data.rate.limit,
          remaining: response.data.rate.remaining,
          reset: new Date(response.data.rate.reset * 1000),
          used: response.data.rate.used,
        },
        search: {
          limit: response.data.search.limit,
          remaining: response.data.search.remaining,
          reset: new Date(response.data.search.reset * 1000),
          used: response.data.search.used,
        },
        graphql: {
          limit: response.data.graphql.limit,
          remaining: response.data.graphql.remaining,
          reset: new Date(response.data.graphql.reset * 1000),
          used: response.data.graphql.used,
        },
        integration_manifest: {
          limit: response.data.integration_manifest.limit,
          remaining: response.data.integration_manifest.remaining,
          reset: new Date(response.data.integration_manifest.reset * 1000),
          used: response.data.integration_manifest.used,
        },
        source_import: {
          limit: response.data.source_import.limit,
          remaining: response.data.source_import.remaining,
          reset: new Date(response.data.source_import.reset * 1000),
          used: response.data.source_import.used,
        },
        code_scanning_upload: {
          limit: response.data.code_scanning_upload.limit,
          remaining: response.data.code_scanning_upload.remaining,
          reset: new Date(response.data.code_scanning_upload.reset * 1000),
          used: response.data.code_scanning_upload.used,
        },
        actions_runner_registration: {
          limit: response.data.actions_runner_registration.limit,
          remaining: response.data.actions_runner_registration.remaining,
          reset: new Date(response.data.actions_runner_registration.reset * 1000),
          used: response.data.actions_runner_registration.used,
        },
        scim: {
          limit: response.data.scim.limit,
          remaining: response.data.scim.remaining,
          reset: new Date(response.data.scim.reset * 1000),
          used: response.data.scim.used,
        },
      };

      this.rateLimitCache.set(cacheKey, rateLimitInfo, 300); // Cache for 5 minutes
      return rateLimitInfo;
    } catch (error) {
      logger.error('Failed to get rate limit info:', error);
      throw new Error('Failed to retrieve rate limit information');
    }
  }

  /**
   * Check if we have enough rate limit remaining for an operation
   */
  async checkRateLimit(endpoint: 'core' | 'search' = 'core', required: number = 1): Promise<boolean> {
    try {
      const rateLimitInfo = await this.getRateLimit();
      const limit = rateLimitInfo[endpoint];
      
      if (limit.remaining < required) {
        const resetTime = limit.reset.getTime() - Date.now();
        logger.warn(`Rate limit insufficient. ${limit.remaining} remaining, ${required} required. Reset in ${Math.ceil(resetTime / 1000)} seconds.`);
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to check rate limit:', error);
      return false;
    }
  }

  /**
   * Wait for rate limit reset if necessary
   */
  async waitForRateLimit(endpoint: 'core' | 'search' = 'core'): Promise<void> {
    try {
      const rateLimitInfo = await this.getRateLimit();
      const limit = rateLimitInfo[endpoint];
      
      if (limit.remaining === 0) {
        const waitTime = limit.reset.getTime() - Date.now();
        if (waitTime > 0) {
          logger.info(`Waiting ${Math.ceil(waitTime / 1000)} seconds for rate limit reset...`);
          await new Promise(resolve => setTimeout(resolve, waitTime + 1000)); // Add 1 second buffer
        }
      }
    } catch (error) {
      logger.error('Failed to wait for rate limit:', error);
    }
  }

  /**
   * Execute API request with retry logic and rate limiting
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    endpoint: 'core' | 'search' = 'core',
    retries: number = this.MAX_RETRIES
  ): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Check rate limit before making request
        const hasRateLimit = await this.checkRateLimit(endpoint);
        if (!hasRateLimit) {
          await this.waitForRateLimit(endpoint);
        }

        return await operation();
      } catch (error: any) {
        const isLastAttempt = attempt === retries;
        
        if (error.status === 403 && error.message?.includes('rate limit')) {
          logger.warn(`Rate limit hit on attempt ${attempt}. Waiting for reset...`);
          await this.waitForRateLimit(endpoint);
          continue;
        }
        
        if (error.status === 502 || error.status === 503 || error.status === 504) {
          if (!isLastAttempt) {
            const delay = this.RETRY_DELAY * Math.pow(2, attempt - 1); // Exponential backoff
            logger.warn(`Server error on attempt ${attempt}. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        if (isLastAttempt) {
          logger.error(`API request failed after ${retries} attempts:`, error);
          throw error;
        }
        
        const delay = this.RETRY_DELAY * attempt;
        logger.warn(`Request failed on attempt ${attempt}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  /**
   * Build GitHub search query from filters
   */
  private buildSearchQuery(filters: RepositorySearchFilters): string {
    const queryParts: string[] = [];
    
    if (filters.query) {
      queryParts.push(filters.query);
    }
    
    if (filters.language) {
      queryParts.push(`language:${filters.language}`);
    }
    
    if (filters.minStars !== undefined) {
      if (filters.maxStars !== undefined) {
        queryParts.push(`stars:${filters.minStars}..${filters.maxStars}`);
      } else {
        queryParts.push(`stars:>=${filters.minStars}`);
      }
    } else if (filters.maxStars !== undefined) {
      queryParts.push(`stars:<=${filters.maxStars}`);
    }
    
    if (filters.minForks !== undefined) {
      if (filters.maxForks !== undefined) {
        queryParts.push(`forks:${filters.minForks}..${filters.maxForks}`);
      } else {
        queryParts.push(`forks:>=${filters.minForks}`);
      }
    } else if (filters.maxForks !== undefined) {
      queryParts.push(`forks:<=${filters.maxForks}`);
    }
    
    if (filters.lastCommitBefore) {
      const date = filters.lastCommitBefore.toISOString().split('T')[0];
      queryParts.push(`pushed:<${date}`);
    }
    
    if (filters.lastCommitAfter) {
      const date = filters.lastCommitAfter.toISOString().split('T')[0];
      queryParts.push(`pushed:>${date}`);
    }
    
    if (filters.hasIssues !== undefined) {
      queryParts.push(`has:issues`);
    }
    
    if (filters.hasWiki !== undefined) {
      queryParts.push(`has:wiki`);
    }
    
    if (filters.hasPages !== undefined) {
      queryParts.push(`has:pages`);
    }
    
    if (filters.archived !== undefined) {
      queryParts.push(`archived:${filters.archived}`);
    }
    
    if (filters.fork !== undefined) {
      queryParts.push(`fork:${filters.fork}`);
    }
    
    return queryParts.join(' ');
  }

  /**
   * Search repositories with filters
   */
  async searchRepositories(filters: RepositorySearchFilters): Promise<GitHubSearchResponse> {
    const cacheKey = `search_${JSON.stringify(filters)}`;
    const cached = this.cache.get<GitHubSearchResponse>(cacheKey);
    
    if (cached) {
      logger.debug('Returning cached search results');
      return cached;
    }

    const query = this.buildSearchQuery(filters);
    const sort = filters.sort || 'updated';
    const order = filters.order || 'desc';
    const perPage = Math.min(filters.perPage || 30, 100); // GitHub max is 100
    const page = filters.page || 1;

    logger.info(`Searching repositories: "${query}" (sort: ${sort}, order: ${order})`);

    const result = await this.executeWithRetry(
      () => this.octokit.rest.search.repos({
        q: query,
        sort,
        order,
        per_page: perPage,
        page,
      }),
      'search'
    );

    const response = result.data;
    this.cache.set(cacheKey, response);
    
    logger.info(`Found ${response.total_count} repositories (showing ${response.items.length})`);
    return response;
  }

  /**
   * Get detailed repository information
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    const cacheKey = `repo_${owner}_${repo}`;
    const cached = this.cache.get<GitHubRepository>(cacheKey);

    if (cached) {
      logger.debug(`Returning cached repository data for ${owner}/${repo}`);
      return cached;
    }

    logger.info(`Fetching repository details: ${owner}/${repo}`);

    const result = await this.executeWithRetry(
      () => this.octokit.rest.repos.get({
        owner,
        repo,
      })
    );

    const repository = result.data;
    this.cache.set(cacheKey, repository);

    return repository;
  }

  /**
   * Get repository metrics (stars, forks, etc.)
   */
  async getRepositoryMetrics(owner: string, repo: string): Promise<RepositoryMetrics> {
    const cacheKey = `metrics_${owner}_${repo}`;
    const cached = this.cache.get<RepositoryMetrics>(cacheKey);

    if (cached) {
      return cached;
    }

    logger.info(`Collecting metrics for ${owner}/${repo}`);

    // Get basic repository info
    const repository = await this.getRepository(owner, repo);

    // Get additional data in parallel
    const [commits, contributors, languages, releases] = await Promise.allSettled([
      this.executeWithRetry(() => this.octokit.rest.repos.listCommits({
        owner,
        repo,
        per_page: 1,
      })),
      this.executeWithRetry(() => this.octokit.rest.repos.listContributors({
        owner,
        repo,
        per_page: 100,
      })),
      this.executeWithRetry(() => this.octokit.rest.repos.listLanguages({
        owner,
        repo,
      })),
      this.executeWithRetry(() => this.octokit.rest.repos.listReleases({
        owner,
        repo,
        per_page: 1,
      })),
    ]);

    const metrics: RepositoryMetrics = {
      stars: repository.stargazers_count,
      forks: repository.forks_count,
      watchers: repository.watchers_count,
      openIssues: repository.open_issues_count,
      size: repository.size,
      lastCommitDate: new Date(repository.pushed_at),
      contributorCount: contributors.status === 'fulfilled' ? contributors.value.data.length : 0,
      commitCount: 0, // Will be estimated from API headers
      branchCount: 0, // Will be fetched separately if needed
      releaseCount: 0,
      issueCount: repository.open_issues_count,
      pullRequestCount: 0, // Will be fetched separately if needed
      languages: languages.status === 'fulfilled' ? languages.value.data : {},
      license: repository.license?.spdx_id,
      topics: repository.topics || [],
    };

    // Get last release date if available
    if (releases.status === 'fulfilled' && releases.value.data.length > 0) {
      metrics.lastReleaseDate = new Date(releases.value.data[0].published_at);
      metrics.releaseCount = releases.value.data.length;
    }

    this.cache.set(cacheKey, metrics, this.CACHE_TTL * 2); // Cache longer for metrics
    return metrics;
  }

  /**
   * Analyze repository activity patterns
   */
  async getRepositoryActivity(owner: string, repo: string): Promise<RepositoryActivity> {
    const cacheKey = `activity_${owner}_${repo}`;
    const cached = this.cache.get<RepositoryActivity>(cacheKey);

    if (cached) {
      return cached;
    }

    logger.info(`Analyzing activity for ${owner}/${repo}`);

    // Get recent commits (last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const [recentCommits, recentIssues, recentPRs] = await Promise.allSettled([
      this.executeWithRetry(() => this.octokit.rest.repos.listCommits({
        owner,
        repo,
        since: threeMonthsAgo.toISOString(),
        per_page: 100,
      })),
      this.executeWithRetry(() => this.octokit.rest.issues.listForRepo({
        owner,
        repo,
        state: 'all',
        since: threeMonthsAgo.toISOString(),
        per_page: 100,
      })),
      this.executeWithRetry(() => this.octokit.rest.pulls.list({
        owner,
        repo,
        state: 'all',
        per_page: 100,
      })),
    ]);

    const commitCount = recentCommits.status === 'fulfilled' ? recentCommits.value.data.length : 0;
    const issueCount = recentIssues.status === 'fulfilled' ? recentIssues.value.data.length : 0;
    const prCount = recentPRs.status === 'fulfilled' ? recentPRs.value.data.length : 0;

    // Calculate activity metrics
    const commitFrequency = commitCount / 3; // per month
    const issueActivity = issueCount / 3; // per month
    const prActivity = prCount / 3; // per month

    // Get unique contributors from recent commits
    const uniqueContributors = new Set();
    if (recentCommits.status === 'fulfilled') {
      recentCommits.value.data.forEach(commit => {
        if (commit.author?.login) {
          uniqueContributors.add(commit.author.login);
        }
      });
    }

    const contributorActivity = uniqueContributors.size / 3; // per month

    // Calculate activity score (0-100)
    const activityScore = Math.min(100, Math.round(
      (commitFrequency * 10) +
      (issueActivity * 5) +
      (prActivity * 15) +
      (contributorActivity * 20)
    ));

    // Get last activity date
    const lastActivity = new Date(Math.max(
      ...[
        recentCommits.status === 'fulfilled' && recentCommits.value.data[0]
          ? new Date(recentCommits.value.data[0].commit.committer.date).getTime()
          : 0,
        recentIssues.status === 'fulfilled' && recentIssues.value.data[0]
          ? new Date(recentIssues.value.data[0].updated_at).getTime()
          : 0,
        recentPRs.status === 'fulfilled' && recentPRs.value.data[0]
          ? new Date(recentPRs.value.data[0].updated_at).getTime()
          : 0,
      ]
    ));

    const activity: RepositoryActivity = {
      commitFrequency,
      issueActivity,
      prActivity,
      contributorActivity,
      lastActivity,
      activityScore,
    };

    this.cache.set(cacheKey, activity, this.CACHE_TTL * 2);
    return activity;
  }

  /**
   * Get repository quality indicators
   */
  async getRepositoryQuality(owner: string, repo: string): Promise<any> {
    const cacheKey = `quality_${owner}_${repo}`;
    const cached = this.cache.get(cacheKey);

    if (cached) {
      return cached;
    }

    logger.info(`Analyzing quality indicators for ${owner}/${repo}`);

    // Check for important files
    const fileChecks = await Promise.allSettled([
      this.executeWithRetry(() => this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: 'README.md',
      })),
      this.executeWithRetry(() => this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: 'LICENSE',
      })),
      this.executeWithRetry(() => this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: 'CONTRIBUTING.md',
      })),
      this.executeWithRetry(() => this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: 'CODE_OF_CONDUCT.md',
      })),
      this.executeWithRetry(() => this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: '.github/ISSUE_TEMPLATE',
      })),
      this.executeWithRetry(() => this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: '.github/PULL_REQUEST_TEMPLATE.md',
      })),
    ]);

    const quality = {
      hasReadme: fileChecks[0].status === 'fulfilled',
      hasLicense: fileChecks[1].status === 'fulfilled',
      hasContributing: fileChecks[2].status === 'fulfilled',
      hasCodeOfConduct: fileChecks[3].status === 'fulfilled',
      hasIssueTemplate: fileChecks[4].status === 'fulfilled',
      hasPrTemplate: fileChecks[5].status === 'fulfilled',
      documentationScore: 0,
      codeQualityScore: 0,
    };

    // Calculate documentation score
    let docScore = 0;
    if (quality.hasReadme) docScore += 30;
    if (quality.hasLicense) docScore += 20;
    if (quality.hasContributing) docScore += 20;
    if (quality.hasCodeOfConduct) docScore += 15;
    if (quality.hasIssueTemplate) docScore += 10;
    if (quality.hasPrTemplate) docScore += 5;

    quality.documentationScore = docScore;
    quality.codeQualityScore = 50; // Placeholder - would need actual code analysis

    this.cache.set(cacheKey, quality, this.CACHE_TTL * 4); // Cache longer
    return quality;
  }

  /**
   * Track API usage for monitoring
   */
  async trackApiUsage(userId: string, endpoint: string, success: boolean, responseTime: number, error?: string): Promise<void> {
    try {
      const rateLimitInfo = await this.getRateLimit();

      const usage: ApiUsageTracking = {
        userId,
        endpoint,
        timestamp: new Date(),
        rateLimitRemaining: rateLimitInfo.core.remaining,
        rateLimitReset: rateLimitInfo.core.reset,
        responseTime,
        success,
        error,
      };

      // In a real implementation, this would be saved to database
      logger.debug('API usage tracked:', usage);
    } catch (error) {
      logger.error('Failed to track API usage:', error);
    }
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cache.flushAll();
    this.rateLimitCache.flushAll();
    logger.info('GitHub API cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): any {
    return {
      apiCache: this.cache.getStats(),
      rateLimitCache: this.rateLimitCache.getStats(),
    };
  }
}

// Export singleton instance
export const githubApiService = new GitHubApiService();
export default githubApiService;
