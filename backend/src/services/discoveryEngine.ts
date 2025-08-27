
import { logger } from '../config/logger';
import { githubApiService } from './githubApi';
import { Repository, IRepository } from '../models/Repository';
import { SearchResult, ISearchResult } from '../models/SearchResult';
import { DiscoveryJob, IDiscoveryJob } from '../models/ApiUsage';
import { 
  RepositorySearchFilters, 
  RepositoryAnalysis,
  GitHubSearchRepository 
} from '../types/github';

export class DiscoveryEngine {
  /**
   * Discover abandoned repositories with revival potential
   */
  async discoverRepositories(
    userId: string, 
    filters: RepositorySearchFilters
  ): Promise<{ repositories: IRepository[], totalCount: number, searchId: string }> {
    const startTime = Date.now();
    
    try {
      logger.info(`Starting repository discovery for user ${userId}`, { filters });

      // Enhance filters for abandoned repository discovery
      const enhancedFilters = this.enhanceFiltersForAbandoned(filters);
      
      // Search GitHub API
      const searchResponse = await githubApiService.searchRepositories(enhancedFilters);
      
      // Process and analyze repositories
      const repositories = await this.processSearchResults(searchResponse.items, userId);
      
      // Save search results
      const searchResult = await this.saveSearchResults(
        userId, 
        enhancedFilters, 
        repositories, 
        searchResponse.total_count,
        Date.now() - startTime
      );

      logger.info(`Discovery completed: found ${repositories.length} repositories in ${Date.now() - startTime}ms`);

      return {
        repositories,
        totalCount: searchResponse.total_count,
        searchId: searchResult._id,
      };
    } catch (error) {
      logger.error('Repository discovery failed:', error);
      throw new Error('Failed to discover repositories');
    }
  }

  /**
   * Enhance search filters to target abandoned repositories
   */
  private enhanceFiltersForAbandoned(filters: RepositorySearchFilters): RepositorySearchFilters {
    const enhanced = { ...filters };

    // Default to repositories with some activity but potentially abandoned
    if (!enhanced.minStars) {
      enhanced.minStars = 10; // At least some interest
    }
    
    if (!enhanced.maxStars) {
      enhanced.maxStars = 10000; // Not too popular (likely maintained)
    }

    // Look for repositories not updated recently (potential abandonment)
    if (!enhanced.lastCommitBefore) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      enhanced.lastCommitBefore = sixMonthsAgo;
    }

    // Exclude archived repositories by default
    if (enhanced.archived === undefined) {
      enhanced.archived = false;
    }

    // Exclude forks by default (focus on original projects)
    if (enhanced.fork === undefined) {
      enhanced.fork = false;
    }

    // Sort by stars to get quality projects first
    if (!enhanced.sort) {
      enhanced.sort = 'stars';
      enhanced.order = 'desc';
    }

