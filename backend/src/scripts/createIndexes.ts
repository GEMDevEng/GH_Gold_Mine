import mongoose from 'mongoose';
import { Repository } from '../models/Repository';
import { User } from '../models/User';
import { Analysis } from '../models/Analysis';
import { CollectionJob } from '../models/CollectionJob';
import { connectDatabase } from '../config/database';
import { logger } from '../config/logger';

/**
 * Database indexing script for performance optimization
 * This script creates indexes on frequently queried fields
 */

const createRepositoryIndexes = async () => {
  logger.info('Creating Repository indexes...');
  
  const collection = Repository.collection;
  
  // Primary search indexes
  await collection.createIndex({ 'metrics.stars': -1 }); // Sort by stars descending
  await collection.createIndex({ 'metrics.forks': -1 }); // Sort by forks descending
  await collection.createIndex({ 'metrics.lastCommitDate': -1 }); // Sort by last commit
  await collection.createIndex({ 'createdAt': -1 }); // Sort by creation date
  await collection.createIndex({ 'updatedAt': -1 }); // Sort by update date
  
  // Language and topic searches
  await collection.createIndex({ 'metrics.languages': 1 }); // Language filtering
  await collection.createIndex({ 'metrics.topics': 1 }); // Topic filtering
  await collection.createIndex({ 'tags': 1 }); // Tag filtering
  
  // Revival potential searches
  await collection.createIndex({ 'revival.potentialScore': -1 }); // High potential repos
  await collection.createIndex({ 'revival.recommendation': 1 }); // Recommendation filtering
  
  // Owner and repository name searches
  await collection.createIndex({ 'owner.login': 1 }); // Owner search
  await collection.createIndex({ 'fullName': 1 }); // Full name search (unique)
  await collection.createIndex({ 'name': 1 }); // Repository name search
  await collection.createIndex({ 'githubId': 1 }); // GitHub ID (unique)
  
  // Status and type filters
  await collection.createIndex({ 'isArchived': 1 });
  await collection.createIndex({ 'isFork': 1 });
  await collection.createIndex({ 'isPrivate': 1 });
  
  // Quality metrics
  await collection.createIndex({ 'quality.documentationScore': -1 });
  await collection.createIndex({ 'quality.codeQualityScore': -1 });
  await collection.createIndex({ 'quality.hasReadme': 1 });
  await collection.createIndex({ 'quality.hasLicense': 1 });
  
  // Activity metrics
  await collection.createIndex({ 'activity.activityScore': -1 });
  await collection.createIndex({ 'activity.lastActivity': -1 });
  await collection.createIndex({ 'activity.commitFrequency': -1 });
  
  // Compound indexes for common query patterns
  await collection.createIndex({ 
    'metrics.stars': -1, 
    'metrics.lastCommitDate': -1 
  }); // Popular and recently updated
  
  await collection.createIndex({ 
    'revival.potentialScore': -1, 
    'metrics.stars': -1 
  }); // High potential and popular
  
  await collection.createIndex({ 
    'metrics.languages': 1, 
    'metrics.stars': -1 
  }); // Language with popularity
  
  await collection.createIndex({ 
    'isArchived': 1, 
    'isFork': 1, 
    'metrics.stars': -1 
  }); // Status filters with popularity
  
  await collection.createIndex({ 
    'owner.type': 1, 
    'metrics.stars': -1 
  }); // Owner type with popularity
  
  // Text search index for descriptions and names
  await collection.createIndex({ 
    'name': 'text', 
    'description': 'text', 
    'fullName': 'text' 
  }, { 
    weights: { 
      'name': 10, 
      'fullName': 8, 
      'description': 1 
    },
    name: 'repository_text_search'
  });
  
  // Geospatial index if we add location data in the future
  // await collection.createIndex({ 'owner.location': '2dsphere' });
  
  logger.info('Repository indexes created successfully');
};

const createUserIndexes = async () => {
  logger.info('Creating User indexes...');
  
  const collection = User.collection;
  
  // Primary identifiers
  await collection.createIndex({ 'githubId': 1 }, { unique: true });
  await collection.createIndex({ 'username': 1 }, { unique: true });
  await collection.createIndex({ 'email': 1 }, { unique: true });
  
  // Status and activity
  await collection.createIndex({ 'isActive': 1 });
  await collection.createIndex({ 'lastLoginAt': -1 });
  await collection.createIndex({ 'createdAt': -1 });
  
  // Subscription and usage
  await collection.createIndex({ 'subscription.plan': 1 });
  await collection.createIndex({ 'subscription.status': 1 });
  await collection.createIndex({ 'usage.apiCalls': -1 });
  
  // Compound indexes
  await collection.createIndex({ 
    'isActive': 1, 
    'subscription.plan': 1 
  }); // Active users by plan
  
  logger.info('User indexes created successfully');
};

