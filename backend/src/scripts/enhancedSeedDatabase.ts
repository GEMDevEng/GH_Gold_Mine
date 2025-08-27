import mongoose from 'mongoose';
import { Repository } from '../models/Repository';
import { User } from '../models/User';
import { Analysis } from '../models/Analysis';
import { connectDatabase } from '../config/database';
import { logger } from '../config/logger';

// Realistic repository data generator
const generateRealisticRepositories = () => {
  const languages = [
    { name: 'JavaScript', popularity: 85 },
    { name: 'TypeScript', popularity: 75 },
    { name: 'Python', popularity: 90 },
    { name: 'Java', popularity: 80 },
    { name: 'Go', popularity: 70 },
    { name: 'Rust', popularity: 65 },
    { name: 'C++', popularity: 75 },
    { name: 'C#', popularity: 70 },
    { name: 'PHP', popularity: 60 },
    { name: 'Ruby', popularity: 55 },
    { name: 'Swift', popularity: 65 },
    { name: 'Kotlin', popularity: 60 },
    { name: 'Dart', popularity: 50 },
    { name: 'Scala', popularity: 45 },
    { name: 'Clojure', popularity: 35 }
  ];

  const projectTypes = [
    { type: 'web-framework', topics: ['web', 'framework', 'backend'], description: 'Web application framework' },
    { type: 'ui-library', topics: ['ui', 'components', 'frontend'], description: 'User interface component library' },
    { type: 'ml-toolkit', topics: ['machine-learning', 'ai', 'data-science'], description: 'Machine learning toolkit' },
    { type: 'cli-tool', topics: ['cli', 'tool', 'productivity'], description: 'Command line utility' },
    { type: 'game-engine', topics: ['game', 'engine', 'graphics'], description: 'Game development engine' },
    { type: 'database', topics: ['database', 'storage', 'nosql'], description: 'Database management system' },
    { type: 'api-client', topics: ['api', 'client', 'sdk'], description: 'API client library' },
    { type: 'testing-framework', topics: ['testing', 'framework', 'qa'], description: 'Testing framework' },
    { type: 'mobile-app', topics: ['mobile', 'app', 'ios', 'android'], description: 'Mobile application' },
    { type: 'devops-tool', topics: ['devops', 'deployment', 'automation'], description: 'DevOps automation tool' }
  ];

  const ownerTypes = ['User', 'Organization'];
  const licenses = ['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'ISC', null];

  const repositories = [];

  for (let i = 0; i < 100; i++) {
    const language = languages[Math.floor(Math.random() * languages.length)];
    const projectType = projectTypes[Math.floor(Math.random() * projectTypes.length)];
    const ownerType = ownerTypes[Math.floor(Math.random() * ownerTypes.length)];
    const license = licenses[Math.floor(Math.random() * licenses.length)];

    // Generate realistic metrics based on project age and popularity
    const ageInMonths = Math.floor(Math.random() * 60) + 6; // 6 months to 5 years
    const popularityFactor = Math.random();
    const activityFactor = Math.max(0.1, 1 - (ageInMonths / 60)); // Newer projects tend to be more active

    const stars = Math.floor(Math.random() * 10000 * popularityFactor);
    const forks = Math.floor(stars * (0.1 + Math.random() * 0.3));
    const watchers = Math.floor(stars * (0.05 + Math.random() * 0.15));
    const openIssues = Math.floor(Math.random() * 50 * activityFactor);
    const contributorCount = Math.floor(Math.random() * 50) + 1;
    const commitCount = Math.floor((ageInMonths * 30 * activityFactor) + Math.random() * 1000);

    // Calculate revival potential based on various factors
    const abandonmentScore = calculateAbandonmentScore(ageInMonths, activityFactor);
    const communityScore = calculateCommunityScore(stars, forks, contributorCount);
    const technicalScore = calculateTechnicalScore(language.popularity, license !== null);
    const businessScore = calculateBusinessScore(projectType.type, stars);

    const revivalScore = Math.round((abandonmentScore + communityScore + technicalScore + businessScore) / 4);
    const recommendation = getRecommendation(revivalScore);

    const lastCommitDate = new Date();
    lastCommitDate.setDate(lastCommitDate.getDate() - Math.floor(Math.random() * 365 * activityFactor));

    const repo = {
      githubId: 1000000 + i,
      fullName: `${generateOwnerName(ownerType)}/${generateRepoName(projectType.type)}`,
      name: generateRepoName(projectType.type),
      description: `${projectType.description} built with ${language.name}`,
      url: `https://github.com/${generateOwnerName(ownerType)}/${generateRepoName(projectType.type)}`,
      homepage: Math.random() > 0.7 ? `https://${generateRepoName(projectType.type)}.dev` : undefined,
      owner: {
        login: generateOwnerName(ownerType),
        type: ownerType as 'User' | 'Organization',
        avatar: `https://avatars.githubusercontent.com/u/${1000 + i}?v=4`,
        url: `https://github.com/${generateOwnerName(ownerType)}`,
        githubId: 1000 + i,
      },
      metrics: {
        stars,
        forks,
        watchers,
        openIssues,
        size: Math.floor(Math.random() * 50000) + 1000,
        lastCommitDate,
        lastReleaseDate: Math.random() > 0.5 ? new Date(lastCommitDate.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000) : undefined,
        contributorCount,
        commitCount,
        branchCount: Math.floor(Math.random() * 20) + 1,
        releaseCount: Math.floor(Math.random() * 30),
        issueCount: Math.floor(Math.random() * 200),
        pullRequestCount: Math.floor(Math.random() * 150),
        languages: generateLanguageDistribution(language.name),
        license,
        topics: [...projectType.topics, language.name.toLowerCase()],
      },
      activity: {
        commitFrequency: Math.round((activityFactor * 10) * 100) / 100,
        issueActivity: Math.round((activityFactor * 5) * 100) / 100,
        prActivity: Math.round((activityFactor * 3) * 100) / 100,
        contributorActivity: Math.round((activityFactor * 2) * 100) / 100,
        lastActivity: lastCommitDate,
        activityScore: Math.round(activityFactor * 100),
      },
      quality: {
        hasReadme: Math.random() > 0.1,
        hasLicense: license !== null,
        hasContributing: Math.random() > 0.6,
        hasCodeOfConduct: Math.random() > 0.7,
        hasIssueTemplate: Math.random() > 0.5,
        hasPrTemplate: Math.random() > 0.6,
        documentationScore: Math.floor(Math.random() * 40) + 60,
        codeQualityScore: Math.floor(Math.random() * 30) + 70,
      },
      revival: {
        potentialScore: revivalScore,
        reasons: generateRevivalReasons(revivalScore, stars, activityFactor, language.name),
        concerns: generateRevivalConcerns(revivalScore, ageInMonths, openIssues),
        recommendation,
      },
      tags: generateTags(projectType.type, language.name, revivalScore),
      isArchived: Math.random() < 0.05,
      isFork: Math.random() < 0.2,
      isPrivate: false,
      defaultBranch: Math.random() > 0.8 ? 'master' : 'main',
      analyzedAt: new Date(),
      lastSyncAt: new Date(),
    };

    repositories.push(repo);
  }

  return repositories;
};

// Helper functions for realistic data generation
const calculateAbandonmentScore = (ageInMonths: number, activityFactor: number): number => {
  const baseScore = Math.max(0, 100 - (ageInMonths * 2));
  const activityBonus = activityFactor * 30;
  return Math.min(100, Math.max(0, baseScore + activityBonus));
};

const calculateCommunityScore = (stars: number, forks: number, contributorCount: number): number => {
  const starScore = Math.min(40, Math.log10(stars + 1) * 10);
  const forkScore = Math.min(30, Math.log10(forks + 1) * 8);
  const contributorScore = Math.min(30, contributorCount * 2);
  return Math.round(starScore + forkScore + contributorScore);
};

const calculateTechnicalScore = (languagePopularity: number, hasLicense: boolean): number => {
  const langScore = languagePopularity * 0.6;
  const licenseScore = hasLicense ? 20 : 0;
  const randomFactor = Math.random() * 20;
  return Math.round(langScore + licenseScore + randomFactor);
};

const calculateBusinessScore = (projectType: string, stars: number): number => {
  const typeMultipliers: Record<string, number> = {
    'web-framework': 1.2,
    'ui-library': 1.1,
    'ml-toolkit': 1.3,
    'cli-tool': 0.9,
    'game-engine': 1.0,
    'database': 1.2,
    'api-client': 1.0,
    'testing-framework': 1.1,
    'mobile-app': 1.1,
    'devops-tool': 1.0,
  };

  const baseScore = Math.min(60, Math.log10(stars + 1) * 15);
  const typeBonus = (typeMultipliers[projectType] || 1.0) * 20;
  const randomFactor = Math.random() * 20;
  
  return Math.round(baseScore + typeBonus + randomFactor);
};

const getRecommendation = (score: number): 'high' | 'medium' | 'low' | 'not-recommended' => {
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  if (score >= 40) return 'low';
  return 'not-recommended';
};

const generateOwnerName = (type: string): string => {
  const userNames = ['alexdev', 'codersmith', 'techguru', 'devmaster', 'codewizard', 'progamer', 'hackerninja', 'bytebender'];
  const orgNames = ['TechCorp', 'DevStudio', 'CodeLabs', 'InnovateTech', 'DigitalForge', 'ByteWorks', 'CloudNative', 'OpenSource'];
  
  const names = type === 'Organization' ? orgNames : userNames;
  return names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 1000);
};

