// @ts-nocheck
import { logger } from '../config/logger';
import { githubApiService } from './githubApi';
import { Repository, IRepository } from '../models/Repository';
import { DiscoveryJob, IDiscoveryJob } from '../models/ApiUsage';
import { ApiUsage } from '../models/ApiUsage';
import { RepositorySearchFilters } from '../types/github';

export class DataCollectionPipeline {
  private readonly BATCH_SIZE = 10;
  private readonly DELAY_BETWEEN_BATCHES = 2000; // 2 seconds
  private readonly MAX_CONCURRENT_JOBS = 3;
  private runningJobs = new Map<string, boolean>();

  /**
   * Start a comprehensive data collection job
   */
  async startCollectionJob(
    userId: string,
    name: string,
    filters: RepositorySearchFilters,
    settings: {
      maxResults?: number;
      analysisDepth?: 'basic' | 'detailed' | 'comprehensive';
      includeArchived?: boolean;
      includeForks?: boolean;
    } = {}
  ): Promise<string> {
    // Check if user has too many running jobs
    const runningJobsCount = await DiscoveryJob.countDocuments({
      userId,
      status: { $in: ['pending', 'running'] },
    });

    if (runningJobsCount >= this.MAX_CONCURRENT_JOBS) {
      throw new Error(`Maximum ${this.MAX_CONCURRENT_JOBS} concurrent jobs allowed`);
    }

    // Create job record
    const job = new DiscoveryJob({
      userId,
      name,
      filters,
      settings: {
        maxResults: settings.maxResults || 1000,
        analysisDepth: settings.analysisDepth || 'basic',
        includeArchived: settings.includeArchived || false,
        includeForks: settings.includeForks || false,
      },
      status: 'pending',
      progress: {
        current: 0,
        total: 0,
        percentage: 0,
        stage: 'initializing',
      },
      results: {
        found: 0,
        analyzed: 0,
        highPotential: 0,
        repositories: [],
      },
    });

    await job.save();

    // Start job processing asynchronously
    this.processCollectionJob(job._id).catch(error => {
      logger.error(`Collection job ${job._id} failed:`, error);
    });

    logger.info(`Started collection job ${job._id} for user ${userId}`);
    return job._id;
  }

  /**
   * Process a collection job
   */
  private async processCollectionJob(jobId: string): Promise<void> {
    const job = await DiscoveryJob.findById(jobId);
    if (!job) {
      logger.error(`Job ${jobId} not found`);
      return;
    }

    try {
      this.runningJobs.set(jobId, true);
      
      // Update job status
      job.status = 'running';
      job.progress.stage = 'searching';
      await job.save();

      this.addJobLog(job, 'info', 'Starting repository search');

      // Phase 1: Search and discover repositories
      const repositories = await this.searchPhase(job);
      
      // Phase 2: Collect detailed data
      await this.collectionPhase(job, repositories);
      
      // Phase 3: Analysis and scoring
      await this.analysisPhase(job);

      // Complete job
      job.status = 'completed';
      job.completedAt = new Date();
      job.progress.percentage = 100;
      job.progress.stage = 'completed';
      await job.save();

      this.addJobLog(job, 'info', `Job completed successfully. Found ${job.results.found} repositories, ${job.results.highPotential} with high potential.`);

    } catch (error) {
      logger.error(`Job ${jobId} failed:`, error);
      
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();
      await job.save();

      this.addJobLog(job, 'error', `Job failed: ${job.error}`);
    } finally {
      this.runningJobs.delete(jobId);
    }
  }

  /**
   * Phase 1: Search for repositories
   */
  private async searchPhase(job: IDiscoveryJob): Promise<string[]> {
    const repositories: string[] = [];
    let page = 1;
    const perPage = 100;
    let totalFound = 0;

    job.progress.stage = 'searching';
    await job.save();

    while (repositories.length < job.settings.maxResults) {
      try {
        // Check rate limits
        const hasRateLimit = await githubApiService.checkRateLimit('search', 1);
        if (!hasRateLimit) {
          this.addJobLog(job, 'warn', 'Rate limit reached, waiting...');
          await githubApiService.waitForRateLimit('search');
        }

        // Search repositories
        const searchFilters = {
          ...job.filters,
          page,
          perPage: Math.min(perPage, job.settings.maxResults - repositories.length),
        };

        const searchResponse = await githubApiService.searchRepositories(searchFilters);
        
        if (searchResponse.items.length === 0) {
          break; // No more results
        }

        // Filter results based on job settings
        const filteredItems = searchResponse.items.filter(item => {
          if (!job.settings.includeArchived && item.archived) return false;
          if (!job.settings.includeForks && item.fork) return false;
          return true;
        });

        // Process each repository
        for (const item of filteredItems) {
          try {
            // Check if repository already exists
            let repository = await Repository.findOne({ githubId: item.id });
            
            if (!repository) {
              // Create basic repository record
              repository = await this.createBasicRepository(item);
            }

            repositories.push(repository._id);
            totalFound++;

            // Update progress
            job.progress.current = repositories.length;
            job.progress.percentage = Math.round((repositories.length / job.settings.maxResults) * 30); // 30% for search phase
            
            if (repositories.length % 10 === 0) {
              await job.save();
            }

          } catch (error) {
            this.addJobLog(job, 'warn', `Failed to process ${item.full_name}: ${error}`);
          }
        }

        page++;
        
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        this.addJobLog(job, 'error', `Search failed on page ${page}: ${error}`);
        break;
      }
    }

    job.results.found = totalFound;
    job.results.repositories = repositories;
    await job.save();

    this.addJobLog(job, 'info', `Search phase completed. Found ${totalFound} repositories.`);
    return repositories;
  }

