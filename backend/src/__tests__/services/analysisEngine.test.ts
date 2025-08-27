import { AnalysisEngine } from '../../services/analysisEngine';
import { Repository } from '../../models/Repository';

describe('AnalysisEngine', () => {
  let analysisEngine: AnalysisEngine;
  let mockRepository: any;

  beforeEach(() => {
    analysisEngine = new AnalysisEngine();
    
    // Create a mock repository for testing
    mockRepository = {
      _id: 'test-repo-id',
      githubId: 123456789,
      fullName: 'test-owner/test-repo',
      name: 'test-repo',
      description: 'A test repository for unit testing',
      url: 'https://github.com/test-owner/test-repo',
      owner: {
        login: 'test-owner',
        type: 'User',
        avatar: 'https://avatars.githubusercontent.com/u/123456?v=4',
        url: 'https://github.com/test-owner',
        githubId: 123456,
      },
      metrics: {
        stars: 1000,
        forks: 200,
        watchers: 150,
        openIssues: 25,
        size: 15000,
        lastCommitDate: new Date('2023-08-15'),
        lastReleaseDate: new Date('2023-07-20'),
        contributorCount: 15,
        commitCount: 500,
        branchCount: 5,
        releaseCount: 10,
        issueCount: 50,
        pullRequestCount: 75,
        languages: { JavaScript: 70, TypeScript: 25, CSS: 5 },
        license: 'MIT',
        topics: ['web', 'framework', 'javascript'],
      },
      activity: {
        commitFrequency: 2.5,
        issueActivity: 1.2,
        prActivity: 0.8,
        contributorActivity: 0.6,
        lastActivity: new Date('2023-08-15'),
        activityScore: 75,
      },
      quality: {
        hasReadme: true,
        hasLicense: true,
        hasContributing: true,
        hasCodeOfConduct: false,
        hasIssueTemplate: true,
        hasPrTemplate: true,
        documentationScore: 85,
        codeQualityScore: 78,
      },
      isArchived: false,
      isFork: false,
      isPrivate: false,
      defaultBranch: 'main',
      createdAt: new Date('2022-01-15'),
      updatedAt: new Date('2023-08-15'),
    };
  });

  describe('analyzeRepository', () => {
    it('should analyze a repository and return comprehensive analysis', async () => {
      const result = await analysisEngine.analyzeRepository(mockRepository);

      expect(result).toBeDefined();
      expect(result.repositoryId).toBe(mockRepository._id);
      expect(result.summary).toBeDefined();
      expect(result.codeQuality).toBeDefined();
      expect(result.businessEvaluation).toBeDefined();
      expect(result.revivalPotential).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.analyzedAt).toBeInstanceOf(Date);
      expect(result.version).toBe('2.0');
    });

    it('should calculate code quality metrics correctly', async () => {
      const result = await analysisEngine.analyzeRepository(mockRepository);

      expect(result.codeQuality.overallScore).toBeGreaterThan(0);
      expect(result.codeQuality.overallScore).toBeLessThanOrEqual(100);
      expect(result.codeQuality.complexity).toBeGreaterThan(0);
      expect(result.codeQuality.maintainability).toBeGreaterThan(0);
      expect(result.codeQuality.testCoverage).toBeGreaterThanOrEqual(0);
      expect(result.codeQuality.documentation).toBeGreaterThan(0);
      expect(result.codeQuality.codeStyle).toBeGreaterThan(0);
      expect(result.codeQuality.dependencies).toBeGreaterThan(0);
      expect(result.codeQuality.security).toBeGreaterThan(0);
    });

    it('should calculate business evaluation metrics correctly', async () => {
      const result = await analysisEngine.analyzeRepository(mockRepository);

      expect(result.businessEvaluation.overallScore).toBeGreaterThan(0);
      expect(result.businessEvaluation.overallScore).toBeLessThanOrEqual(100);
      expect(result.businessEvaluation.marketDemand).toBeGreaterThanOrEqual(0);
      expect(result.businessEvaluation.competitiveAdvantage).toBeGreaterThanOrEqual(0);
      expect(result.businessEvaluation.monetizationPotential).toBeGreaterThanOrEqual(0);
      expect(result.businessEvaluation.scalability).toBeGreaterThanOrEqual(0);
      expect(result.businessEvaluation.teamCapability).toBeGreaterThanOrEqual(0);
      expect(result.businessEvaluation.resourceRequirements).toBeGreaterThanOrEqual(0);
    });

    it('should calculate revival potential correctly', async () => {
      const result = await analysisEngine.analyzeRepository(mockRepository);

      expect(result.revivalPotential.score).toBeGreaterThan(0);
      expect(result.revivalPotential.score).toBeLessThanOrEqual(100);
      expect(result.revivalPotential.confidence).toBeGreaterThan(0);
      expect(result.revivalPotential.confidence).toBeLessThanOrEqual(100);
      expect(['high', 'medium', 'low', 'not-recommended']).toContain(result.revivalPotential.recommendation);
      expect(result.revivalPotential.factors).toBeDefined();
      expect(result.revivalPotential.reasoning).toBeInstanceOf(Array);
    });

    it('should generate appropriate recommendations', async () => {
      const result = await analysisEngine.analyzeRepository(mockRepository);

      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);
      result.recommendations.forEach(recommendation => {
        expect(typeof recommendation).toBe('string');
        expect(recommendation.length).toBeGreaterThan(0);
      });
    });

    it('should handle repositories with missing data gracefully', async () => {
      const incompleteRepo = {
        ...mockRepository,
        metrics: {
          ...mockRepository.metrics,
          lastReleaseDate: undefined,
          license: null,
        },
        quality: {
          ...mockRepository.quality,
          hasCodeOfConduct: false,
          hasIssueTemplate: false,
        },
      };

      const result = await analysisEngine.analyzeRepository(incompleteRepo);

      expect(result).toBeDefined();
      expect(result.codeQuality.overallScore).toBeGreaterThan(0);
      expect(result.businessEvaluation.overallScore).toBeGreaterThan(0);
      expect(result.revivalPotential.score).toBeGreaterThan(0);
    });
  });

  describe('calculateRevivalScore', () => {
    it('should calculate revival score based on multiple factors', () => {
      const factors = {
        abandonment: 80,
        community: 70,
        technical: 85,
        business: 75,
        marketTiming: 60,
        competitiveAdvantage: 65,
        revivalComplexity: 70,
        communityReadiness: 80,
      };

      const score = analysisEngine.calculateRevivalScore(factors);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(typeof score).toBe('number');
    });

    it('should handle edge cases in factor calculation', () => {
      const minFactors = {
        abandonment: 0,
        community: 0,
        technical: 0,
        business: 0,
        marketTiming: 0,
        competitiveAdvantage: 0,
        revivalComplexity: 0,
        communityReadiness: 0,
      };

      const maxFactors = {
        abandonment: 100,
        community: 100,
        technical: 100,
        business: 100,
        marketTiming: 100,
        competitiveAdvantage: 100,
        revivalComplexity: 100,
        communityReadiness: 100,
      };

      const minScore = analysisEngine.calculateRevivalScore(minFactors);
      const maxScore = analysisEngine.calculateRevivalScore(maxFactors);

      expect(minScore).toBeGreaterThanOrEqual(0);
      expect(maxScore).toBeLessThanOrEqual(100);
      expect(maxScore).toBeGreaterThan(minScore);
    });
  });

  describe('generateRecommendation', () => {
    it('should return appropriate recommendation based on score', () => {
      expect(analysisEngine.generateRecommendation(90)).toBe('high');
      expect(analysisEngine.generateRecommendation(75)).toBe('medium');
      expect(analysisEngine.generateRecommendation(45)).toBe('low');
      expect(analysisEngine.generateRecommendation(25)).toBe('not-recommended');
    });

    it('should handle edge cases', () => {
      expect(analysisEngine.generateRecommendation(0)).toBe('not-recommended');
      expect(analysisEngine.generateRecommendation(100)).toBe('high');
      expect(analysisEngine.generateRecommendation(80)).toBe('high');
      expect(analysisEngine.generateRecommendation(60)).toBe('medium');
      expect(analysisEngine.generateRecommendation(40)).toBe('low');
    });
  });

  describe('error handling', () => {
    it('should handle null repository gracefully', async () => {
      await expect(analysisEngine.analyzeRepository(null as any)).rejects.toThrow();
    });

    it('should handle repository with missing required fields', async () => {
      const invalidRepo = {
        _id: 'test-id',
        // Missing required fields
      };

      await expect(analysisEngine.analyzeRepository(invalidRepo as any)).rejects.toThrow();
    });
  });
});