const generateRepoName = (projectType: string): string => {
  const prefixes = ['awesome', 'super', 'ultra', 'mega', 'pro', 'advanced', 'modern', 'next'];
  const suffixes = ['toolkit', 'framework', 'library', 'engine', 'platform', 'suite', 'core', 'plus'];
  
  const typeNames: Record<string, string[]> = {
    'web-framework': ['express', 'fastify', 'koa', 'hapi'],
    'ui-library': ['components', 'ui', 'design', 'elements'],
    'ml-toolkit': ['ml', 'ai', 'neural', 'deep'],
    'cli-tool': ['cli', 'terminal', 'console', 'cmd'],
    'game-engine': ['game', 'engine', 'graphics', 'render'],
    'database': ['db', 'store', 'data', 'cache'],
    'api-client': ['api', 'client', 'sdk', 'wrapper'],
    'testing-framework': ['test', 'spec', 'assert', 'mock'],
    'mobile-app': ['mobile', 'app', 'native', 'cross'],
    'devops-tool': ['deploy', 'build', 'ci', 'docker'],
  };

  const prefix = Math.random() > 0.5 ? prefixes[Math.floor(Math.random() * prefixes.length)] + '-' : '';
  const baseName = typeNames[projectType]?.[Math.floor(Math.random() * typeNames[projectType].length)] || 'project';
  const suffix = Math.random() > 0.7 ? '-' + suffixes[Math.floor(Math.random() * suffixes.length)] : '';
  
  return prefix + baseName + suffix;
};

