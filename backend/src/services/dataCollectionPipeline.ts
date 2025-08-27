
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
    logger.info(`Creating repository record for ${item.full_name}`);

    // Calculate initial scores based on available data
    const initialDocScore = this.calculateInitialDocumentationScore(item);
    const initialActivityScore = this.calculateInitialActivityScore(item);
    const initialRevivalScore = this.calculateInitialRevivalScore(item);

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
        lastReleaseDate: item.created_at ? new Date(item.created_at) : undefined,
        contributorCount: 0, // Will be updated during collection
        commitCount: 0, // Will be updated during collection
        branchCount: 1, // At least default branch
        releaseCount: 0, // Will be updated during collection
        issueCount: item.open_issues_count,
        pullRequestCount: 0, // Will be updated during collection
        languages: item.language ? { [item.language]: 100 } : {}, // Basic language info
        license: item.license?.spdx_id,
        topics: item.topics || [],
      },
      activity: {
        commitFrequency: 0, // Will be calculated during collection
        issueActivity: 0, // Will be calculated during collection
        prActivity: 0, // Will be calculated during collection
        contributorActivity: 0, // Will be calculated during collection
        lastActivity: new Date(item.pushed_at),
        activityScore: initialActivityScore,
      },
      quality: {
        hasReadme: false, // Will be checked during collection
        hasLicense: !!item.license,
        hasContributing: false, // Will be checked during collection
        hasCodeOfConduct: false, // Will be checked during collection
        hasIssueTemplate: false, // Will be checked during collection
        hasPrTemplate: false, // Will be checked during collection
        documentationScore: initialDocScore,
        codeQualityScore: 50, // Default middle score, will be updated
      },
      revival: {
        potentialScore: initialRevivalScore,
        reasons: this.generateInitialReasons(item),
        concerns: this.generateInitialConcerns(item),
        recommendation: this.getInitialRecommendation(initialRevivalScore),
      },
      tags: this.generateInitialTags(item),
      isArchived: item.archived,
      isFork: item.fork,
      isPrivate: item.private,
      defaultBranch: item.default_branch,
      analyzedAt: new Date(),
      lastSyncAt: new Date(),
    });

    await repository.save();
    logger.info(`Created repository record for ${item.full_name} with initial revival score: ${initialRevivalScore}`);
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
      logger.info(`Collecting ${depth} data for ${repository.fullName}`);

      if (depth === 'basic') {
        // Just update basic metrics
        const metrics = await githubApiService.getRepositoryMetrics(owner, repo);

        // Merge with existing metrics, preserving any existing data
        repository.metrics = {
          ...repository.metrics,
          ...metrics,
          // Ensure we don't overwrite with undefined values
          contributorCount: metrics.contributorCount || repository.metrics.contributorCount,
          commitCount: metrics.commitCount || repository.metrics.commitCount,
          branchCount: metrics.branchCount || repository.metrics.branchCount,
          releaseCount: metrics.releaseCount || repository.metrics.releaseCount,
          languages: metrics.languages || repository.metrics.languages,
        };

      } else if (depth === 'detailed') {
        // Get metrics and activity
        const [metricsResult, activityResult] = await Promise.allSettled([
          githubApiService.getRepositoryMetrics(owner, repo),
          githubApiService.getRepositoryActivity(owner, repo),
        ]);

        if (metricsResult.status === 'fulfilled') {
          repository.metrics = {
            ...repository.metrics,
            ...metricsResult.value,
            contributorCount: metricsResult.value.contributorCount || repository.metrics.contributorCount,
            commitCount: metricsResult.value.commitCount || repository.metrics.commitCount,
            branchCount: metricsResult.value.branchCount || repository.metrics.branchCount,
            releaseCount: metricsResult.value.releaseCount || repository.metrics.releaseCount,
            languages: metricsResult.value.languages || repository.metrics.languages,
          };
        }

        if (activityResult.status === 'fulfilled') {
          repository.activity = {
            ...repository.activity,
            ...activityResult.value,
          };
        }

      } else if (depth === 'comprehensive') {
        // Get all available data including quality analysis
        const [metricsResult, activityResult, qualityResult] = await Promise.allSettled([
          githubApiService.getRepositoryMetrics(owner, repo),
          githubApiService.getRepositoryActivity(owner, repo),
          githubApiService.getRepositoryQuality(owner, repo),
        ]);

        if (metricsResult.status === 'fulfilled') {
          repository.metrics = {
            ...repository.metrics,
            ...metricsResult.value,
            contributorCount: metricsResult.value.contributorCount || repository.metrics.contributorCount,
            commitCount: metricsResult.value.commitCount || repository.metrics.commitCount,
            branchCount: metricsResult.value.branchCount || repository.metrics.branchCount,
            releaseCount: metricsResult.value.releaseCount || repository.metrics.releaseCount,
            languages: metricsResult.value.languages || repository.metrics.languages,
          };
        }

        if (activityResult.status === 'fulfilled') {
          repository.activity = {
            ...repository.activity,
            ...activityResult.value,
          };
        }

        if (qualityResult.status === 'fulfilled') {
          repository.quality = {
            ...repository.quality,
            ...qualityResult.value,
          };
        }

        // For comprehensive analysis, also run the analysis engine
        try {
          logger.info(`Running comprehensive analysis for ${repository.fullName}`);
          const analysisEngine = await import('./analysisEngine');
          const analysis = await analysisEngine.analysisEngine.analyzeRepository(owner, repo);

          // Store the analysis results
          repository.analysis = analysis;
          repository.lastAnalyzedAt = new Date();

          // Update revival potential with analysis results
          if (analysis.revivalPotential) {
            repository.revival = {
              potentialScore: analysis.revivalPotential.score,
              reasons: analysis.revivalPotential.factors ? [
                `Technical Score: ${analysis.revivalPotential.factors.technical}`,
                `Business Score: ${analysis.revivalPotential.factors.business}`,
                `Community Score: ${analysis.revivalPotential.factors.community}`,
                `Abandonment Score: ${analysis.revivalPotential.factors.abandonment}`,
              ] : repository.revival.reasons,
              concerns: analysis.revivalPotential.confidence < 50 ?
                ['Low confidence in analysis due to limited data'] :
                repository.revival.concerns,
              recommendation: analysis.revivalPotential.recommendation,
            };
          }
        } catch (analysisError) {
          logger.warn(`Analysis engine failed for ${repository.fullName}:`, analysisError);
          // Continue without analysis - don't fail the entire collection
        }
      }

      repository.lastSyncAt = new Date();
      await repository.save();

      logger.info(`Successfully collected ${depth} data for ${repository.fullName}`);

    } catch (error) {
      logger.error(`Failed to collect data for ${repository.fullName}:`, error);
      throw error;
    }
  }

  /**
   * Analyze repository and calculate revival potential
   */
  private async analyzeRepository(repository: IRepository): Promise<void> {
    const [owner, repo] = repository.fullName.split('/');

    try {
      logger.info(`Running enhanced analysis for ${repository.fullName}`);

      // Use the sophisticated analysis engine
      const analysisEngine = await import('./analysisEngine');
      const analysis = await analysisEngine.analysisEngine.analyzeRepository(owner, repo);

      // Store the comprehensive analysis results
      repository.analysis = analysis;
      repository.lastAnalyzedAt = new Date();

      // Update revival potential with analysis results
      if (analysis.revivalPotential) {
        repository.revival = {
          potentialScore: analysis.revivalPotential.score,
          reasons: [
            ...analysis.recommendations || [],
            `Technical feasibility: ${analysis.revivalPotential.factors?.technical || 'N/A'}`,
            `Business potential: ${analysis.revivalPotential.factors?.business || 'N/A'}`,
            `Community interest: ${analysis.revivalPotential.factors?.community || 'N/A'}`,
          ].filter(reason => reason && !reason.includes('N/A')),
          concerns: analysis.revivalPotential.confidence < 50 ?
            ['Low confidence in analysis due to limited data', ...repository.revival.concerns] :
            repository.revival.concerns,
          recommendation: analysis.revivalPotential.recommendation,
        };
      }

      // Update quality scores from analysis
      if (analysis.codeQuality) {
        repository.quality.codeQualityScore = analysis.codeQuality.overallScore;
        repository.quality.documentationScore = analysis.codeQuality.documentation;
      }

      logger.info(`Enhanced analysis completed for ${repository.fullName} - Score: ${repository.revival.potentialScore}`);

    } catch (error) {
      logger.warn(`Enhanced analysis failed for ${repository.fullName}, falling back to basic analysis:`, error);

      // Fallback to basic analysis if the enhanced analysis fails
      await this.performBasicAnalysis(repository);
    }

    repository.analyzedAt = new Date();
    await repository.save();
  }

  /**
   * Fallback basic analysis method
   */
  private async performBasicAnalysis(repository: IRepository): Promise<void> {
    let score = 0;
    const reasons: string[] = [];
    const concerns: string[] = [];

    // Star-based scoring (0-30 points)
    if (repository.metrics.stars >= 1000) {
      score += 30;
      reasons.push(`Very popular with ${repository.metrics.stars} stars`);
    } else if (repository.metrics.stars >= 100) {
      score += 20;
      reasons.push(`Popular with ${repository.metrics.stars} stars`);
    } else if (repository.metrics.stars >= 10) {
      score += 10;
      reasons.push(`Some popularity with ${repository.metrics.stars} stars`);
    } else if (repository.metrics.stars < 5) {
      concerns.push('Limited community interest');
    }

    // Activity scoring (0-25 points)
    if (repository.activity.activityScore > 70) {
      score += 25;
      reasons.push('High recent activity');
    } else if (repository.activity.activityScore > 40) {
      score += 15;
      reasons.push('Moderate recent activity');
    } else if (repository.activity.activityScore > 10) {
      score += 5;
      reasons.push('Some recent activity');
    } else {
      concerns.push('No recent activity detected');
    }

    // Quality scoring (0-25 points)
    const qualityScore = repository.quality.documentationScore * 0.25;
    score += qualityScore;

    if (repository.quality.hasReadme) reasons.push('Has documentation');
    if (repository.quality.hasLicense) reasons.push('Has license');
    if (repository.quality.hasContributing) reasons.push('Has contribution guidelines');

    if (repository.quality.documentationScore < 30) {
      concerns.push('Limited documentation');
    }

    // Technical feasibility (0-20 points)
    const popularLanguages = ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#'];
    const languages = Object.keys(repository.metrics.languages);
    const primaryLanguage = languages[0];

    if (primaryLanguage && popularLanguages.includes(primaryLanguage)) {
      score += 15;
      reasons.push(`Written in ${primaryLanguage}`);
    }

    if (repository.metrics.size > 1000 && repository.metrics.size < 50000) {
      score += 5;
      reasons.push('Reasonable codebase size');
    } else if (repository.metrics.size > 100000) {
      concerns.push('Very large codebase may be complex to revive');
    } else if (repository.metrics.size < 100) {
      concerns.push('Very small codebase');
    }

    // Abandonment indicators (can reduce score)
    const daysSinceLastActivity = (Date.now() - repository.activity.lastActivity.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastActivity > 730) { // 2 years
      concerns.push('No activity for over 2 years');
      score -= 10;
    } else if (daysSinceLastActivity > 365) { // 1 year
      concerns.push('No activity for over 1 year');
      score -= 5;
    }

    // Determine recommendation
    let recommendation: 'high' | 'medium' | 'low' | 'not-recommended';
    if (score >= 70) recommendation = 'high';
    else if (score >= 50) recommendation = 'medium';
    else if (score >= 30) recommendation = 'low';
    else recommendation = 'not-recommended';

    repository.revival = {
      potentialScore: Math.max(0, Math.round(score)),
      reasons,
      concerns,
      recommendation,
    };
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

  /**
   * Calculate initial documentation score based on available data
   */
  private calculateInitialDocumentationScore(item: any): number {
    let score = 0;

    // Has description
    if (item.description && item.description.length > 20) score += 20;

    // Has license
    if (item.license) score += 25;

    // Has homepage
    if (item.homepage) score += 15;

    // Has topics (indicates categorization)
    if (item.topics && item.topics.length > 0) score += 20;

    // Size indicates substantial content
    if (item.size > 1000) score += 10;

    return Math.min(100, score);
  }

  /**
   * Calculate initial activity score based on available data
   */
  private calculateInitialActivityScore(item: any): number {
    const now = new Date();
    const lastPush = new Date(item.pushed_at);
    const daysSinceLastPush = (now.getTime() - lastPush.getTime()) / (1000 * 60 * 60 * 24);

    let score = 0;

    // Recent activity bonus
    if (daysSinceLastPush < 30) score += 40;
    else if (daysSinceLastPush < 90) score += 25;
    else if (daysSinceLastPush < 180) score += 15;
    else if (daysSinceLastPush < 365) score += 5;

    // Open issues indicate activity
    if (item.open_issues_count > 0) score += 15;
    if (item.open_issues_count > 10) score += 10;

    // Stars and forks indicate community engagement
    if (item.stargazers_count > 10) score += 10;
    if (item.forks_count > 5) score += 10;
    if (item.watchers_count > 5) score += 10;

    return Math.min(100, score);
  }

  /**
   * Calculate initial revival score
   */
  private calculateInitialRevivalScore(item: any): number {
    const docScore = this.calculateInitialDocumentationScore(item);
    const activityScore = this.calculateInitialActivityScore(item);

    let revivalScore = 0;

    // Documentation quality (25% weight)
    revivalScore += docScore * 0.25;

    // Activity level (25% weight)
    revivalScore += activityScore * 0.25;

    // Community interest (25% weight)
    let communityScore = 0;
    if (item.stargazers_count > 100) communityScore += 40;
    else if (item.stargazers_count > 50) communityScore += 30;
    else if (item.stargazers_count > 10) communityScore += 20;
    else if (item.stargazers_count > 1) communityScore += 10;

    if (item.forks_count > 20) communityScore += 30;
    else if (item.forks_count > 5) communityScore += 20;
    else if (item.forks_count > 1) communityScore += 10;

    if (item.watchers_count > 10) communityScore += 30;
    else if (item.watchers_count > 5) communityScore += 20;

    revivalScore += Math.min(100, communityScore) * 0.25;

    // Technical feasibility (25% weight)
    let techScore = 50; // Base score

    // Popular languages get bonus
    const popularLanguages = ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust'];
    if (item.language && popularLanguages.includes(item.language)) {
      techScore += 20;
    }

    // Reasonable size
    if (item.size > 1000 && item.size < 50000) techScore += 15;
    else if (item.size > 50000) techScore -= 10;

    // License compatibility
    if (item.license && ['MIT', 'Apache-2.0', 'BSD-3-Clause'].includes(item.license.key)) {
      techScore += 15;
    }

    revivalScore += Math.min(100, techScore) * 0.25;

    return Math.round(Math.min(100, revivalScore));
  }

  /**
   * Generate initial reasons for revival potential
   */
  private generateInitialReasons(item: any): string[] {
    const reasons: string[] = [];

    if (item.stargazers_count > 100) {
      reasons.push(`Popular project with ${item.stargazers_count} stars`);
    } else if (item.stargazers_count > 10) {
      reasons.push(`Community interest with ${item.stargazers_count} stars`);
    }

    if (item.forks_count > 10) {
      reasons.push(`Active forking with ${item.forks_count} forks`);
    }

    if (item.license) {
      reasons.push(`Open source license: ${item.license.name}`);
    }

    if (item.language) {
      reasons.push(`Written in ${item.language}`);
    }

    if (item.topics && item.topics.length > 0) {
      reasons.push(`Well-categorized with ${item.topics.length} topics`);
    }

    if (item.description && item.description.length > 50) {
      reasons.push('Has detailed description');
    }

    return reasons;
  }

  /**
   * Generate initial concerns
   */
  private generateInitialConcerns(item: any): string[] {
    const concerns: string[] = [];
    const now = new Date();
    const lastPush = new Date(item.pushed_at);
    const daysSinceLastPush = (now.getTime() - lastPush.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceLastPush > 365) {
      concerns.push(`No activity for ${Math.round(daysSinceLastPush / 365)} year(s)`);
    } else if (daysSinceLastPush > 180) {
      concerns.push(`No activity for ${Math.round(daysSinceLastPush / 30)} months`);
    }

    if (item.stargazers_count < 10) {
      concerns.push('Limited community interest');
    }

    if (item.open_issues_count > 50) {
      concerns.push(`High number of open issues (${item.open_issues_count})`);
    }

    if (!item.license) {
      concerns.push('No license specified');
    }

    if (item.archived) {
      concerns.push('Repository is archived');
    }

    if (item.size < 100) {
      concerns.push('Very small codebase');
    }

    return concerns;
  }

  /**
   * Get initial recommendation based on score
   */
  private getInitialRecommendation(score: number): 'high' | 'medium' | 'low' | 'not-recommended' {
    if (score >= 75) return 'high';
    if (score >= 55) return 'medium';
    if (score >= 35) return 'low';
    return 'not-recommended';
  }

  /**
   * Generate initial tags
   */
  private generateInitialTags(item: any): string[] {
    const tags: string[] = [];

    if (item.language) {
      tags.push(item.language.toLowerCase());
    }

    if (item.topics) {
      tags.push(...item.topics);
    }

    if (item.stargazers_count > 1000) {
      tags.push('popular');
    }

    if (item.archived) {
      tags.push('archived');
    }

    if (item.fork) {
      tags.push('fork');
    }

    const now = new Date();
    const lastPush = new Date(item.pushed_at);
    const daysSinceLastPush = (now.getTime() - lastPush.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceLastPush > 365) {
      tags.push('abandoned');
    } else if (daysSinceLastPush < 30) {
      tags.push('active');
    }

    return tags;
  }
}

export const dataCollectionPipeline = new DataCollectionPipeline();