  /**
   * Phase 2: Collect detailed data
   */
  private async collectionPhase(job: IDiscoveryJob, repositoryIds: string[]): Promise<void> {
    job.progress.stage = 'collecting';
    job.progress.total = repositoryIds.length;
    await job.save();

    this.addJobLog(job, 'info', `Starting data collection for ${repositoryIds.length} repositories`);

    // Process repositories in batches
    for (let i = 0; i < repositoryIds.length; i += this.BATCH_SIZE) {
      const batch = repositoryIds.slice(i, i + this.BATCH_SIZE);
      
      await Promise.allSettled(
        batch.map(async (repoId) => {
          try {
            await this.collectRepositoryData(repoId, job.settings.analysisDepth);
            
            job.progress.current = i + batch.indexOf(repoId) + 1;
            job.progress.percentage = 30 + Math.round((job.progress.current / job.progress.total) * 50); // 50% for collection phase
            
          } catch (error) {
            this.addJobLog(job, 'warn', `Failed to collect data for repository ${repoId}: ${error}`);
          }
        })
      );

      // Update progress
      await job.save();
      
      // Delay between batches to respect rate limits
      if (i + this.BATCH_SIZE < repositoryIds.length) {
        await new Promise(resolve => setTimeout(resolve, this.DELAY_BETWEEN_BATCHES));
      }
    }

    this.addJobLog(job, 'info', 'Data collection phase completed');
  }

  /**
   * Phase 3: Analysis and scoring
   */
  private async analysisPhase(job: IDiscoveryJob): Promise<void> {
    job.progress.stage = 'analyzing';
    await job.save();

    this.addJobLog(job, 'info', 'Starting analysis phase');

    let analyzed = 0;
    let highPotential = 0;

    // Analyze repositories in batches
    for (let i = 0; i < job.results.repositories.length; i += this.BATCH_SIZE) {
      const batch = job.results.repositories.slice(i, i + this.BATCH_SIZE);
      
      const repositories = await Repository.find({ _id: { $in: batch } });
      
      for (const repository of repositories) {
        try {
          // Recalculate revival potential with collected data
          await this.analyzeRepository(repository);
          analyzed++;
          
          if (repository.revival.recommendation === 'high') {
            highPotential++;
          }
          
        } catch (error) {
          this.addJobLog(job, 'warn', `Failed to analyze repository ${repository.fullName}: ${error}`);
        }
      }

      // Update progress
      job.progress.current = analyzed;
      job.progress.percentage = 80 + Math.round((analyzed / job.results.repositories.length) * 20); // 20% for analysis phase
      await job.save();
    }

    job.results.analyzed = analyzed;
    job.results.highPotential = highPotential;
    await job.save();

    this.addJobLog(job, 'info', `Analysis completed. ${analyzed} repositories analyzed, ${highPotential} with high potential.`);
  }

