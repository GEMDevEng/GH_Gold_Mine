import mongoose from 'mongoose';
import { Repository } from '../models/Repository';
import { connectDatabase } from '../config/database';
import { logger } from '../config/logger';

const sampleRepositories = [
  {
    githubId: 123456789,
    fullName: 'awesome-dev/ml-toolkit',
    name: 'ml-toolkit',
    description: 'A comprehensive machine learning toolkit for Python developers',
    url: 'https://github.com/awesome-dev/ml-toolkit',
    homepage: 'https://ml-toolkit.dev',
    owner: {
      login: 'awesome-dev',
      type: 'User' as const,
      avatar: 'https://avatars.githubusercontent.com/u/123456?v=4',
      url: 'https://github.com/awesome-dev',
      githubId: 123456,
    },
    metrics: {
      stars: 1247,
      forks: 234,
      watchers: 89,
      openIssues: 23,
      size: 15420,
      lastCommitDate: new Date('2023-08-15'),
      lastReleaseDate: new Date('2023-07-20'),
      contributorCount: 15,
      commitCount: 456,
      branchCount: 8,
      releaseCount: 12,
      issueCount: 45,
      pullRequestCount: 67,
      languages: { Python: 85, JavaScript: 10, Shell: 5 },
      license: 'MIT',
      topics: ['machine-learning', 'python', 'data-science', 'ai'],
    },
    activity: {
      commitFrequency: 2.5,
      issueActivity: 1.2,
      prActivity: 0.8,
      contributorActivity: 0.6,
      lastActivity: new Date('2023-08-15'),
      activityScore: 65,
    },
    quality: {
      hasReadme: true,
      hasLicense: true,
      hasContributing: true,
      hasCodeOfConduct: true,
      hasIssueTemplate: true,
      hasPrTemplate: true,
      documentationScore: 85,
      codeQualityScore: 78,
    },
    revival: {
      potentialScore: 92,
      reasons: [
        'Popular with 1,247 stars',
        'Well-documented project',
        'Active community engagement',
        'Modern Python codebase',
        'Clear business potential in ML space'
      ],
      concerns: [
        'Last commit 6 months ago',
        'Some open issues need attention'
      ],
      recommendation: 'high' as const,
    },
    tags: ['machine-learning', 'python', 'high-potential'],
    isArchived: false,
    isFork: false,
    isPrivate: false,
    defaultBranch: 'main',
    analyzedAt: new Date(),
    lastSyncAt: new Date(),
  },
  {
    githubId: 987654321,
    fullName: 'react-pro/dashboard-components',
    name: 'dashboard-components',
    description: 'Professional React dashboard components library',
    url: 'https://github.com/react-pro/dashboard-components',
    homepage: 'https://dashboard-components.dev',
    owner: {
      login: 'react-pro',
      type: 'Organization' as const,
      avatar: 'https://avatars.githubusercontent.com/u/987654?v=4',
      url: 'https://github.com/react-pro',
      githubId: 987654,
    },
    metrics: {
      stars: 856,
      forks: 142,
      watchers: 67,
      openIssues: 18,
      size: 8920,
      lastCommitDate: new Date('2023-09-10'),
      lastReleaseDate: new Date('2023-08-25'),
      contributorCount: 8,
      commitCount: 234,
      branchCount: 5,
      releaseCount: 8,
      issueCount: 32,
      pullRequestCount: 45,
      languages: { TypeScript: 75, JavaScript: 20, CSS: 5 },
      license: 'MIT',
      topics: ['react', 'dashboard', 'components', 'typescript'],
    },
    activity: {
      commitFrequency: 1.8,
      issueActivity: 0.9,
      prActivity: 1.2,
      contributorActivity: 0.4,
      lastActivity: new Date('2023-09-10'),
      activityScore: 58,
    },
    quality: {
      hasReadme: true,
      hasLicense: true,
      hasContributing: true,
      hasCodeOfConduct: false,
      hasIssueTemplate: true,
      hasPrTemplate: true,
      documentationScore: 78,
      codeQualityScore: 82,
    },
    revival: {
      potentialScore: 88,
      reasons: [
        'Popular React component library',
        'TypeScript implementation',
        'Good documentation',
        'Active issue discussions'
      ],
      concerns: [
        'Moderate activity level',
        'Could use more contributors'
      ],
      recommendation: 'high' as const,
    },
    tags: ['react', 'typescript', 'components'],
    isArchived: false,
    isFork: false,
    isPrivate: false,
    defaultBranch: 'main',
    analyzedAt: new Date(),
    lastSyncAt: new Date(),
  },
  {
    githubId: 456789123,
    fullName: 'blockchain-tools/analyzer',
    name: 'analyzer',
    description: 'Advanced blockchain transaction analyzer and visualizer',
    url: 'https://github.com/blockchain-tools/analyzer',
    owner: {
      login: 'blockchain-tools',
      type: 'Organization' as const,
      avatar: 'https://avatars.githubusercontent.com/u/456789?v=4',
      url: 'https://github.com/blockchain-tools',
      githubId: 456789,
    },
    metrics: {
      stars: 634,
      forks: 89,
      watchers: 45,
      openIssues: 12,
      size: 12340,
      lastCommitDate: new Date('2023-07-22'),
      lastReleaseDate: new Date('2023-06-15'),
      contributorCount: 6,
      commitCount: 189,
      branchCount: 4,
      releaseCount: 5,
      issueCount: 28,
      pullRequestCount: 34,
      languages: { Go: 80, JavaScript: 15, Shell: 5 },
      license: 'Apache-2.0',
      topics: ['blockchain', 'cryptocurrency', 'analysis', 'go'],
    },
    activity: {
      commitFrequency: 1.2,
      issueActivity: 0.6,
      prActivity: 0.4,
      contributorActivity: 0.3,
      lastActivity: new Date('2023-07-22'),
      activityScore: 42,
    },
    quality: {
      hasReadme: true,
      hasLicense: true,
      hasContributing: false,
      hasCodeOfConduct: false,
      hasIssueTemplate: false,
      hasPrTemplate: false,
      documentationScore: 65,
      codeQualityScore: 75,
    },
    revival: {
      potentialScore: 85,
      reasons: [
        'Niche blockchain market',
        'Go implementation',
        'Solid technical foundation',
        'Growing crypto interest'
      ],
      concerns: [
        'Lower activity recently',
        'Small contributor base',
        'Limited documentation'
      ],
      recommendation: 'high' as const,
    },
    tags: ['blockchain', 'go', 'analysis'],
    isArchived: false,
    isFork: false,
    isPrivate: false,
    defaultBranch: 'main',
    analyzedAt: new Date(),
    lastSyncAt: new Date(),
  },
  // Add some medium and low potential repositories for variety
  {
    githubId: 789123456,
    fullName: 'utils-lib/string-helpers',
    name: 'string-helpers',
    description: 'Simple string utility functions for JavaScript',
    url: 'https://github.com/utils-lib/string-helpers',
    owner: {
      login: 'utils-lib',
      type: 'User' as const,
      avatar: 'https://avatars.githubusercontent.com/u/789123?v=4',
      url: 'https://github.com/utils-lib',
      githubId: 789123,
    },
    metrics: {
      stars: 45,
      forks: 12,
      watchers: 8,
      openIssues: 3,
      size: 234,
      lastCommitDate: new Date('2022-12-10'),
      contributorCount: 2,
      commitCount: 23,
      branchCount: 2,
      releaseCount: 3,
      issueCount: 8,
      pullRequestCount: 5,
      languages: { JavaScript: 100 },
      license: 'MIT',
      topics: ['javascript', 'utilities', 'strings'],
    },
    activity: {
      commitFrequency: 0.2,
      issueActivity: 0.1,
      prActivity: 0.1,
      contributorActivity: 0.1,
      lastActivity: new Date('2022-12-10'),
      activityScore: 15,
    },
    quality: {
      hasReadme: true,
      hasLicense: true,
      hasContributing: false,
      hasCodeOfConduct: false,
      hasIssueTemplate: false,
      hasPrTemplate: false,
      documentationScore: 45,
      codeQualityScore: 60,
    },
    revival: {
      potentialScore: 55,
      reasons: [
        'Simple, focused utility',
        'MIT license',
        'Clean JavaScript code'
      ],
      concerns: [
        'Very low activity',
        'Small user base',
        'Limited functionality'
      ],
      recommendation: 'medium' as const,
    },
    tags: ['javascript', 'utilities'],
    isArchived: false,
    isFork: false,
    isPrivate: false,
    defaultBranch: 'master',
    analyzedAt: new Date(),
    lastSyncAt: new Date(),
  }
];

async function seedDatabase() {
  try {
    logger.info('Starting database seeding...');
    
    // Connect to database
    await connectDatabase();
    
    // Clear existing repositories
    await Repository.deleteMany({});
    logger.info('Cleared existing repositories');
    
    // Insert sample repositories
    const insertedRepos = await Repository.insertMany(sampleRepositories);
    logger.info(`Inserted ${insertedRepos.length} sample repositories`);
    
    // Log summary
    const stats = await Repository.aggregate([
      {
        $group: {
          _id: '$revival.recommendation',
          count: { $sum: 1 }
        }
      }
    ]);
    
    logger.info('Database seeding completed successfully!');
    logger.info('Repository distribution:', stats);
    
    process.exit(0);
    
  } catch (error) {
    logger.error('Database seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

export { seedDatabase };