const generateLanguageDistribution = (primaryLanguage: string): Record<string, number> => {
  const distribution: Record<string, number> = {};
  const primaryPercentage = 60 + Math.random() * 30; // 60-90%
  distribution[primaryLanguage] = Math.round(primaryPercentage);

  const remainingPercentage = 100 - primaryPercentage;
  const secondaryLanguages = ['JavaScript', 'TypeScript', 'HTML', 'CSS', 'Shell', 'Dockerfile', 'YAML'];
  
  let remaining = remainingPercentage;
  for (let i = 0; i < Math.min(3, secondaryLanguages.length) && remaining > 0; i++) {
    const lang = secondaryLanguages[Math.floor(Math.random() * secondaryLanguages.length)];
    if (lang !== primaryLanguage && !distribution[lang]) {
      const percentage = Math.min(remaining, Math.random() * remaining);
      if (percentage >= 1) {
        distribution[lang] = Math.round(percentage);
        remaining -= percentage;
      }
    }
  }

  return distribution;
};

const generateRevivalReasons = (score: number, stars: number, activityFactor: number, language: string): string[] => {
  const reasons = [];
  
  if (stars > 100) reasons.push(`Popular with ${stars.toLocaleString()} stars`);
  if (activityFactor > 0.5) reasons.push('Recent development activity');
  if (score > 70) reasons.push('Strong technical foundation');
  reasons.push(`Built with ${language}`);
  if (Math.random() > 0.5) reasons.push('Clear documentation');
  if (Math.random() > 0.6) reasons.push('Active community engagement');
  if (Math.random() > 0.7) reasons.push('Modern architecture');
  
  return reasons.slice(0, Math.min(5, Math.max(2, Math.floor(score / 20))));
};