    return enhanced;
  }

  /**
   * Process search results and analyze repositories
   */
  private async processSearchResults(
    searchItems: GitHubSearchRepository[],
    userId: string
  ): Promise<any[]> {
    const repositories: any[] = [];
    
    for (const item of searchItems) {
      try {
        // Check if repository already exists in our database
        let repository = await Repository.findOne({ githubId: item.id });

        if (repository) {
          // Update if it's been more than 24 hours since last sync
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          if (repository.lastSyncAt < dayAgo) {
            const updatedRepo = await this.updateRepositoryData(repository, item);
            if (updatedRepo) {
              repositories.push(updatedRepo);
            } else {
              repositories.push(repository);
            }
          } else {
            repositories.push(repository);
          }
        } else {
          // Create new repository record
          const newRepo = await this.createRepositoryRecord(item);
          if (newRepo) {
            repositories.push(newRepo);
          }
        }
      } catch (error) {
        logger.error(`Failed to process repository ${item.full_name}:`, error);
        // Continue with other repositories
      }
    }

    return repositories;
  }

  /**
   * Create new repository record with full analysis
   */
  private async createRepositoryRecord(item: GitHubSearchRepository): Promise<IRepository | null> {
    logger.info(`Analyzing new repository: ${item.full_name}`);

    const [owner, repo] = item.full_name.split('/');
    
    // Get detailed repository data
    const [metrics, activity, quality] = await Promise.allSettled([
      githubApiService.getRepositoryMetrics(owner, repo),
      githubApiService.getRepositoryActivity(owner, repo),
      githubApiService.getRepositoryQuality(owner, repo),
    ]);

    // Calculate revival potential
    const revival = this.calculateRevivalPotential(
      item,
      metrics.status === 'fulfilled' ? metrics.value : null,
      activity.status === 'fulfilled' ? activity.value : null,
      quality.status === 'fulfilled' ? quality.value : null
    );

    const repositoryData = {
      githubId: item.id,
      fullName: item.full_name,
      name: item.name,
      description: item.description,
      url: item.html_url,
      homepage: item.homepage,
      owner: {
        login: item.owner?.login || '',
        type: (item.owner?.type as 'User' | 'Organization') || 'User',
        avatar: item.owner?.avatar_url || '',
        url: item.owner?.html_url || '',
        githubId: item.owner?.id || 0,
      },
      metrics: metrics.status === 'fulfilled' ? metrics.value : {
        stars: item.stargazers_count,
        forks: item.forks_count,
        watchers: item.watchers_count,
        openIssues: item.open_issues_count,
        size: item.size,
        lastCommitDate: new Date(item.pushed_at),
        contributorCount: 0,
        commitCount: 0,
        branchCount: 0,
        releaseCount: 0,
        issueCount: item.open_issues_count,
        pullRequestCount: 0,
        languages: {},
        license: item.license?.spdx_id,
        topics: item.topics || [],
      },
      activity: activity.status === 'fulfilled' ? activity.value : {
        commitFrequency: 0,
        issueActivity: 0,
        prActivity: 0,
        contributorActivity: 0,
        lastActivity: new Date(item.pushed_at),
        activityScore: 0,
      },
      quality: quality.status === 'fulfilled' ? quality.value : {
        hasReadme: false,
        hasLicense: !!item.license,
        hasContributing: false,
        hasCodeOfConduct: false,
        hasIssueTemplate: false,
        hasPrTemplate: false,
        documentationScore: 0,
        codeQualityScore: 0,
      },
      revival,
      tags: this.generateTags(item, revival),
      isArchived: item.archived,
      isFork: item.fork,
      isPrivate: item.private,
      defaultBranch: item.default_branch,
      analyzedAt: new Date(),
      lastSyncAt: new Date(),
    };

    try {
      const repository = new Repository(repositoryData);
      await repository.save();

      logger.info(`Repository ${item.full_name} analyzed and saved with revival score: ${revival.potentialScore}`);
      return repository;
    } catch (error) {
      logger.error(`Failed to save repository ${item.full_name}:`, error);
      return null;
    }
  }

  /**
   * Update existing repository data
   */
  private async updateRepositoryData(
    repository: IRepository,
    item: GitHubSearchRepository
  ): Promise<IRepository | null> {
    logger.info(`Updating repository data: ${item.full_name}`);

    // Update basic metrics from search result
    repository.metrics.stars = item.stargazers_count;
    repository.metrics.forks = item.forks_count;
    repository.metrics.watchers = item.watchers_count;
    repository.metrics.openIssues = item.open_issues_count;
    repository.metrics.size = item.size;
    repository.metrics.lastCommitDate = new Date(item.pushed_at);
    repository.metrics.topics = item.topics || [];
    repository.isArchived = item.archived;
    repository.lastSyncAt = new Date();

    // Recalculate revival potential with updated data
    repository.revival = this.calculateRevivalPotential(
      item,
      repository.metrics,
      repository.activity,
      repository.quality
    );

    repository.tags = this.generateTags(item, repository.revival);

    try {
      await repository.save();
      return repository;
    } catch (error) {
      logger.error(`Failed to update repository ${item.full_name}:`, error);
      return null;
    }
  }

  /**
   * Calculate revival potential score and recommendations
   */
  private calculateRevivalPotential(
    item: GitHubSearchRepository,
    metrics: any,
    activity: any,
    quality: any
  ): any {
    let score = 0;
    const reasons: string[] = [];
    const concerns: string[] = [];

    // Star count factor (0-25 points)
    if (item.stargazers_count >= 100) {
      score += Math.min(25, item.stargazers_count / 100);
      reasons.push(`Popular project with ${item.stargazers_count} stars`);
    } else if (item.stargazers_count < 10) {
      concerns.push('Low star count indicates limited interest');
    }

    // Fork count factor (0-15 points)
    if (item.forks_count >= 10) {
      score += Math.min(15, item.forks_count / 5);
      reasons.push(`Active community with ${item.forks_count} forks`);
    }

    // Language popularity (0-10 points)
    const popularLanguages = ['JavaScript', 'Python', 'Java', 'TypeScript', 'Go', 'Rust'];
    if (item.language && popularLanguages.includes(item.language)) {
      score += 10;
      reasons.push(`Written in popular language: ${item.language}`);
    }

    // Recent activity penalty
    const daysSinceLastCommit = (Date.now() - new Date(item.pushed_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastCommit > 365) {
      score -= 20;
      concerns.push('No activity for over a year');
    } else if (daysSinceLastCommit > 180) {
      score -= 10;
      concerns.push('No recent activity (6+ months)');
    }

    // Quality factors
    if (quality) {
      if (quality.hasReadme) {
        score += 5;
        reasons.push('Has documentation (README)');
      } else {
        concerns.push('Missing README documentation');
      }

      if (quality.hasLicense) {
        score += 5;
        reasons.push('Has proper license');
      } else {
        concerns.push('No license specified');
      }

      score += quality.documentationScore * 0.1; // Up to 10 points
    }

    // Open issues factor
    if (item.open_issues_count > 0 && item.open_issues_count < 50) {
      score += 5;
      reasons.push('Has manageable number of open issues');
    } else if (item.open_issues_count > 100) {
      score -= 5;
      concerns.push('Too many open issues may indicate maintenance burden');
    }

    // Size factor (prefer medium-sized projects)
    if (item.size > 1000 && item.size < 50000) { // KB
      score += 5;
      reasons.push('Good project size for revival');
    } else if (item.size > 100000) {
      concerns.push('Large codebase may be difficult to maintain');
    }

    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score));

    // Determine recommendation
    let recommendation: 'high' | 'medium' | 'low' | 'not-recommended';
    if (score >= 70) {
      recommendation = 'high';
    } else if (score >= 50) {
      recommendation = 'medium';
    } else if (score >= 30) {
      recommendation = 'low';
    } else {
      recommendation = 'not-recommended';
    }

    return {
      potentialScore: Math.round(score),
      reasons,
      concerns,
      recommendation,
    };
  }

  /**
   * Generate tags for repository categorization
   */
  private generateTags(item: GitHubSearchRepository, revival: any): string[] {
    const tags: string[] = [];

    // Language tag
    if (item.language) {
      tags.push(item.language.toLowerCase());
    }

    // Size tags
    if (item.size < 1000) {
      tags.push('small');
    } else if (item.size < 10000) {
      tags.push('medium');
    } else {
      tags.push('large');
    }

    // Popularity tags
    if (item.stargazers_count >= 1000) {
      tags.push('popular');
    } else if (item.stargazers_count >= 100) {
      tags.push('moderate');
    } else {
      tags.push('niche');
    }

    // Revival potential tags
    tags.push(`revival-${revival.recommendation}`);

    // Topic tags (first 3)
    if (item.topics) {
      tags.push(...item.topics.slice(0, 3));
    }

    return tags;
  }

  /**
   * Save search results for caching and analytics
   */
  private async saveSearchResults(
    userId: string,
    filters: RepositorySearchFilters,
    repositories: IRepository[],
    totalCount: number,
    searchTime: number
  ): Promise<ISearchResult> {
    const searchResult = new SearchResult({
      userId,
      query: filters.query || '',
      filters,
      results: {
        totalCount,
        repositories: repositories.map(r => r._id),
        page: filters.page || 1,
        perPage: filters.perPage || 30,
      },
      metadata: {
        searchTime,
        rateLimitUsed: 1, // Simplified for now
        cacheHit: false,
      },
    });

    await searchResult.save();
    return searchResult;
  }

  /**
   * Get cached search results
   */
  async getCachedSearchResults(userId: string, filters: RepositorySearchFilters): Promise<ISearchResult | null> {
    const query = filters.query || '';
    
    // Look for recent search with same filters
    const cached = await SearchResult.findOne({
      userId,
      query,
      'filters.language': filters.language,
      'filters.minStars': filters.minStars,
      'filters.maxStars': filters.maxStars,
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }, // 1 hour cache
    }).populate('results.repositories');

    return cached;
  }
}

export const discoveryEngine = new DiscoveryEngine();
