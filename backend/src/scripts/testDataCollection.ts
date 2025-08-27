import { connectDatabase } from '../config/database';
import { logger } from '../config/logger';
import { dataCollectionPipeline } from '../services/dataCollectionPipeline';
import { Repository } from '../models/Repository';

/**
 * Test script to verify the improved data collection pipeline
 */
async function testDataCollection() {
  try {
    logger.info('Starting data collection pipeline test...');
    
    // Connect to database
    await connectDatabase();
    
    // Test with a few real repositories
    const testRepositories = [
      'microsoft/vscode',
      'facebook/react',
      'nodejs/node',
      'python/cpython',
      'rust-lang/rust'
    ];
    
    for (const repoFullName of testRepositories) {
      try {
        logger.info(`Testing data collection for ${repoFullName}`);
        
        // Check if repository already exists
        let repository = await Repository.findOne({ fullName: repoFullName });
        
        if (!repository) {
          // Create a mock search result item for testing
          const [owner, repo] = repoFullName.split('/');
          const mockItem = {
            id: Math.floor(Math.random() * 1000000),
            full_name: repoFullName,
            name: repo,
            description: `Test repository: ${repoFullName}`,
            html_url: `https://github.com/${repoFullName}`,
            homepage: null,
            owner: {
              login: owner,
              type: 'Organization',
              avatar_url: `https://avatars.githubusercontent.com/u/${Math.floor(Math.random() * 1000)}?v=4`,
              html_url: `https://github.com/${owner}`,
              id: Math.floor(Math.random() * 1000),
            },
            stargazers_count: Math.floor(Math.random() * 50000) + 1000,
            forks_count: Math.floor(Math.random() * 5000) + 100,
            watchers_count: Math.floor(Math.random() * 1000) + 50,
            open_issues_count: Math.floor(Math.random() * 500),
            size: Math.floor(Math.random() * 100000) + 1000,
            pushed_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date(Date.now() - Math.random() * 3 * 365 * 24 * 60 * 60 * 1000).toISOString(),
            language: ['JavaScript', 'TypeScript', 'Python', 'Go', 'Rust'][Math.floor(Math.random() * 5)],
            license: {
              key: 'mit',
              name: 'MIT License',
              spdx_id: 'MIT'
            },
            topics: ['test', 'example', 'demo'],
            archived: false,
            fork: false,
            private: false,
            default_branch: 'main'
          };
          
          // Create repository using the improved pipeline
          repository = await (dataCollectionPipeline as any).createBasicRepository(mockItem);
          logger.info(`Created repository record for ${repoFullName}`);
        }
        
        // Test different collection depths
        const depths = ['basic', 'detailed', 'comprehensive'];
        
        for (const depth of depths) {
          try {
            logger.info(`Testing ${depth} data collection for ${repoFullName}`);
            
            // Test the improved collectRepositoryData method
            await (dataCollectionPipeline as any).collectRepositoryData(repository._id, depth);
            
            // Reload repository to see updated data
            const updatedRepo = await Repository.findById(repository._id);
            if (updatedRepo) {
              logger.info(`${depth} collection completed for ${repoFullName}:`);
              logger.info(`  - Revival Score: ${updatedRepo.revival.potentialScore}`);
              logger.info(`  - Activity Score: ${updatedRepo.activity.activityScore}`);
              logger.info(`  - Documentation Score: ${updatedRepo.quality.documentationScore}`);
              logger.info(`  - Code Quality Score: ${updatedRepo.quality.codeQualityScore}`);
              logger.info(`  - Recommendation: ${updatedRepo.revival.recommendation}`);
              logger.info(`  - Reasons: ${updatedRepo.revival.reasons.join(', ')}`);
              if (updatedRepo.revival.concerns.length > 0) {
                logger.info(`  - Concerns: ${updatedRepo.revival.concerns.join(', ')}`);
              }
            }
            
            // Add delay between depth tests
            await new Promise(resolve => setTimeout(resolve, 2000));
            
          } catch (error) {
            logger.error(`Failed ${depth} collection for ${repoFullName}:`, error);
          }
        }
        
        // Add delay between repositories
        await new Promise(resolve => setTimeout(resolve, 5000));
        
      } catch (error) {
        logger.error(`Failed to test ${repoFullName}:`, error);
      }
    }
    
    // Generate summary statistics
    const stats = await Repository.aggregate([
      {
        $group: {
          _id: '$revival.recommendation',
          count: { $sum: 1 },
          avgScore: { $avg: '$revival.potentialScore' },
          avgActivityScore: { $avg: '$activity.activityScore' },
          avgDocScore: { $avg: '$quality.documentationScore' },
          avgCodeQualityScore: { $avg: '$quality.codeQualityScore' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    logger.info('Data Collection Pipeline Test Summary:');
    logger.info('=====================================');
    stats.forEach(stat => {
      logger.info(`${stat._id.toUpperCase()}:`);
      logger.info(`  Count: ${stat.count}`);
      logger.info(`  Avg Revival Score: ${Math.round(stat.avgScore)}`);
      logger.info(`  Avg Activity Score: ${Math.round(stat.avgActivityScore)}`);
      logger.info(`  Avg Documentation Score: ${Math.round(stat.avgDocScore)}`);
      logger.info(`  Avg Code Quality Score: ${Math.round(stat.avgCodeQualityScore)}`);
      logger.info('');
    });
    
    const totalRepos = await Repository.countDocuments();
    logger.info(`Total repositories in database: ${totalRepos}`);
    
    logger.info('Data collection pipeline test completed successfully!');
    process.exit(0);
    
  } catch (error) {
    logger.error('Data collection pipeline test failed:', error);
    process.exit(1);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testDataCollection();
}

export { testDataCollection };