const generateRevivalConcerns = (score: number, ageInMonths: number, openIssues: number): string[] => {
  const concerns = [];
  
  if (ageInMonths > 24) concerns.push('Project is several years old');
  if (openIssues > 20) concerns.push('Many open issues need attention');
  if (score < 50) concerns.push('Limited community engagement');
  if (Math.random() > 0.7) concerns.push('Dependencies may be outdated');
  if (Math.random() > 0.8) concerns.push('Documentation could be improved');
  
  return concerns.slice(0, Math.max(0, Math.min(3, Math.floor((100 - score) / 25))));
};

const generateTags = (projectType: string, language: string, score: number): string[] => {
  const tags = [projectType, language.toLowerCase()];
  
  if (score >= 80) tags.push('high-potential');
  else if (score >= 60) tags.push('medium-potential');
  else if (score >= 40) tags.push('low-potential');
  else tags.push('revival-challenge');
  
  return tags;
};

// Generate sample users
const generateSampleUsers = () => {
  const users = [];
  
  for (let i = 0; i < 20; i++) {
    const user = {
      githubId: `github-user-${i}`,
      username: `user${i}`,
      email: `user${i}@example.com`,
      name: `Test User ${i}`,
      avatar: `https://avatars.githubusercontent.com/u/${i}?v=4`,
      isActive: true,
      subscription: {
        plan: Math.random() > 0.7 ? 'pro' : 'free',
        status: 'active',
      },
      usage: {
        apiCalls: Math.floor(Math.random() * 1000),
        analysesRun: Math.floor(Math.random() * 50),
        projectsDiscovered: Math.floor(Math.random() * 100),
        lastResetAt: new Date().toISOString(),
      },
      preferences: {
        emailNotifications: Math.random() > 0.5,
        analysisAlerts: Math.random() > 0.3,
        weeklyDigest: Math.random() > 0.6,
        theme: Math.random() > 0.5 ? 'dark' : 'light',
      },
    };
    
    users.push(user);
  }
  
  return users;
};

