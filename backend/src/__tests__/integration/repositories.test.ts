import request from 'supertest';
import express from 'express';
import { Repository } from '../../models/Repository';
import { User } from '../../models/User';
import repositoryRoutes from '../../routes/repositories';
import { authenticate } from '../../middleware/auth';

// Mock authentication middleware for testing
jest.mock('../../middleware/auth', () => ({
  authenticate: jest.fn((req, res, next) => {
    req.user = {
      _id: 'test-user-id',
      username: 'testuser',
      email: 'test@example.com',
    };
    req.userId = 'test-user-id';
    next();
  }),
}));

describe('Repository API Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/repositories', repositoryRoutes);
  });

  beforeEach(async () => {
    // Clear test data
    await Repository.deleteMany({});
    await User.deleteMany({});

    // Create test user
    await User.create({
      githubId: 'test-github-id',
      username: 'testuser',
      email: 'test@example.com',
      name: 'Test User',
      avatar: 'https://example.com/avatar.jpg',
      isActive: true,
    });
  });

  describe('GET /api/repositories/search', () => {
    beforeEach(async () => {
      // Create test repositories
      await Repository.create([
        {
          githubId: 123456789,
          fullName: 'test-owner/javascript-repo',
          name: 'javascript-repo',
          description: 'A JavaScript repository',
          url: 'https://github.com/test-owner/javascript-repo',
          owner: {
            login: 'test-owner',
            type: 'User',
            avatar: 'https://example.com/avatar.jpg',
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
            contributorCount: 15,
            commitCount: 500,
            branchCount: 5,
            releaseCount: 10,
            issueCount: 50,
            pullRequestCount: 75,
            languages: { JavaScript: 80, TypeScript: 20 },
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
          revival: {
            potentialScore: 85,
            reasons: ['Popular repository', 'Active development'],
            concerns: ['Some open issues'],
            recommendation: 'high',
          },
          tags: ['javascript', 'high-potential'],
          isArchived: false,
          isFork: false,
          isPrivate: false,
          defaultBranch: 'main',
        },
        {
          githubId: 987654321,
          fullName: 'test-owner/python-repo',
          name: 'python-repo',
          description: 'A Python repository',
          url: 'https://github.com/test-owner/python-repo',
          owner: {
            login: 'test-owner',
            type: 'User',
            avatar: 'https://example.com/avatar.jpg',
            url: 'https://github.com/test-owner',
            githubId: 123456,
          },
          metrics: {
            stars: 500,
            forks: 100,
            watchers: 75,
            openIssues: 15,
            size: 8000,
            lastCommitDate: new Date('2023-07-20'),
            contributorCount: 8,
            commitCount: 250,
            branchCount: 3,
            releaseCount: 5,
            issueCount: 25,
            pullRequestCount: 35,
            languages: { Python: 90, Shell: 10 },
            license: 'Apache-2.0',
            topics: ['python', 'data-science'],
          },
          activity: {
            commitFrequency: 1.5,
            issueActivity: 0.8,
            prActivity: 0.5,
            contributorActivity: 0.4,
            lastActivity: new Date('2023-07-20'),
            activityScore: 60,
          },
          quality: {
            hasReadme: true,
            hasLicense: true,
            hasContributing: false,
            hasCodeOfConduct: true,
            hasIssueTemplate: false,
            hasPrTemplate: false,
            documentationScore: 70,
            codeQualityScore: 82,
          },
          revival: {
            potentialScore: 70,
            reasons: ['Good code quality', 'Clear documentation'],
            concerns: ['Lower activity', 'Fewer contributors'],
            recommendation: 'medium',
          },
          tags: ['python', 'medium-potential'],
          isArchived: false,
          isFork: false,
          isPrivate: false,
          defaultBranch: 'main',
        },
      ]);
    });

    it('should search repositories without filters', async () => {
      const response = await request(app)
        .get('/api/repositories/search')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.repositories).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
    });

    it('should filter repositories by language', async () => {
      const response = await request(app)
        .get('/api/repositories/search?language=JavaScript')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.repositories).toHaveLength(1);
      expect(response.body.data.repositories[0].fullName).toBe('test-owner/javascript-repo');
    });

    it('should filter repositories by minimum stars', async () => {
      const response = await request(app)
        .get('/api/repositories/search?minStars=800')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.repositories).toHaveLength(1);
      expect(response.body.data.repositories[0].metrics.stars).toBe(1000);
    });

    it('should filter repositories by maximum stars', async () => {
      const response = await request(app)
        .get('/api/repositories/search?maxStars=600')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.repositories).toHaveLength(1);
      expect(response.body.data.repositories[0].metrics.stars).toBe(500);
    });

    it('should handle pagination', async () => {
      const response = await request(app)
        .get('/api/repositories/search?page=1&perPage=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.repositories).toHaveLength(1);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.perPage).toBe(1);
      expect(response.body.data.pagination.totalPages).toBe(2);
    });

    it('should sort repositories by stars descending by default', async () => {
      const response = await request(app)
        .get('/api/repositories/search')
        .expect(200);

      expect(response.body.success).toBe(true);
      const repos = response.body.data.repositories;
      expect(repos[0].metrics.stars).toBeGreaterThan(repos[1].metrics.stars);
    });

    it('should handle invalid query parameters', async () => {
      const response = await request(app)
        .get('/api/repositories/search?minStars=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/repositories/high-potential', () => {
    beforeEach(async () => {
      await Repository.create({
        githubId: 123456789,
        fullName: 'test-owner/high-potential-repo',
        name: 'high-potential-repo',
        description: 'A high potential repository',
        url: 'https://github.com/test-owner/high-potential-repo',
        owner: {
          login: 'test-owner',
          type: 'User',
          avatar: 'https://example.com/avatar.jpg',
          url: 'https://github.com/test-owner',
          githubId: 123456,
        },
        metrics: {
          stars: 2000,
          forks: 400,
          watchers: 300,
          openIssues: 10,
          size: 25000,
          lastCommitDate: new Date('2023-09-01'),
          contributorCount: 25,
          commitCount: 800,
          branchCount: 8,
          releaseCount: 15,
          issueCount: 30,
          pullRequestCount: 100,
          languages: { TypeScript: 70, JavaScript: 30 },
          license: 'MIT',
          topics: ['typescript', 'framework', 'web'],
        },
        activity: {
          commitFrequency: 3.5,
          issueActivity: 2.0,
          prActivity: 1.5,
          contributorActivity: 1.0,
          lastActivity: new Date('2023-09-01'),
          activityScore: 90,
        },
        quality: {
          hasReadme: true,
          hasLicense: true,
          hasContributing: true,
          hasCodeOfConduct: true,
          hasIssueTemplate: true,
          hasPrTemplate: true,
          documentationScore: 95,
          codeQualityScore: 88,
        },
        revival: {
          potentialScore: 95,
          reasons: ['Excellent documentation', 'Very active community', 'High code quality'],
          concerns: [],
          recommendation: 'high',
        },
        tags: ['typescript', 'high-potential'],
        isArchived: false,
        isFork: false,
        isPrivate: false,
        defaultBranch: 'main',
      });
    });

    it('should return high potential repositories', async () => {
      const response = await request(app)
        .get('/api/repositories/high-potential')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.repositories).toHaveLength(1);
      expect(response.body.data.repositories[0].revival.potentialScore).toBeGreaterThanOrEqual(80);
    });

    it('should filter by minimum score', async () => {
      const response = await request(app)
        .get('/api/repositories/high-potential?minScore=90')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.repositories).toHaveLength(1);
      expect(response.body.data.repositories[0].revival.potentialScore).toBeGreaterThanOrEqual(90);
    });

    it('should return empty array when no repositories meet criteria', async () => {
      const response = await request(app)
        .get('/api/repositories/high-potential?minScore=99')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.repositories).toHaveLength(0);
    });
  });

  describe('GET /api/repositories/:id', () => {
    let testRepo: any;

    beforeEach(async () => {
      testRepo = await Repository.create({
        githubId: 123456789,
        fullName: 'test-owner/test-repo',
        name: 'test-repo',
        description: 'A test repository',
        url: 'https://github.com/test-owner/test-repo',
        owner: {
          login: 'test-owner',
          type: 'User',
          avatar: 'https://example.com/avatar.jpg',
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
          contributorCount: 15,
          commitCount: 500,
          branchCount: 5,
          releaseCount: 10,
          issueCount: 50,
          pullRequestCount: 75,
          languages: { JavaScript: 80, TypeScript: 20 },
          license: 'MIT',
          topics: ['web', 'framework'],
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
        revival: {
          potentialScore: 85,
          reasons: ['Popular repository', 'Active development'],
          concerns: ['Some open issues'],
          recommendation: 'high',
        },
        tags: ['javascript', 'high-potential'],
        isArchived: false,
        isFork: false,
        isPrivate: false,
        defaultBranch: 'main',
      });
    });

    it('should return repository by ID', async () => {
      const response = await request(app)
        .get(`/api/repositories/${testRepo._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testRepo._id.toString());
      expect(response.body.data.fullName).toBe('test-owner/test-repo');
    });

    it('should return 404 for non-existent repository', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/repositories/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Repository not found');
    });

    it('should return 400 for invalid repository ID', async () => {
      const response = await request(app)
        .get('/api/repositories/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/repositories/github/:owner/:repo', () => {
    beforeEach(async () => {
      await Repository.create({
        githubId: 123456789,
        fullName: 'test-owner/test-repo',
        name: 'test-repo',
        description: 'A test repository',
        url: 'https://github.com/test-owner/test-repo',
        owner: {
          login: 'test-owner',
          type: 'User',
          avatar: 'https://example.com/avatar.jpg',
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
          contributorCount: 15,
          commitCount: 500,
          branchCount: 5,
          releaseCount: 10,
          issueCount: 50,
          pullRequestCount: 75,
          languages: { JavaScript: 80, TypeScript: 20 },
          license: 'MIT',
          topics: ['web', 'framework'],
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
        revival: {
          potentialScore: 85,
          reasons: ['Popular repository', 'Active development'],
          concerns: ['Some open issues'],
          recommendation: 'high',
        },
        tags: ['javascript', 'high-potential'],
        isArchived: false,
        isFork: false,
        isPrivate: false,
        defaultBranch: 'main',
      });
    });

    it('should return repository by owner and name', async () => {
      const response = await request(app)
        .get('/api/repositories/github/test-owner/test-repo')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.fullName).toBe('test-owner/test-repo');
      expect(response.body.data.owner.login).toBe('test-owner');
    });

    it('should return 404 for non-existent repository', async () => {
      const response = await request(app)
        .get('/api/repositories/github/non-existent/repo')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Repository not found');
    });

    it('should validate owner and repo parameters', async () => {
      const response = await request(app)
        .get('/api/repositories/github/invalid@owner/repo')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });
});
