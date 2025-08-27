import { connectDatabase } from '../config/database';
import { logger } from '../config/logger';
import { analysisEngine } from '../services/analysisEngine';
import { Repository } from '../models/Repository';

/**
 * Test script to verify the enhanced analysis engine
 */
async function testEnhancedAnalysis() {
  try {
    logger.info('Starting enhanced analysis engine test...');
    
    // Connect to database
    await connectDatabase();
    
    // Test repositories with different characteristics
    const testCases = [
      {
        owner: 'microsoft',
        repo: 'vscode',
        description: 'Large, well-maintained TypeScript project'
      },
      {
        owner: 'facebook',
        repo: 'react',
        description: 'Popular JavaScript library with extensive testing'
      },
      {
        owner: 'rust-lang',
        repo: 'rust',
        description: 'Complex systems programming language implementation'
      },
      {
        owner: 'python',
        repo: 'cpython',
        description: 'Python language implementation'
      },
      {
        owner: 'nodejs',
        repo: 'node',
        description: 'Node.js runtime with C++ and JavaScript'
      }
    ];
    
    for (const testCase of testCases) {
      try {
        logger.info(`\n=== Testing ${testCase.owner}/${testCase.repo} ===`);
        logger.info(`Description: ${testCase.description}`);
        
        // Run the enhanced analysis
        const analysis = await analysisEngine.analyzeRepository(testCase.owner, testCase.repo);
        
        // Display comprehensive results
        logger.info('\n--- Analysis Results ---');
        logger.info(`Overall Revival Score: ${analysis.revivalPotential.score}/100`);
        logger.info(`Recommendation: ${analysis.revivalPotential.recommendation.toUpperCase()}`);
        logger.info(`Confidence: ${analysis.revivalPotential.confidence}%`);
        
        // Code Quality Breakdown
        logger.info('\n--- Code Quality Metrics ---');
        logger.info(`Overall Score: ${analysis.codeQuality.overallScore}/100`);
        logger.info(`  Complexity: ${analysis.codeQuality.complexity}/100`);
        logger.info(`  Maintainability: ${analysis.codeQuality.maintainability}/100`);
        logger.info(`  Test Coverage: ${analysis.codeQuality.testCoverage}/100`);
        logger.info(`  Documentation: ${analysis.codeQuality.documentation}/100`);
        logger.info(`  Code Style: ${analysis.codeQuality.codeStyle}/100`);
        logger.info(`  Dependencies: ${analysis.codeQuality.dependencies}/100`);
        logger.info(`  Security: ${analysis.codeQuality.security}/100`);
        
        // Revival Potential Factors
        logger.info('\n--- Revival Potential Factors ---');
        logger.info(`  Abandonment: ${analysis.revivalPotential.factors.abandonment}/100`);
        logger.info(`  Community: ${analysis.revivalPotential.factors.community}/100`);
        logger.info(`  Technical: ${analysis.revivalPotential.factors.technical}/100`);
        logger.info(`  Business: ${analysis.revivalPotential.factors.business}/100`);
        
        if (analysis.revivalPotential.factors.marketTiming) {
          logger.info(`  Market Timing: ${analysis.revivalPotential.factors.marketTiming}/100`);
        }
        if (analysis.revivalPotential.factors.competitiveAdvantage) {
          logger.info(`  Competitive Advantage: ${analysis.revivalPotential.factors.competitiveAdvantage}/100`);
        }
        if (analysis.revivalPotential.factors.revivalComplexity) {
          logger.info(`  Revival Complexity: ${analysis.revivalPotential.factors.revivalComplexity}/100`);
        }
        if (analysis.revivalPotential.factors.communityReadiness) {
          logger.info(`  Community Readiness: ${analysis.revivalPotential.factors.communityReadiness}/100`);
        }
        
        // Business Evaluation
        logger.info('\n--- Business Evaluation ---');
        logger.info(`Overall Score: ${analysis.businessEvaluation.overallScore}/100`);
        logger.info(`  Market Demand: ${analysis.businessEvaluation.marketDemand}/100`);
        logger.info(`  User Engagement: ${analysis.businessEvaluation.userEngagement}/100`);
        logger.info(`  Monetization Potential: ${analysis.businessEvaluation.monetizationPotential}/100`);
        logger.info(`  Scalability: ${analysis.businessEvaluation.scalabilityScore}/100`);
        logger.info(`  Risk Assessment: ${analysis.businessEvaluation.riskAssessment}/100`);
        
        // Recommendations and Reasoning
        if (analysis.recommendations && analysis.recommendations.length > 0) {
          logger.info('\n--- Recommendations ---');
          analysis.recommendations.forEach((rec, index) => {
            logger.info(`  ${index + 1}. ${rec}`);
          });
        }
        
        if (analysis.revivalPotential.reasoning && analysis.revivalPotential.reasoning.length > 0) {
          logger.info('\n--- Reasoning ---');
          analysis.revivalPotential.reasoning.forEach((reason, index) => {
            logger.info(`  ${index + 1}. ${reason}`);
          });
        }
        
        // Dynamic Weights (if available)
        if (analysis.revivalPotential.weights) {
          logger.info('\n--- Dynamic Weights Used ---');
          Object.entries(analysis.revivalPotential.weights).forEach(([factor, weight]) => {
            logger.info(`  ${factor}: ${(weight * 100).toFixed(1)}%`);
          });
        }
        
        logger.info('\n--- Summary ---');
        logger.info(analysis.summary);
        
        // Store results in database for comparison
        const repository = await Repository.findOne({ 
          fullName: `${testCase.owner}/${testCase.repo}` 
        });
        
        if (repository) {
          repository.analysis = analysis;
          repository.lastAnalyzedAt = new Date();
          repository.revival.potentialScore = analysis.revivalPotential.score;
          repository.revival.recommendation = analysis.revivalPotential.recommendation;
          repository.quality.codeQualityScore = analysis.codeQuality.overallScore;
          repository.quality.documentationScore = analysis.codeQuality.documentation;
          await repository.save();
          logger.info(`Updated repository record in database`);
        }
        
        // Add delay between tests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        logger.error(`Failed to analyze ${testCase.owner}/${testCase.repo}:`, error);
      }
    }
    
    // Generate comparative analysis
    logger.info('\n\n=== COMPARATIVE ANALYSIS ===');
    
    const repositories = await Repository.find({
      fullName: { $in: testCases.map(tc => `${tc.owner}/${tc.repo}`) },
      'analysis.revivalPotential.score': { $exists: true }
    }).sort({ 'analysis.revivalPotential.score': -1 });
    
    logger.info('\nRepositories ranked by revival potential:');
    repositories.forEach((repo, index) => {
      const analysis = repo.analysis;
      if (analysis) {
        logger.info(`${index + 1}. ${repo.fullName}`);
        logger.info(`   Score: ${analysis.revivalPotential.score}/100 (${analysis.revivalPotential.recommendation})`);
        logger.info(`   Code Quality: ${analysis.codeQuality.overallScore}/100`);
        logger.info(`   Business Score: ${analysis.businessEvaluation.overallScore}/100`);
        logger.info(`   Confidence: ${analysis.revivalPotential.confidence}%`);
      }
    });
    
    // Calculate averages
    const scores = repositories.map(r => r.analysis?.revivalPotential.score).filter(Boolean);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    const codeQualityScores = repositories.map(r => r.analysis?.codeQuality.overallScore).filter(Boolean);
    const avgCodeQuality = codeQualityScores.reduce((a, b) => a + b, 0) / codeQualityScores.length;
    
    logger.info('\n--- Test Summary ---');
    logger.info(`Average Revival Score: ${avgScore.toFixed(1)}/100`);
    logger.info(`Average Code Quality: ${avgCodeQuality.toFixed(1)}/100`);
    logger.info(`Total Repositories Analyzed: ${repositories.length}`);
    
    logger.info('\nEnhanced analysis engine test completed successfully!');
    process.exit(0);
    
  } catch (error) {
    logger.error('Enhanced analysis engine test failed:', error);
    process.exit(1);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testEnhancedAnalysis();
}

export { testEnhancedAnalysis };