const createAnalysisIndexes = async () => {
  logger.info('Creating Analysis indexes...');
  
  const collection = Analysis.collection;
  
  // Primary relationships
  await collection.createIndex({ 'repositoryId': 1 });
  await collection.createIndex({ 'analyzedAt': -1 });
  await collection.createIndex({ 'version': 1 });
  
  // Analysis scores
  await collection.createIndex({ 'codeQuality.overallScore': -1 });
  await collection.createIndex({ 'businessEvaluation.overallScore': -1 });
  await collection.createIndex({ 'revivalPotential.score': -1 });
  await collection.createIndex({ 'revivalPotential.recommendation': 1 });
  
  // Compound indexes
  await collection.createIndex({ 
    'repositoryId': 1, 
    'analyzedAt': -1 
  }); // Latest analysis for repository
  
  await collection.createIndex({ 
    'revivalPotential.score': -1, 
    'analyzedAt': -1 
  }); // Best analyses by date
  
  // Text search for summaries and recommendations
  await collection.createIndex({ 
    'summary': 'text', 
    'recommendations': 'text' 
  }, { 
    name: 'analysis_text_search'
  });
  
  logger.info('Analysis indexes created successfully');
};

const createCollectionJobIndexes = async () => {
  logger.info('Creating CollectionJob indexes...');
  
  const collection = CollectionJob.collection;
  
  // User and status
  await collection.createIndex({ 'userId': 1 });
  await collection.createIndex({ 'status': 1 });
  await collection.createIndex({ 'createdAt': -1 });
  await collection.createIndex({ 'startedAt': -1 });
  await collection.createIndex({ 'completedAt': -1 });
  
  // Progress tracking
  await collection.createIndex({ 'progress.repositoriesProcessed': -1 });
  await collection.createIndex({ 'results.discovered': -1 });
  
  // Compound indexes
  await collection.createIndex({ 
    'userId': 1, 
    'status': 1, 
    'createdAt': -1 
  }); // User jobs by status and date
  
  await collection.createIndex({ 
    'status': 1, 
    'createdAt': -1 
  }); // All jobs by status and date
  
  logger.info('CollectionJob indexes created successfully');
};

const createCustomIndexes = async () => {
  logger.info('Creating custom performance indexes...');
  
  // Additional indexes based on application usage patterns
  const repositoryCollection = Repository.collection;
  
  // High-performance search patterns
  await repositoryCollection.createIndex({ 
    'metrics.stars': -1, 
    'metrics.forks': -1, 
    'metrics.lastCommitDate': -1 
  }); // Triple sort for advanced searches
  
  await repositoryCollection.createIndex({ 
    'revival.potentialScore': -1, 
    'quality.documentationScore': -1, 
    'activity.activityScore': -1 
  }); // Quality-based searches
  
  // Range queries optimization
  await repositoryCollection.createIndex({ 
    'metrics.stars': 1, 
    'metrics.forks': 1 
  }); // Range queries on metrics
  
  await repositoryCollection.createIndex({ 
    'metrics.lastCommitDate': 1, 
    'createdAt': 1 
  }); // Date range queries
  
  logger.info('Custom indexes created successfully');
};

const analyzeIndexUsage = async () => {
  logger.info('Analyzing index usage...');
  
  try {
    // Get index stats for repositories collection
    const repoStats = await Repository.collection.indexStats();
    logger.info('Repository index stats:', repoStats);
    
    // Get index information
    const repoIndexes = await Repository.collection.indexes();
    logger.info(`Repository collection has ${repoIndexes.length} indexes`);
    
    // Log index sizes
    const repoIndexSizes = await Repository.collection.db.runCommand({
      collStats: 'repositories',
      indexDetails: true
    });
    logger.info('Repository index sizes:', repoIndexSizes.indexSizes);
    
  } catch (error) {
    logger.warn('Could not analyze index usage:', error);
  }
};

const dropUnusedIndexes = async () => {
  logger.info('Checking for unused indexes...');
  
  try {
    // This would require monitoring index usage over time
    // For now, we'll just log existing indexes
    const collections = [Repository, User, Analysis, CollectionJob];
    
    for (const model of collections) {
      const indexes = await model.collection.indexes();
      logger.info(`${model.collection.name} indexes:`, indexes.map(idx => idx.name));
    }
    
  } catch (error) {
    logger.error('Error checking indexes:', error);
  }
};

export const createAllIndexes = async () => {
  try {
    await connectDatabase();
    
    logger.info('Starting database index creation...');
    
    await createRepositoryIndexes();
    await createUserIndexes();
    await createAnalysisIndexes();
    await createCollectionJobIndexes();
    await createCustomIndexes();
    
    await analyzeIndexUsage();
    
    logger.info('All database indexes created successfully');
    
  } catch (error) {
    logger.error('Failed to create database indexes:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
  }
};

// Run if called directly
if (require.main === module) {
  createAllIndexes()
    .then(() => {
      logger.info('Index creation script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Index creation script failed:', error);
      process.exit(1);
    });
}