  /**
   * Create basic repository record from search result
   */
  private async createBasicRepository(item: any): Promise<IRepository> {
    const repository = new Repository({
      githubId: item.id,
      fullName: item.full_name,
      name: item.name,
      description: item.description,
      url: item.html_url,
      homepage: item.homepage,
      owner: {
        login: item.owner.login,
        type: item.owner.type,
        avatar: item.owner.avatar_url,
        url: item.owner.html_url,
        githubId: item.owner.id,
      },
      metrics: {
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
      activity: {
        commitFrequency: 0,
        issueActivity: 0,
        prActivity: 0,
        contributorActivity: 0,
        lastActivity: new Date(item.pushed_at),
        activityScore: 0,
      },
      quality: {
        hasReadme: false,
        hasLicense: !!item.license,
        hasContributing: false,
        hasCodeOfConduct: false,
        hasIssueTemplate: false,
        hasPrTemplate: false,
        documentationScore: 0,
        codeQualityScore: 0,
      },
      revival: {
        potentialScore: 0,
        reasons: [],
        concerns: [],
        recommendation: 'not-recommended',
      },
      tags: [],
      isArchived: item.archived,
      isFork: item.fork,
      isPrivate: item.private,
      defaultBranch: item.default_branch,
      analyzedAt: new Date(),
      lastSyncAt: new Date(),
    });

    await repository.save();
    return repository;
  }

  /**
   * Collect detailed data for a repository
   */
  private async collectRepositoryData(repositoryId: string, depth: string): Promise<void> {
    const repository = await Repository.findById(repositoryId);
    if (!repository) return;

    const [owner, repo] = repository.fullName.split('/');

    try {
      if (depth === 'basic') {
        // Just update basic metrics
        const metrics = await githubApiService.getRepositoryMetrics(owner, repo);
        repository.metrics = { ...repository.metrics, ...metrics };
      } else if (depth === 'detailed') {
        // Get metrics and activity
        const [metrics, activity] = await Promise.allSettled([
          githubApiService.getRepositoryMetrics(owner, repo),
          githubApiService.getRepositoryActivity(owner, repo),
        ]);

        if (metrics.status === 'fulfilled') {
          repository.metrics = { ...repository.metrics, ...metrics.value };
        }
        if (activity.status === 'fulfilled') {
          repository.activity = { ...repository.activity, ...activity.value };
        }
      } else if (depth === 'comprehensive') {
        // Get all available data
        const [metrics, activity, quality] = await Promise.allSettled([
          githubApiService.getRepositoryMetrics(owner, repo),
          githubApiService.getRepositoryActivity(owner, repo),
          githubApiService.getRepositoryQuality(owner, repo),
        ]);

        if (metrics.status === 'fulfilled') {
          repository.metrics = { ...repository.metrics, ...metrics.value };
        }
        if (activity.status === 'fulfilled') {
          repository.activity = { ...repository.activity, ...activity.value };
        }
        if (quality.status === 'fulfilled') {
          repository.quality = { ...repository.quality, ...quality.value };
        }
      }

      repository.lastSyncAt = new Date();
      await repository.save();

    } catch (error) {
      logger.error(`Failed to collect data for ${repository.fullName}:`, error);
      throw error;
    }
  }

  /**
   * Analyze repository and calculate revival potential
   */
  private async analyzeRepository(repository: IRepository): Promise<void> {
    // This would be expanded with more sophisticated analysis
    // For now, use a simplified scoring algorithm
    
    let score = 0;
    const reasons: string[] = [];
    const concerns: string[] = [];

    // Star-based scoring
    if (repository.metrics.stars >= 100) {
      score += Math.min(25, repository.metrics.stars / 100);
      reasons.push(`Popular with ${repository.metrics.stars} stars`);
    }

    // Activity scoring
    if (repository.activity.activityScore > 0) {
      score += repository.activity.activityScore * 0.3;
      reasons.push('Shows recent activity');
    } else {
      concerns.push('No recent activity detected');
    }

    // Quality scoring
    score += repository.quality.documentationScore * 0.2;
    if (repository.quality.hasReadme) reasons.push('Has documentation');
    if (repository.quality.hasLicense) reasons.push('Has license');

    // Language popularity
    const popularLanguages = ['JavaScript', 'Python', 'Java', 'TypeScript', 'Go', 'Rust'];
    const primaryLanguage = Object.keys(repository.metrics.languages)[0];
    if (primaryLanguage && popularLanguages.includes(primaryLanguage)) {
      score += 10;
      reasons.push(`Written in ${primaryLanguage}`);
    }

    // Determine recommendation
    let recommendation: 'high' | 'medium' | 'low' | 'not-recommended';
    if (score >= 70) recommendation = 'high';
    else if (score >= 50) recommendation = 'medium';
    else if (score >= 30) recommendation = 'low';
    else recommendation = 'not-recommended';

    repository.revival = {
      potentialScore: Math.round(score),
      reasons,
      concerns,
      recommendation,
    };

    repository.analyzedAt = new Date();
    await repository.save();
  }

  /**
   * Add log entry to job
   */
  private async addJobLog(job: IDiscoveryJob, level: 'info' | 'warn' | 'error', message: string, data?: any): Promise<void> {
    job.logs.push({
      timestamp: new Date(),
      level,
      message,
      data,
    });

    // Keep only last 100 log entries
    if (job.logs.length > 100) {
      job.logs = job.logs.slice(-100);
    }

    logger[level](`Job ${job._id}: ${message}`, data);
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<IDiscoveryJob | null> {
    return await DiscoveryJob.findById(jobId);
  }

  /**
   * Cancel a running job
   */
  async cancelJob(jobId: string, userId: string): Promise<boolean> {
    const job = await DiscoveryJob.findOne({ _id: jobId, userId });
    if (!job) return false;

    if (job.status === 'running' || job.status === 'pending') {
      job.status = 'cancelled';
      job.completedAt = new Date();
      await job.save();
      
      this.runningJobs.delete(jobId);
      return true;
    }

    return false;
  }

  /**
   * Get user's jobs
   */
  async getUserJobs(userId: string, limit: number = 10): Promise<IDiscoveryJob[]> {
    return await DiscoveryJob.find({ userId })
      .sort({ startedAt: -1 })
      .limit(limit);
  }
}

export const dataCollectionPipeline = new DataCollectionPipeline();
