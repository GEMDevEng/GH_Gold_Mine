import { DataCollectionPipeline } from '../../services/dataCollectionPipeline';
import { CollectionJob } from '../../models/CollectionJob';

// Mock dependencies
jest.mock('../../services/discoveryEngine');
jest.mock('../../services/analysisEngine');
jest.mock('../../models/CollectionJob');

describe('DataCollectionPipeline', () => {
  let pipeline: DataCollectionPipeline;
  let mockDiscoveryEngine: any;
  let mockAnalysisEngine: any;

  beforeEach(() => {
    pipeline = new DataCollectionPipeline();
    mockDiscoveryEngine = (pipeline as any).discoveryEngine;
    mockAnalysisEngine = (pipeline as any).analysisEngine;

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('startCollectionJob', () => {
    const mockJobConfig = {
      name: 'Test Collection Job',
      searchCriteria: {
        language: 'JavaScript',
        minStars: 100,
        maxStars: 10000,
      },
      analysisEnabled: true,
      batchSize: 10,
      maxRepositories: 100,
    };

    const mockUser = {
      _id: 'user-123',
      username: 'testuser',
    };

    beforeEach(() => {
      // Mock CollectionJob.create
      (CollectionJob.create as jest.Mock).mockResolvedValue({
        _id: 'job-123',
        ...mockJobConfig,
        userId: mockUser._id,
        status: 'pending',
        createdAt: new Date(),
      });
    });

    it('should create and start a collection job', async () => {
      const result = await pipeline.startCollectionJob(mockJobConfig, mockUser as any);

      expect(result).toBeDefined();
      expect(result._id).toBe('job-123');
      expect(result.status).toBe('pending');
      expect(CollectionJob.create).toHaveBeenCalledWith({
        ...mockJobConfig,
        userId: mockUser._id,
        status: 'pending',
        progress: {
          repositoriesFound: 0,
          repositoriesProcessed: 0,
          repositoriesAnalyzed: 0,
          currentBatch: 0,
          totalBatches: 0,
        },
        results: {
          discovered: 0,
          analyzed: 0,
          errors: 0,
        },
        createdAt: expect.any(Date),
      });
    });

    it('should validate job configuration', async () => {
      const invalidConfig = {
        name: '', // Empty name
        searchCriteria: {},
        batchSize: -1, // Invalid batch size
      };

      await expect(pipeline.startCollectionJob(invalidConfig as any, mockUser as any))
        .rejects.toThrow('Invalid job configuration');
    });

    it('should handle job creation errors', async () => {
      (CollectionJob.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(pipeline.startCollectionJob(mockJobConfig, mockUser as any))
        .rejects.toThrow('Database error');
    });
  });

  describe('processCollectionJob', () => {
    const mockJob = {
      _id: 'job-123',
      name: 'Test Job',
      searchCriteria: {
        language: 'JavaScript',
        minStars: 100,
      },
      analysisEnabled: true,
      batchSize: 5,
      maxRepositories: 20,
      status: 'pending',
      progress: {
        repositoriesFound: 0,
        repositoriesProcessed: 0,
        repositoriesAnalyzed: 0,
        currentBatch: 0,
        totalBatches: 0,
      },
      results: {
        discovered: 0,
        analyzed: 0,
        errors: 0,
      },
      save: jest.fn().mockResolvedValue(true),
    };

    const mockDiscoveredRepos = [
      { githubId: 1, fullName: 'owner1/repo1', name: 'repo1' },
      { githubId: 2, fullName: 'owner2/repo2', name: 'repo2' },
      { githubId: 3, fullName: 'owner3/repo3', name: 'repo3' },
    ];

    beforeEach(() => {
      mockDiscoveryEngine.discoverRepositories.mockResolvedValue({
        repositories: mockDiscoveredRepos,
        totalCount: mockDiscoveredRepos.length,
      });

      mockDiscoveryEngine.saveDiscoveredRepositories.mockResolvedValue({
        saved: mockDiscoveredRepos.length,
        skipped: 0,
        errors: 0,
      });

      mockAnalysisEngine.analyzeRepository.mockResolvedValue({
        repositoryId: 'repo-id',
        summary: 'Analysis complete',
        codeQuality: { overallScore: 80 },
        businessEvaluation: { overallScore: 70 },
        revivalPotential: { score: 75 },
      });
    });

    it('should process a collection job successfully', async () => {
      await pipeline.processCollectionJob(mockJob as any);

      expect(mockJob.status).toBe('completed');
      expect(mockJob.progress.repositoriesFound).toBe(mockDiscoveredRepos.length);
      expect(mockJob.progress.repositoriesProcessed).toBe(mockDiscoveredRepos.length);
      expect(mockJob.results.discovered).toBe(mockDiscoveredRepos.length);
      expect(mockJob.save).toHaveBeenCalled();
    });

    it('should handle discovery errors gracefully', async () => {
      mockDiscoveryEngine.discoverRepositories.mockRejectedValue(new Error('Discovery failed'));

      await pipeline.processCollectionJob(mockJob as any);

      expect(mockJob.status).toBe('failed');
      expect(mockJob.error).toContain('Discovery failed');
      expect(mockJob.save).toHaveBeenCalled();
    });

    it('should process repositories in batches', async () => {
      const largeRepoList = Array.from({ length: 15 }, (_, i) => ({
        githubId: i + 1,
        fullName: `owner${i}/repo${i}`,
        name: `repo${i}`,
      }));

      mockDiscoveryEngine.discoverRepositories.mockResolvedValue({
        repositories: largeRepoList,
        totalCount: largeRepoList.length,
      });

      await pipeline.processCollectionJob(mockJob as any);

      // Should process in batches of 5 (batchSize)
      expect(mockJob.progress.totalBatches).toBe(3);
      expect(mockJob.progress.currentBatch).toBe(3);
    });

    it('should skip analysis when disabled', async () => {
      const jobWithoutAnalysis = {
        ...mockJob,
        analysisEnabled: false,
      };

      await pipeline.processCollectionJob(jobWithoutAnalysis as any);

      expect(mockAnalysisEngine.analyzeRepository).not.toHaveBeenCalled();
      expect(jobWithoutAnalysis.progress.repositoriesAnalyzed).toBe(0);
    });

    it('should handle analysis errors without failing the job', async () => {
      mockAnalysisEngine.analyzeRepository.mockRejectedValue(new Error('Analysis failed'));

      await pipeline.processCollectionJob(mockJob as any);

      expect(mockJob.status).toBe('completed');
      expect(mockJob.results.errors).toBeGreaterThan(0);
    });

    it('should respect maxRepositories limit', async () => {
      const jobWithLimit = {
        ...mockJob,
        maxRepositories: 2,
      };

      await pipeline.processCollectionJob(jobWithLimit as any);

      expect(jobWithLimit.progress.repositoriesProcessed).toBeLessThanOrEqual(2);
    });
  });

  describe('getJobStatus', () => {
    it('should return job status and progress', async () => {
      const mockJob = {
        _id: 'job-123',
        name: 'Test Job',
        status: 'running',
        progress: {
          repositoriesFound: 10,
          repositoriesProcessed: 5,
          repositoriesAnalyzed: 3,
          currentBatch: 1,
          totalBatches: 2,
        },
        results: {
          discovered: 5,
          analyzed: 3,
          errors: 0,
        },
        createdAt: new Date(),
        startedAt: new Date(),
      };

      (CollectionJob.findById as jest.Mock).mockResolvedValue(mockJob);

      const result = await pipeline.getJobStatus('job-123');

      expect(result).toEqual(mockJob);
      expect(CollectionJob.findById).toHaveBeenCalledWith('job-123');
    });

    it('should return null for non-existent job', async () => {
      (CollectionJob.findById as jest.Mock).mockResolvedValue(null);

      const result = await pipeline.getJobStatus('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('cancelJob', () => {
    it('should cancel a running job', async () => {
      const mockJob = {
        _id: 'job-123',
        status: 'running',
        save: jest.fn().mockResolvedValue(true),
      };

      (CollectionJob.findById as jest.Mock).mockResolvedValue(mockJob);

      const result = await pipeline.cancelJob('job-123');

      expect(result).toBe(true);
      expect(mockJob.status).toBe('cancelled');
      expect(mockJob.save).toHaveBeenCalled();
    });

    it('should not cancel completed jobs', async () => {
      const mockJob = {
        _id: 'job-123',
        status: 'completed',
        save: jest.fn(),
      };

      (CollectionJob.findById as jest.Mock).mockResolvedValue(mockJob);

      const result = await pipeline.cancelJob('job-123');

      expect(result).toBe(false);
      expect(mockJob.save).not.toHaveBeenCalled();
    });

    it('should return false for non-existent job', async () => {
      (CollectionJob.findById as jest.Mock).mockResolvedValue(null);

      const result = await pipeline.cancelJob('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('getUserJobs', () => {
    it('should return user jobs with pagination', async () => {
      const mockJobs = [
        { _id: 'job-1', name: 'Job 1', status: 'completed' },
        { _id: 'job-2', name: 'Job 2', status: 'running' },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockResolvedValue(mockJobs),
      };

      (CollectionJob.find as jest.Mock).mockReturnValue(mockQuery);
      (CollectionJob.countDocuments as jest.Mock).mockResolvedValue(2);

      const result = await pipeline.getUserJobs('user-123', 1, 10);

      expect(result.jobs).toEqual(mockJobs);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should handle pagination correctly', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockResolvedValue([]),
      };

      (CollectionJob.find as jest.Mock).mockReturnValue(mockQuery);
      (CollectionJob.countDocuments as jest.Mock).mockResolvedValue(25);

      const result = await pipeline.getUserJobs('user-123', 3, 10);

      expect(mockQuery.skip).toHaveBeenCalledWith(20); // (page - 1) * limit
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(result.totalPages).toBe(3);
    });
  });

  describe('validateJobConfig', () => {
    it('should validate valid job configuration', () => {
      const validConfig = {
        name: 'Valid Job',
        searchCriteria: {
          language: 'JavaScript',
          minStars: 100,
        },
        batchSize: 10,
        maxRepositories: 100,
      };

      expect(() => pipeline.validateJobConfig(validConfig)).not.toThrow();
    });

    it('should reject invalid job configuration', () => {
      const invalidConfigs = [
        { name: '', searchCriteria: {} }, // Empty name
        { name: 'Valid', searchCriteria: {}, batchSize: 0 }, // Invalid batch size
        { name: 'Valid', searchCriteria: {}, maxRepositories: -1 }, // Invalid max repos
      ];

      invalidConfigs.forEach(config => {
        expect(() => pipeline.validateJobConfig(config as any)).toThrow();
      });
    });
  });
});
