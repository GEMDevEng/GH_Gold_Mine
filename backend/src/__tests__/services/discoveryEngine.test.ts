import { DiscoveryEngine } from '../../services/discoveryEngine';
import { Repository } from '../../models/Repository';

// Mock the GitHub API service
jest.mock('../../services/githubApi', () => ({
  GitHubApiService: jest.fn().mockImplementation(() => ({
    searchRepositories: jest.fn(),
    getRepositoryDetails: jest.fn(),
    getRateLimit: jest.fn().mockResolvedValue({
      remaining: 5000,
      reset: Date.now() + 3600000,
    }),
  })),
}));

describe('DiscoveryEngine', () => {
  let discoveryEngine: DiscoveryEngine;
  let mockGitHubApi: any;

  beforeEach(() => {
    discoveryEngine = new DiscoveryEngine();
    mockGitHubApi = (discoveryEngine as any).githubApi;
  });

  describe('discoverRepositories', () => {
    const mockSearchCriteria = {
      language: 'JavaScript',
      minStars: 100,
      maxStars: 10000,
      lastCommitAfter: new Date('2022-01-01'),
      lastCommitBefore: new Date('2023-12-31'),
      hasIssues: true,
      archived: false,
      fork: false,
    };

    const mockGitHubRepos = [
      {
        id: 123456789,
        full_name: 'test-owner/test-repo',
        name: 'test-repo',
        description: 'A test repository',
        html_url: 'https://github.com/test-owner/test-repo',
        homepage: 'https://test-repo.dev',
        owner: {
          login: 'test-owner',
          type: 'User',
          avatar_url: 'https://avatars.githubusercontent.com/u/123456?v=4',
          html_url: 'https://github.com/test-owner',
          id: 123456,
        },
        stargazers_count: 1000,
        forks_count: 200,
        watchers_count: 150,
        open_issues_count: 25,
        size: 15000,
        pushed_at: '2023-08-15T10:00:00Z',
        created_at: '2022-01-15T10:00:00Z',
        updated_at: '2023-08-15T10:00:00Z',
        language: 'JavaScript',
        license: { key: 'mit', name: 'MIT License' },
        topics: ['web', 'framework', 'javascript'],
        archived: false,
        fork: false,
        private: false,
        default_branch: 'main',
      },
    ];

    beforeEach(() => {
      mockGitHubApi.searchRepositories.mockResolvedValue({
        items: mockGitHubRepos,
        total_count: 1,
      });
    });

    it('should discover repositories based on search criteria', async () => {
      const result = await discoveryEngine.discoverRepositories(mockSearchCriteria);

      expect(result).toBeDefined();
      expect(result.repositories).toBeInstanceOf(Array);
      expect(result.repositories.length).toBe(1);
      expect(result.totalCount).toBe(1);
      expect(result.searchCriteria).toEqual(mockSearchCriteria);
    });

    it('should transform GitHub API response to internal format', async () => {
      const result = await discoveryEngine.discoverRepositories(mockSearchCriteria);
      const repo = result.repositories[0];

      expect(repo.githubId).toBe(123456789);
      expect(repo.fullName).toBe('test-owner/test-repo');
      expect(repo.name).toBe('test-repo');
      expect(repo.description).toBe('A test repository');
      expect(repo.url).toBe('https://github.com/test-owner/test-repo');
      expect(repo.homepage).toBe('https://test-repo.dev');
      expect(repo.owner.login).toBe('test-owner');
      expect(repo.metrics.stars).toBe(1000);
      expect(repo.metrics.forks).toBe(200);
      expect(repo.metrics.languages.JavaScript).toBeDefined();
    });

    it('should handle repositories without optional fields', async () => {
      const repoWithoutOptionalFields = {
        ...mockGitHubRepos[0],
        homepage: null,
        license: null,
        topics: [],
      };

      mockGitHubApi.searchRepositories.mockResolvedValue({
        items: [repoWithoutOptionalFields],
        total_count: 1,
      });

      const result = await discoveryEngine.discoverRepositories(mockSearchCriteria);
      const repo = result.repositories[0];

      expect(repo.homepage).toBeUndefined();
      expect(repo.metrics.license).toBeNull();
      expect(repo.metrics.topics).toEqual([]);
    });

    it('should filter out repositories that do not meet criteria', async () => {
      const reposWithMixed = [
        mockGitHubRepos[0],
        {
          ...mockGitHubRepos[0],
          id: 987654321,
          stargazers_count: 50, // Below minimum stars
        },
      ];

      mockGitHubApi.searchRepositories.mockResolvedValue({
        items: reposWithMixed,
        total_count: 2,
      });

      const result = await discoveryEngine.discoverRepositories(mockSearchCriteria);

      expect(result.repositories.length).toBe(1);
      expect(result.repositories[0].metrics.stars).toBe(1000);
    });

    it('should handle API errors gracefully', async () => {
      mockGitHubApi.searchRepositories.mockRejectedValue(new Error('API Error'));

      await expect(discoveryEngine.discoverRepositories(mockSearchCriteria)).rejects.toThrow('API Error');
    });

    it('should respect rate limits', async () => {
      mockGitHubApi.getRateLimit.mockResolvedValue({
        remaining: 0,
        reset: Date.now() + 3600000,
      });

      await expect(discoveryEngine.discoverRepositories(mockSearchCriteria)).rejects.toThrow('rate limit');
    });
  });

  describe('buildSearchQuery', () => {
    it('should build correct search query from criteria', () => {
      const criteria = {
        language: 'JavaScript',
        minStars: 100,
        maxStars: 10000,
        lastCommitAfter: new Date('2022-01-01'),
        lastCommitBefore: new Date('2023-12-31'),
        hasIssues: true,
        archived: false,
        fork: false,
      };

      const query = discoveryEngine.buildSearchQuery(criteria);

      expect(query).toContain('language:JavaScript');
      expect(query).toContain('stars:100..10000');
      expect(query).toContain('pushed:2022-01-01..2023-12-31');
      expect(query).toContain('has:issues');
      expect(query).toContain('archived:false');
      expect(query).toContain('fork:false');
    });

    it('should handle optional criteria', () => {
      const minimalCriteria = {
        language: 'Python',
      };

      const query = discoveryEngine.buildSearchQuery(minimalCriteria);

      expect(query).toContain('language:Python');
      expect(query).not.toContain('stars:');
      expect(query).not.toContain('pushed:');
    });

    it('should handle date formatting correctly', () => {
      const criteria = {
        lastCommitAfter: new Date('2023-01-15T10:30:00Z'),
        lastCommitBefore: new Date('2023-12-31T23:59:59Z'),
      };

      const query = discoveryEngine.buildSearchQuery(criteria);

      expect(query).toContain('pushed:2023-01-15..2023-12-31');
    });
  });

  describe('calculateRevivalPotential', () => {
    const mockRepo = {
      metrics: {
        stars: 1000,
        forks: 200,
        openIssues: 25,
        lastCommitDate: new Date('2023-06-15'),
        contributorCount: 15,
        languages: { JavaScript: 70, TypeScript: 30 },
        license: 'MIT',
      },
      quality: {
        hasReadme: true,
        hasLicense: true,
        documentationScore: 85,
        codeQualityScore: 78,
      },
      activity: {
        activityScore: 75,
        commitFrequency: 2.5,
      },
      createdAt: new Date('2022-01-15'),
    };

    it('should calculate revival potential score', () => {
      const result = discoveryEngine.calculateRevivalPotential(mockRepo as any);

      expect(result.potentialScore).toBeGreaterThan(0);
      expect(result.potentialScore).toBeLessThanOrEqual(100);
      expect(['high', 'medium', 'low', 'not-recommended']).toContain(result.recommendation);
      expect(result.reasons).toBeInstanceOf(Array);
      expect(result.concerns).toBeInstanceOf(Array);
    });

    it('should generate appropriate reasons for high potential', () => {
      const highPotentialRepo = {
        ...mockRepo,
        metrics: {
          ...mockRepo.metrics,
          stars: 5000,
          lastCommitDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        },
      };

      const result = discoveryEngine.calculateRevivalPotential(highPotentialRepo as any);

      expect(result.reasons.length).toBeGreaterThan(0);
      expect(result.reasons.some(reason => reason.includes('stars'))).toBe(true);
    });

    it('should generate appropriate concerns for low potential', () => {
      const lowPotentialRepo = {
        ...mockRepo,
        metrics: {
          ...mockRepo.metrics,
          stars: 10,
          openIssues: 100,
          lastCommitDate: new Date('2020-01-01'), // Very old
        },
        quality: {
          ...mockRepo.quality,
          hasReadme: false,
          hasLicense: false,
        },
      };

      const result = discoveryEngine.calculateRevivalPotential(lowPotentialRepo as any);

      expect(result.concerns.length).toBeGreaterThan(0);
      expect(result.potentialScore).toBeLessThan(50);
    });
  });

  describe('saveDiscoveredRepositories', () => {
    it('should save new repositories to database', async () => {
      const mockRepos = [
        {
          githubId: 123456789,
          fullName: 'test-owner/test-repo',
          name: 'test-repo',
          // ... other required fields
        },
      ];

      // Mock Repository.findOne to return null (new repository)
      jest.spyOn(Repository, 'findOne').mockResolvedValue(null);
      jest.spyOn(Repository.prototype, 'save').mockResolvedValue({} as any);

      const result = await discoveryEngine.saveDiscoveredRepositories(mockRepos as any);

      expect(result.saved).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(0);
    });

    it('should skip existing repositories', async () => {
      const mockRepos = [
        {
          githubId: 123456789,
          fullName: 'test-owner/test-repo',
          name: 'test-repo',
        },
      ];

      // Mock Repository.findOne to return existing repository
      jest.spyOn(Repository, 'findOne').mockResolvedValue({} as any);

      const result = await discoveryEngine.saveDiscoveredRepositories(mockRepos as any);

      expect(result.saved).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors).toBe(0);
    });

    it('should handle save errors gracefully', async () => {
      const mockRepos = [
        {
          githubId: 123456789,
          fullName: 'test-owner/test-repo',
          name: 'test-repo',
        },
      ];

      jest.spyOn(Repository, 'findOne').mockResolvedValue(null);
      jest.spyOn(Repository.prototype, 'save').mockRejectedValue(new Error('Save failed'));

      const result = await discoveryEngine.saveDiscoveredRepositories(mockRepos as any);

      expect(result.saved).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(1);
    });
  });
});