// Generate realistic analysis data
const generateAnalysisData = (repositories: any[]) => {
  const analyses = [];

  // Generate analysis for about 60% of repositories
  const reposToAnalyze = repositories.slice(0, Math.floor(repositories.length * 0.6));

  for (const repo of reposToAnalyze) {
    const codeQuality = {
      overallScore: Math.floor(Math.random() * 40) + 60, // 60-100
      complexity: Math.floor(Math.random() * 30) + 70,
      maintainability: Math.floor(Math.random() * 35) + 65,
      testCoverage: Math.floor(Math.random() * 60) + 40,
      documentation: Math.floor(Math.random() * 40) + 60,
      codeStyle: Math.floor(Math.random() * 30) + 70,
      dependencies: Math.floor(Math.random() * 35) + 65,
      security: Math.floor(Math.random() * 25) + 75,
    };

    const businessEvaluation = {
      overallScore: Math.floor(Math.random() * 40) + 50,
      marketDemand: Math.floor(Math.random() * 50) + 50,
      competitiveAdvantage: Math.floor(Math.random() * 40) + 40,
      monetizationPotential: Math.floor(Math.random() * 60) + 40,
      scalability: Math.floor(Math.random() * 35) + 65,
      teamCapability: Math.floor(Math.random() * 30) + 60,
      resourceRequirements: Math.floor(Math.random() * 40) + 50,
    };

    const revivalPotential = {
      score: repo.revival.potentialScore,
      recommendation: repo.revival.recommendation,
      confidence: Math.floor(Math.random() * 30) + 70,
      factors: {
        abandonment: Math.floor(Math.random() * 40) + 40,
        community: Math.floor(Math.random() * 50) + 30,
        technical: Math.floor(Math.random() * 40) + 50,
        business: Math.floor(Math.random() * 50) + 40,
        marketTiming: Math.floor(Math.random() * 60) + 40,
        competitiveAdvantage: Math.floor(Math.random() * 50) + 30,
        revivalComplexity: Math.floor(Math.random() * 40) + 40,
        communityReadiness: Math.floor(Math.random() * 50) + 40,
      },
      reasoning: [
        `${repo.metrics.languages[Object.keys(repo.metrics.languages)[0]]}% ${Object.keys(repo.metrics.languages)[0]} codebase`,
        `${repo.metrics.stars} stars indicate community interest`,
        `Last activity: ${Math.floor((Date.now() - repo.activity.lastActivity.getTime()) / (1000 * 60 * 60 * 24))} days ago`,
        repo.quality.hasLicense ? 'Has proper licensing' : 'Missing license',
        repo.quality.hasReadme ? 'Well documented' : 'Limited documentation',
      ].slice(0, Math.floor(Math.random() * 3) + 2),
    };

    const analysis = {
      repositoryId: repo._id,
      summary: `Comprehensive analysis of ${repo.fullName} reveals ${revivalPotential.recommendation} revival potential with ${revivalPotential.confidence}% confidence.`,
      codeQuality,
      businessEvaluation,
      revivalPotential,
      recommendations: generateRecommendations(codeQuality, businessEvaluation, revivalPotential),
      analyzedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Within last 30 days
      version: '2.0',
    };

    analyses.push(analysis);
  }

  return analyses;
};

const generateRecommendations = (codeQuality: any, businessEvaluation: any, revivalPotential: any): string[] => {
  const recommendations = [];

  if (codeQuality.testCoverage < 60) {
    recommendations.push('Improve test coverage to ensure code reliability');
  }

  if (codeQuality.documentation < 70) {
    recommendations.push('Enhance documentation for better developer onboarding');
  }

  if (businessEvaluation.marketDemand > 70) {
    recommendations.push('High market demand - consider prioritizing this project');
  }

  if (revivalPotential.factors.community < 50) {
    recommendations.push('Focus on community building and engagement');
  }

  if (codeQuality.dependencies < 60) {
    recommendations.push('Update dependencies to latest stable versions');
  }

  if (businessEvaluation.monetizationPotential > 60) {
    recommendations.push('Explore monetization opportunities');
  }

  if (revivalPotential.factors.technical > 70) {
    recommendations.push('Strong technical foundation - good candidate for revival');
  }

  return recommendations.slice(0, Math.min(5, Math.max(2, Math.floor(revivalPotential.score / 25))));
};

export const seedEnhancedDatabase = async () => {
  try {
    await connectDatabase();
    
    logger.info('Starting enhanced database seeding...');
    
    // Clear existing data
    await Repository.deleteMany({});
    await User.deleteMany({});
    await Analysis.deleteMany({});

    // Generate and insert repositories
    const repositories = generateRealisticRepositories();
    const insertedRepos = await Repository.insertMany(repositories);
    logger.info(`Inserted ${repositories.length} repositories`);

    // Generate and insert users
    const users = generateSampleUsers();
    await User.insertMany(users);
    logger.info(`Inserted ${users.length} users`);

    // Generate and insert analysis data
    const analyses = generateAnalysisData(insertedRepos);
    await Analysis.insertMany(analyses);
    logger.info(`Inserted ${analyses.length} analyses`);
    
    logger.info('Enhanced database seeding completed successfully');
    
  } catch (error) {
    logger.error('Enhanced database seeding failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
  }
};

// Run if called directly
if (require.main === module) {
  seedEnhancedDatabase()
    .then(() => {
      logger.info('Enhanced seeding script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Enhanced seeding script failed:', error);
      process.exit(1);
    });
}
