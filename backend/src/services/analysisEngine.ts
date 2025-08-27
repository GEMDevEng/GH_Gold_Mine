// @ts-nocheck
import { logger } from '../config/logger';
import { githubApiService } from './githubApi';
import { Repository, IRepository } from '../models/Repository';
import { 
  RepositoryAnalysis,
  CodeQualityMetrics,
  BusinessEvaluationMetrics,
  RevivalPotentialScore
} from '../types/github';

export class AnalysisEngine {
  /**
   * Perform comprehensive analysis of a repository
   */
  async analyzeRepository(owner: string, repo: string): Promise<RepositoryAnalysis> {
    try {
      logger.info(`Starting analysis for ${owner}/${repo}`);

      // Get repository data
      const repoData = await githubApiService.getRepositoryMetrics(owner, repo);
      const activity = await githubApiService.getRepositoryActivity(owner, repo);

      // Perform different types of analysis
      const codeQuality = await this.analyzeCodeQuality(owner, repo, repoData);
      const businessEvaluation = await this.evaluateBusinessPotential(repoData, activity);
      const revivalPotential = await this.calculateRevivalPotential(repoData, activity, codeQuality, businessEvaluation);

      const analysis: RepositoryAnalysis = {
        repositoryId: `${owner}/${repo}`,
        analyzedAt: new Date(),
        codeQuality,
        businessEvaluation,
        revivalPotential,
        recommendations: this.generateRecommendations(codeQuality, businessEvaluation, revivalPotential),
        summary: this.generateAnalysisSummary(codeQuality, businessEvaluation, revivalPotential)
      };

      logger.info(`Analysis completed for ${owner}/${repo} with score: ${revivalPotential.score}`);
      return analysis;

    } catch (error) {
      logger.error(`Analysis failed for ${owner}/${repo}:`, error);
      throw error;
    }
  }

  /**
   * Analyze code quality using static analysis
   */
  private async analyzeCodeQuality(owner: string, repo: string, repoData: any): Promise<CodeQualityMetrics> {
    try {
      // Get repository contents for analysis
      const contents = await githubApiService.getRepositoryContents(owner, repo);
      
      const metrics: CodeQualityMetrics = {
        complexity: this.calculateComplexity(contents),
        maintainability: this.assessMaintainability(repoData, contents),
        testCoverage: this.estimateTestCoverage(contents),
        documentation: this.evaluateDocumentation(contents),
        codeStyle: this.analyzeCodeStyle(contents),
        dependencies: this.analyzeDependencies(contents),
        security: this.assessSecurity(contents),
        overallScore: 0 // Will be calculated below
      };

      // Calculate overall code quality score (0-100)
      metrics.overallScore = this.calculateCodeQualityScore(metrics);

      return metrics;

    } catch (error) {
      logger.warn(`Code quality analysis failed for ${owner}/${repo}:`, error);
      // Return default metrics if analysis fails
      return {
        complexity: 50,
        maintainability: 50,
        testCoverage: 30,
        documentation: 40,
        codeStyle: 50,
        dependencies: 50,
        security: 60,
        overallScore: 47
      };
    }
  }

  /**
   * Evaluate business potential of the repository
   */
  private async evaluateBusinessPotential(repoData: any, activity: any): Promise<BusinessEvaluationMetrics> {
    const metrics: BusinessEvaluationMetrics = {
      marketDemand: this.assessMarketDemand(repoData),
      competitorAnalysis: this.analyzeCompetition(repoData),
      userEngagement: this.evaluateUserEngagement(repoData, activity),
      monetizationPotential: this.assessMonetizationPotential(repoData),
      scalabilityScore: this.evaluateScalability(repoData),
      riskAssessment: this.assessRisks(repoData, activity),
      overallScore: 0
    };

    metrics.overallScore = this.calculateBusinessScore(metrics);
    return metrics;
  }

  /**
   * Calculate revival potential score using sophisticated algorithm
   */
  private async calculateRevivalPotential(
    repoData: any,
    activity: any,
    codeQuality: CodeQualityMetrics,
    businessEvaluation: BusinessEvaluationMetrics
  ): Promise<RevivalPotentialScore> {

    // Core factor calculations
    const abandonmentScore = this.calculateAbandonmentScore(activity);
    const communityScore = this.calculateCommunityScore(repoData);
    const technicalScore = (codeQuality.overallScore + this.assessTechnicalFeasibility(repoData)) / 2;
    const businessScore = businessEvaluation.overallScore;

    // Additional sophisticated factors
    const marketTimingScore = this.assessMarketTiming(repoData);
    const competitiveAdvantageScore = this.assessCompetitiveAdvantage(repoData, activity);
    const revivalComplexityScore = this.assessRevivalComplexity(repoData, activity, codeQuality);
    const communityReadinessScore = this.assessCommunityReadiness(repoData, activity);

    // Calculate confidence level for weighting adjustment
    const confidence = this.calculateConfidence(repoData, activity);
    const confidenceMultiplier = Math.max(0.5, confidence / 100); // Minimum 50% weight

    // Dynamic weighting based on repository characteristics
    const weights = this.calculateDynamicWeights(repoData, activity, codeQuality);

    // Sophisticated weighted calculation with confidence adjustment
    const baseScore =
      (abandonmentScore * weights.abandonment) +
      (communityScore * weights.community) +
      (technicalScore * weights.technical) +
      (businessScore * weights.business) +
      (marketTimingScore * weights.marketTiming) +
      (competitiveAdvantageScore * weights.competitiveAdvantage) +
      (revivalComplexityScore * weights.revivalComplexity) +
      (communityReadinessScore * weights.communityReadiness);

    // Apply confidence multiplier and normalize
    const adjustedScore = Math.round(baseScore * confidenceMultiplier);
    const finalScore = Math.max(0, Math.min(100, adjustedScore));

    // Enhanced recommendation with reasoning
    const recommendation = this.getEnhancedRecommendation(finalScore, weights, confidence);

    return {
      score: finalScore,
      recommendation: recommendation.level,
      factors: {
        abandonment: abandonmentScore,
        community: communityScore,
        technical: technicalScore,
        business: businessScore,
        marketTiming: marketTimingScore,
        competitiveAdvantage: competitiveAdvantageScore,
        revivalComplexity: revivalComplexityScore,
        communityReadiness: communityReadinessScore
      },
      confidence,
      reasoning: recommendation.reasoning,
      weights
    };
  }

  /**
   * Calculate complexity score based on repository contents
   */
  private calculateComplexity(contents: any[]): number {
    let score = 70; // Base score

    const fileCount = contents.length;
    const directories = contents.filter(f => f.type === 'dir').length;

    // File count analysis
    if (fileCount < 10) score += 20; // Very simple
    else if (fileCount < 30) score += 10; // Simple
    else if (fileCount < 100) score += 0; // Moderate
    else if (fileCount < 300) score -= 10; // Complex
    else score -= 20; // Very complex

    // Directory structure analysis
    const depthIndicator = directories / Math.max(1, fileCount - directories);
    if (depthIndicator > 0.3) score -= 10; // Too many nested directories
    else if (depthIndicator > 0.1) score += 5; // Good organization

    // Language-specific complexity indicators
    const codeFiles = contents.filter(f => this.isCodeFile(f.name));
    const configFiles = contents.filter(f => this.isConfigFile(f.name));

    // Too many config files indicates complexity
    if (configFiles.length > codeFiles.length * 0.3) score -= 15;

    // Check for common complexity indicators
    const complexityIndicators = [
      'webpack.config', 'rollup.config', 'vite.config',
      'babel.config', '.babelrc',
      'tsconfig.json', 'jsconfig.json',
      'docker-compose', 'Dockerfile',
      'makefile', 'Makefile',
      'requirements.txt', 'package.json', 'Cargo.toml', 'go.mod'
    ];

    const foundIndicators = complexityIndicators.filter(indicator =>
      contents.some(f => f.name.toLowerCase().includes(indicator.toLowerCase()))
    );

    // Modern tooling can indicate either good practices or complexity
    if (foundIndicators.length > 5) score -= 10; // Too many tools
    else if (foundIndicators.length > 2) score += 5; // Good tooling

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Check if file is a code file
   */
  private isCodeFile(filename: string): boolean {
    const codeExtensions = [
      '.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte',
      '.py', '.java', '.go', '.rs', '.cpp', '.c', '.h',
      '.cs', '.php', '.rb', '.swift', '.kt', '.scala',
      '.clj', '.hs', '.elm', '.dart', '.r', '.m'
    ];
    return codeExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  }

  /**
   * Check if file is a configuration file
   */
  private isConfigFile(filename: string): boolean {
    const configPatterns = [
      'config', 'conf', '.env', '.ini', '.toml', '.yaml', '.yml',
      'package.json', 'requirements.txt', 'Cargo.toml', 'go.mod',
      'webpack', 'rollup', 'vite', 'babel', 'eslint', 'prettier',
      'tsconfig', 'jsconfig', 'docker', 'makefile'
    ];
    const lowerName = filename.toLowerCase();
    return configPatterns.some(pattern => lowerName.includes(pattern));
  }

  /**
   * Assess maintainability based on various factors
   */
  private assessMaintainability(repoData: any, contents: any[]): number {
    let score = 50; // Base score
    
    // Recent activity bonus
    const daysSinceUpdate = (Date.now() - new Date(repoData.updated_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 30) score += 20;
    else if (daysSinceUpdate < 90) score += 10;
    else if (daysSinceUpdate > 365) score -= 20;
    
    // README presence
    const hasReadme = contents.some(f => f.name.toLowerCase().includes('readme'));
    if (hasReadme) score += 15;
    
    // Package.json/requirements.txt presence
    const hasPackageFile = contents.some(f => 
      f.name === 'package.json' || 
      f.name === 'requirements.txt' || 
      f.name === 'Cargo.toml' ||
      f.name === 'go.mod'
    );
    if (hasPackageFile) score += 10;
    
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Estimate test coverage based on test files and testing infrastructure
   */
  private estimateTestCoverage(contents: any[]): number {
    let score = 0;

    // Count test files with more sophisticated patterns
    const testPatterns = [
      /test/i, /spec/i, /__tests__/i, /\.test\./i, /\.spec\./i,
      /tests\//i, /test\//i, /spec\//i, /__tests__\//i
    ];

    const testFiles = contents.filter(f =>
      testPatterns.some(pattern => pattern.test(f.name))
    );

    const codeFiles = contents.filter(f => this.isCodeFile(f.name));

    if (codeFiles.length === 0) return 0;

    // Basic test file ratio (0-40 points)
    const testRatio = testFiles.length / codeFiles.length;
    if (testRatio >= 0.5) score += 40; // Excellent test coverage
    else if (testRatio >= 0.3) score += 30; // Good test coverage
    else if (testRatio >= 0.1) score += 20; // Some test coverage
    else if (testRatio > 0) score += 10; // Minimal test coverage

    // Test infrastructure indicators (0-30 points)
    const testInfrastructure = [
      'jest.config', 'vitest.config', 'karma.conf', 'mocha.opts',
      'pytest.ini', 'tox.ini', 'phpunit.xml', 'go.mod',
      'cargo.toml', 'package.json'
    ];

    const hasTestConfig = testInfrastructure.some(config =>
      contents.some(f => f.name.toLowerCase().includes(config))
    );

    if (hasTestConfig) score += 20;

    // CI/CD configuration suggests automated testing (0-20 points)
    const ciFiles = [
      '.github/workflows', '.travis.yml', '.gitlab-ci.yml',
      'circle.yml', 'appveyor.yml', 'azure-pipelines.yml'
    ];

    const hasCIConfig = ciFiles.some(ci =>
      contents.some(f => f.name.toLowerCase().includes(ci.toLowerCase()))
    );

    if (hasCIConfig) score += 15;

    // Test directories structure (0-10 points)
    const hasTestDirectory = contents.some(f =>
      f.type === 'dir' && testPatterns.some(pattern => pattern.test(f.name))
    );

    if (hasTestDirectory) score += 10;

    return Math.min(100, score);
  }

  /**
   * Evaluate documentation quality comprehensively
   */
  private evaluateDocumentation(contents: any[]): number {
    let score = 0;

    // README file (0-30 points)
    const readmeFiles = contents.filter(f =>
      f.name.toLowerCase().includes('readme')
    );
    if (readmeFiles.length > 0) {
      score += 25; // Base README score
      // Bonus for multiple README files (different languages, etc.)
      if (readmeFiles.length > 1) score += 5;
    }

    // Documentation folder/files (0-25 points)
    const docPatterns = ['doc', 'docs', 'documentation', 'wiki'];
    const hasDocsFolder = contents.some(f =>
      f.type === 'dir' && docPatterns.some(pattern =>
        f.name.toLowerCase().includes(pattern)
      )
    );
    if (hasDocsFolder) score += 20;

    // Additional documentation files
    const docFiles = contents.filter(f =>
      docPatterns.some(pattern => f.name.toLowerCase().includes(pattern)) ||
      f.name.toLowerCase().endsWith('.md') ||
      f.name.toLowerCase().endsWith('.rst') ||
      f.name.toLowerCase().endsWith('.txt')
    );
    if (docFiles.length > 2) score += 5; // Multiple doc files

    // License file (0-15 points)
    const hasLicense = contents.some(f =>
      f.name.toLowerCase().includes('license') ||
      f.name.toLowerCase().includes('licence') ||
      f.name.toLowerCase() === 'copying'
    );
    if (hasLicense) score += 15;

    // Contributing guidelines (0-10 points)
    const hasContributing = contents.some(f =>
      f.name.toLowerCase().includes('contributing') ||
      f.name.toLowerCase().includes('contribute')
    );
    if (hasContributing) score += 10;

    // Code of conduct (0-5 points)
    const hasCodeOfConduct = contents.some(f =>
      f.name.toLowerCase().includes('code_of_conduct') ||
      f.name.toLowerCase().includes('code-of-conduct') ||
      f.name.toLowerCase().includes('conduct')
    );
    if (hasCodeOfConduct) score += 5;

    // Changelog (0-5 points)
    const hasChangelog = contents.some(f =>
      f.name.toLowerCase().includes('changelog') ||
      f.name.toLowerCase().includes('history') ||
      f.name.toLowerCase().includes('releases')
    );
    if (hasChangelog) score += 5;

    // API documentation indicators (0-10 points)
    const apiDocIndicators = [
      'api.md', 'api.rst', 'api/', 'reference/',
      'swagger', 'openapi', 'postman'
    ];
    const hasApiDocs = apiDocIndicators.some(indicator =>
      contents.some(f => f.name.toLowerCase().includes(indicator))
    );
    if (hasApiDocs) score += 10;

    return Math.min(100, score);
  }

  /**
   * Analyze code style consistency and tooling
   */
  private analyzeCodeStyle(contents: any[]): number {
    let score = 40; // Base score

    // Linting configuration files (0-30 points)
    const lintConfigs = [
      '.eslintrc', '.eslintrc.js', '.eslintrc.json', '.eslintrc.yml',
      'tslint.json', '.jshintrc',
      'pyproject.toml', '.flake8', 'setup.cfg', 'pylintrc',
      'rustfmt.toml', '.rustfmt.toml',
      'golangci.yml', '.golangci.yml',
      'checkstyle.xml', 'pmd.xml'
    ];

    const hasLintConfig = lintConfigs.some(config =>
      contents.some(f => f.name.toLowerCase() === config.toLowerCase())
    );
    if (hasLintConfig) score += 25;

    // Formatting configuration (0-20 points)
    const formatConfigs = [
      '.prettierrc', '.prettierrc.js', '.prettierrc.json',
      '.editorconfig',
      'black.toml', '.black',
      'rustfmt.toml',
      'gofmt'
    ];

    const hasFormatConfig = formatConfigs.some(config =>
      contents.some(f => f.name.toLowerCase().includes(config.toLowerCase()))
    );
    if (hasFormatConfig) score += 20;

    // Type checking configuration (0-15 points)
    const typeConfigs = [
      'tsconfig.json', 'jsconfig.json',
      'mypy.ini', '.mypy.ini',
      'pyproject.toml'
    ];

    const hasTypeConfig = typeConfigs.some(config =>
      contents.some(f => f.name.toLowerCase() === config.toLowerCase())
    );
    if (hasTypeConfig) score += 15;

    // Pre-commit hooks (0-10 points)
    const hasPreCommitConfig = contents.some(f =>
      f.name === '.pre-commit-config.yaml' ||
      f.name === '.pre-commit-config.yml' ||
      f.name.includes('husky') ||
      f.name.includes('lint-staged')
    );
    if (hasPreCommitConfig) score += 10;

    // Git ignore file (0-5 points)
    const hasGitIgnore = contents.some(f => f.name === '.gitignore');
    if (hasGitIgnore) score += 5;

    return Math.min(100, score);
  }

  /**
   * Analyze dependencies and their health
   */
  private analyzeDependencies(contents: any[]): number {
    let score = 30; // Base score

    // Package manifest files (0-20 points)
    const manifestFiles = [
      'package.json', 'requirements.txt', 'Cargo.toml', 'go.mod',
      'pom.xml', 'build.gradle', 'composer.json', 'Gemfile',
      'setup.py', 'pyproject.toml', 'Package.swift'
    ];

    const hasManifest = manifestFiles.some(manifest =>
      contents.some(f => f.name === manifest)
    );
    if (hasManifest) score += 20;

    // Package lock files (0-25 points) - good for reproducibility
    const lockFiles = [
      'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
      'Cargo.lock', 'go.sum', 'composer.lock',
      'Gemfile.lock', 'poetry.lock', 'Pipfile.lock'
    ];

    const hasLockFile = lockFiles.some(lock =>
      contents.some(f => f.name === lock)
    );
    if (hasLockFile) score += 25;

    // Dependency management tools (0-15 points)
    const depTools = [
      '.nvmrc', '.node-version', '.python-version',
      'runtime.txt', 'Dockerfile', 'docker-compose.yml',
      'renovate.json', '.dependabot/', 'dependabot.yml'
    ];

    const hasDepTools = depTools.some(tool =>
      contents.some(f => f.name.includes(tool))
    );
    if (hasDepTools) score += 15;

    // Security scanning configuration (0-10 points)
    const securityTools = [
      '.snyk', 'snyk.json', '.github/dependabot.yml',
      'audit.json', 'security.md'
    ];

    const hasSecurityTools = securityTools.some(tool =>
      contents.some(f => f.name.toLowerCase().includes(tool.toLowerCase()))
    );
    if (hasSecurityTools) score += 10;

    return Math.min(100, score);
  }

  /**
   * Assess security practices
   */
  private assessSecurity(contents: any[]): number {
    let score = 40; // Base score (assume some basic security)
    
    // Security-related files
    const hasSecurityFiles = contents.some(f => 
      f.name === 'SECURITY.md' ||
      f.name === '.github/SECURITY.md'
    );
    if (hasSecurityFiles) score += 30;
    
    // CI/CD files (often include security checks)
    const hasCIConfig = contents.some(f => 
      f.name.includes('.github/workflows') ||
      f.name === '.travis.yml' ||
      f.name === '.gitlab-ci.yml'
    );
    if (hasCIConfig) score += 30;
    
    return Math.min(100, score);
  }

  /**
   * Calculate overall code quality score
   */
  private calculateCodeQualityScore(metrics: CodeQualityMetrics): number {
    return Math.round(
      (metrics.complexity * 0.15) +
      (metrics.maintainability * 0.20) +
      (metrics.testCoverage * 0.15) +
      (metrics.documentation * 0.15) +
      (metrics.codeStyle * 0.15) +
      (metrics.dependencies * 0.10) +
      (metrics.security * 0.10)
    );
  }

  /**
   * Assess market demand for the repository's technology/domain
   */
  private assessMarketDemand(repoData: any): number {
    let score = 50; // Base score

    // Language popularity bonus
    const popularLanguages = ['javascript', 'typescript', 'python', 'java', 'go', 'rust'];
    if (popularLanguages.includes(repoData.language?.toLowerCase())) {
      score += 20;
    }

    // Stars indicate market interest
    if (repoData.stargazers_count > 1000) score += 20;
    else if (repoData.stargazers_count > 100) score += 10;
    else if (repoData.stargazers_count > 10) score += 5;

    // Forks indicate practical use
    if (repoData.forks_count > 100) score += 10;
    else if (repoData.forks_count > 10) score += 5;

    return Math.min(100, score);
  }

  /**
   * Analyze competition in the repository's domain
   */
  private analyzeCompetition(repoData: any): number {
    // Simple heuristic: fewer stars might mean less competition
    // but also less validation of the idea
    let score = 50;

    if (repoData.stargazers_count < 100) {
      score += 20; // Less competition
    } else if (repoData.stargazers_count > 10000) {
      score -= 10; // High competition
    }

    // Unique/niche topics get bonus
    const topics = repoData.topics || [];
    if (topics.length > 3) score += 10; // Well-categorized

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Evaluate user engagement metrics
   */
  private evaluateUserEngagement(repoData: any, activity: any): number {
    let score = 0;

    // Recent activity
    const daysSinceUpdate = (Date.now() - new Date(repoData.updated_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 30) score += 30;
    else if (daysSinceUpdate < 90) score += 20;
    else if (daysSinceUpdate < 365) score += 10;

    // Issues and discussions
    if (repoData.open_issues_count > 0) score += 15; // Active community
    if (repoData.open_issues_count > 10) score += 10; // Very active

    // Watchers
    if (repoData.watchers_count > 50) score += 15;
    else if (repoData.watchers_count > 10) score += 10;

    // Star-to-fork ratio (engagement quality)
    const starForkRatio = repoData.forks_count > 0 ? repoData.stargazers_count / repoData.forks_count : 0;
    if (starForkRatio > 5) score += 20; // High interest, low forking
    else if (starForkRatio > 2) score += 10;

    return Math.min(100, score);
  }

  /**
   * Assess monetization potential
   */
  private assessMonetizationPotential(repoData: any): number {
    let score = 30; // Base score

    // Business-oriented topics
    const businessTopics = ['api', 'saas', 'enterprise', 'business', 'commerce', 'payment'];
    const topics = (repoData.topics || []).map((t: string) => t.toLowerCase());
    const hasBusinessTopic = businessTopics.some(bt => topics.includes(bt));
    if (hasBusinessTopic) score += 25;

    // Developer tools often have monetization potential
    const devTopics = ['cli', 'tool', 'framework', 'library', 'sdk'];
    const hasDevTopic = devTopics.some(dt => topics.includes(dt));
    if (hasDevTopic) score += 20;

    // Size indicates potential complexity/value
    if (repoData.size > 10000) score += 15; // Substantial codebase
    else if (repoData.size > 1000) score += 10;

    // License affects monetization
    const permissiveLicenses = ['mit', 'apache', 'bsd'];
    if (repoData.license && permissiveLicenses.includes(repoData.license.key)) {
      score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * Evaluate scalability potential
   */
  private evaluateScalability(repoData: any): number {
    let score = 50; // Base score

    // Modern languages tend to be more scalable
    const scalableLanguages = ['go', 'rust', 'typescript', 'java', 'python'];
    if (scalableLanguages.includes(repoData.language?.toLowerCase())) {
      score += 20;
    }

    // Cloud/container topics
    const cloudTopics = ['docker', 'kubernetes', 'cloud', 'aws', 'microservices'];
    const topics = (repoData.topics || []).map((t: string) => t.toLowerCase());
    const hasCloudTopic = cloudTopics.some(ct => topics.includes(ct));
    if (hasCloudTopic) score += 20;

    // API/web services are generally scalable
    const webTopics = ['api', 'web', 'http', 'rest', 'graphql'];
    const hasWebTopic = webTopics.some(wt => topics.includes(wt));
    if (hasWebTopic) score += 10;

    return Math.min(100, score);
  }

  /**
   * Assess risks associated with revival
   */
  private assessRisks(repoData: any, activity: any): number {
    let riskScore = 0; // Lower is better (less risky)

    // Age risk - very old repos might have outdated dependencies
    const ageInYears = (Date.now() - new Date(repoData.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365);
    if (ageInYears > 5) riskScore += 20;
    else if (ageInYears > 3) riskScore += 10;

    // Abandonment risk
    const daysSinceUpdate = (Date.now() - new Date(repoData.updated_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate > 730) riskScore += 30; // 2+ years
    else if (daysSinceUpdate > 365) riskScore += 20; // 1+ year
    else if (daysSinceUpdate > 180) riskScore += 10; // 6+ months

    // Complexity risk
    if (repoData.size > 50000) riskScore += 15; // Very large codebase

    // License risk
    const riskyLicenses = ['gpl', 'agpl', 'copyleft'];
    if (repoData.license && riskyLicenses.some(rl => repoData.license.key.includes(rl))) {
      riskScore += 15;
    }

    // Return inverted score (higher is better)
    return Math.max(0, 100 - riskScore);
  }

  /**
   * Calculate overall business evaluation score
   */
  private calculateBusinessScore(metrics: BusinessEvaluationMetrics): number {
    return Math.round(
      (metrics.marketDemand * 0.25) +
      (metrics.competitorAnalysis * 0.15) +
      (metrics.userEngagement * 0.20) +
      (metrics.monetizationPotential * 0.20) +
      (metrics.scalabilityScore * 0.10) +
      (metrics.riskAssessment * 0.10)
    );
  }

  /**
   * Calculate abandonment score (lower means more abandoned, better for revival)
   */
  private calculateAbandonmentScore(activity: any): number {
    const daysSinceLastCommit = activity.daysSinceLastCommit || 365;
    const daysSinceLastRelease = activity.daysSinceLastRelease || 730;

    let score = 100; // Start high

    // Penalize recent activity (we want abandoned repos)
    if (daysSinceLastCommit < 30) score -= 50;
    else if (daysSinceLastCommit < 90) score -= 30;
    else if (daysSinceLastCommit < 180) score -= 10;

    // Bonus for longer abandonment
    if (daysSinceLastCommit > 365) score += 20;
    if (daysSinceLastRelease > 730) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate community interest score
   */
  private calculateCommunityScore(repoData: any): number {
    let score = 0;

    // Stars indicate interest
    if (repoData.stargazers_count > 1000) score += 40;
    else if (repoData.stargazers_count > 100) score += 30;
    else if (repoData.stargazers_count > 10) score += 20;
    else if (repoData.stargazers_count > 1) score += 10;

    // Forks indicate practical use
    if (repoData.forks_count > 50) score += 30;
    else if (repoData.forks_count > 10) score += 20;
    else if (repoData.forks_count > 1) score += 10;

    // Watchers indicate ongoing interest
    if (repoData.watchers_count > 20) score += 20;
    else if (repoData.watchers_count > 5) score += 10;

    // Open issues indicate community engagement
    if (repoData.open_issues_count > 0) score += 10;

    return Math.min(100, score);
  }

  /**
   * Assess technical feasibility of revival
   */
  private assessTechnicalFeasibility(repoData: any): number {
    let score = 50; // Base score

    // Modern languages are easier to revive
    const modernLanguages = ['typescript', 'go', 'rust', 'python', 'javascript'];
    if (modernLanguages.includes(repoData.language?.toLowerCase())) {
      score += 20;
    }

    // Reasonable size is easier to handle
    if (repoData.size > 1000 && repoData.size < 10000) score += 15;
    else if (repoData.size > 10000) score -= 10; // Too large
    else if (repoData.size < 100) score -= 5; // Too small

    // License compatibility
    const goodLicenses = ['mit', 'apache-2.0', 'bsd-3-clause'];
    if (repoData.license && goodLicenses.includes(repoData.license.key)) {
      score += 15;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Get revival recommendation based on score
   */
  private getRevivalRecommendation(score: number): 'high' | 'medium' | 'low' | 'not-recommended' {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    if (score >= 40) return 'low';
    return 'not-recommended';
  }

  /**
   * Calculate confidence in the analysis
   */
  private calculateConfidence(repoData: any, activity: any): number {
    let confidence = 50; // Base confidence

    // More data = higher confidence
    if (repoData.stargazers_count > 10) confidence += 15;
    if (repoData.forks_count > 5) confidence += 15;
    if (repoData.open_issues_count > 0) confidence += 10;
    if (repoData.size > 1000) confidence += 10;

    return Math.min(100, confidence);
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    codeQuality: CodeQualityMetrics,
    businessEvaluation: BusinessEvaluationMetrics,
    revivalPotential: RevivalPotentialScore
  ): string[] {
    const recommendations: string[] = [];

    if (revivalPotential.score >= 70) {
      recommendations.push("High revival potential - consider immediate action");
    }

    if (codeQuality.testCoverage < 30) {
      recommendations.push("Improve test coverage before revival");
    }

    if (codeQuality.documentation < 50) {
      recommendations.push("Update documentation and README");
    }

    if (businessEvaluation.riskAssessment < 60) {
      recommendations.push("Assess and mitigate identified risks");
    }

    if (businessEvaluation.monetizationPotential > 70) {
      recommendations.push("Strong monetization potential - consider business model");
    }

    if (revivalPotential.factors.community > 70) {
      recommendations.push("Strong community interest - engage with existing users");
    }

    return recommendations;
  }

  /**
   * Generate analysis summary
   */
  private generateAnalysisSummary(
    codeQuality: CodeQualityMetrics,
    businessEvaluation: BusinessEvaluationMetrics,
    revivalPotential: RevivalPotentialScore
  ): string {
    const score = revivalPotential.score;
    const recommendation = revivalPotential.recommendation;

    let summary = `Revival potential: ${score}/100 (${recommendation}). `;

    if (codeQuality.overallScore > 70) {
      summary += "Good code quality foundation. ";
    } else if (codeQuality.overallScore < 40) {
      summary += "Code quality needs improvement. ";
    }

    if (businessEvaluation.overallScore > 70) {
      summary += "Strong business potential. ";
    } else if (businessEvaluation.overallScore < 40) {
      summary += "Limited business viability. ";
    }

    if (revivalPotential.factors.community > 70) {
      summary += "Active community interest detected.";
    } else {
      summary += "Limited community engagement.";
    }

    return summary;
  }

  /**
   * Assess market timing for revival
   */
  private assessMarketTiming(repoData: any): number {
    let score = 50; // Base score

    // Technology trend analysis
    const trendingTopics = [
      'ai', 'machine-learning', 'blockchain', 'cryptocurrency', 'web3',
      'react', 'vue', 'svelte', 'typescript', 'rust', 'go',
      'microservices', 'serverless', 'cloud-native', 'kubernetes',
      'data-science', 'analytics', 'visualization'
    ];

    const topics = (repoData.topics || []).map((t: string) => t.toLowerCase());
    const language = repoData.language?.toLowerCase();

    // Bonus for trending technologies
    const trendingMatches = trendingTopics.filter(trend =>
      topics.includes(trend) ||
      (language && trend === language) ||
      (repoData.description && repoData.description.toLowerCase().includes(trend))
    );

    score += trendingMatches.length * 10;

    // Age factor - not too old, not too new
    const ageInYears = (Date.now() - new Date(repoData.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365);
    if (ageInYears >= 2 && ageInYears <= 8) score += 15; // Sweet spot
    else if (ageInYears > 10) score -= 10; // Too old

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Assess competitive advantage potential
   */
  private assessCompetitiveAdvantage(repoData: any, activity: any): number {
    let score = 50; // Base score

    // Unique positioning
    const uniqueTopics = ['niche', 'specialized', 'custom', 'proprietary'];
    const topics = (repoData.topics || []).map((t: string) => t.toLowerCase());

    if (uniqueTopics.some(topic => topics.includes(topic))) score += 20;

    // First-mover advantage in specific domain
    if (repoData.stargazers_count > 100 && repoData.stargazers_count < 5000) {
      score += 15; // Not too crowded, but validated
    }

    // Technical differentiation
    const advancedLanguages = ['rust', 'go', 'typescript', 'kotlin', 'swift'];
    if (advancedLanguages.includes(repoData.language?.toLowerCase())) score += 10;

    // License advantage
    const businessFriendlyLicenses = ['mit', 'apache-2.0', 'bsd-3-clause'];
    if (repoData.license && businessFriendlyLicenses.includes(repoData.license.key)) {
      score += 15;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Assess complexity of revival effort
   */
  private assessRevivalComplexity(repoData: any, activity: any, codeQuality: CodeQualityMetrics): number {
    let score = 100; // Start high (low complexity)

    // Size complexity
    if (repoData.size > 100000) score -= 20; // Very large
    else if (repoData.size > 50000) score -= 10; // Large
    else if (repoData.size < 1000) score -= 15; // Too small

    // Dependency complexity
    if (codeQuality.dependencies < 60) score -= 15; // Outdated dependencies

    // Documentation complexity
    if (codeQuality.documentation < 40) score -= 20; // Poor documentation

    // Age-related complexity
    const ageInYears = (Date.now() - new Date(repoData.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365);
    if (ageInYears > 5) score -= 10; // Older codebases are harder to revive

    // Language ecosystem maturity
    const matureLanguages = ['javascript', 'typescript', 'python', 'java', 'go'];
    if (!matureLanguages.includes(repoData.language?.toLowerCase())) score -= 10;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Assess community readiness for revival
   */
  private assessCommunityReadiness(repoData: any, activity: any): number {
    let score = 30; // Base score

    // Existing community engagement
    if (repoData.stargazers_count > 50) score += 20;
    if (repoData.forks_count > 10) score += 15;
    if (repoData.watchers_count > 10) score += 10;

    // Issue engagement
    if (repoData.open_issues_count > 0 && repoData.open_issues_count < 50) {
      score += 15; // Active but manageable
    } else if (repoData.open_issues_count > 100) {
      score -= 10; // Too many issues
    }

    // Recent community activity
    const daysSinceUpdate = (Date.now() - new Date(repoData.updated_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 180) score += 20; // Recent interest

    // Documentation quality helps community adoption
    if (repoData.description && repoData.description.length > 50) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate dynamic weights based on repository characteristics
   */
  private calculateDynamicWeights(repoData: any, activity: any, codeQuality: CodeQualityMetrics): any {
    const baseWeights = {
      abandonment: 0.20,
      community: 0.20,
      technical: 0.20,
      business: 0.15,
      marketTiming: 0.10,
      competitiveAdvantage: 0.05,
      revivalComplexity: 0.05,
      communityReadiness: 0.05
    };

    // Adjust weights based on repository type and characteristics
    const adjustedWeights = { ...baseWeights };

    // For highly technical projects, increase technical weight
    const technicalLanguages = ['rust', 'go', 'c++', 'c', 'assembly'];
    if (technicalLanguages.includes(repoData.language?.toLowerCase())) {
      adjustedWeights.technical += 0.10;
      adjustedWeights.business -= 0.05;
      adjustedWeights.community -= 0.05;
    }

    // For business-oriented projects, increase business weight
    const businessTopics = ['api', 'saas', 'enterprise', 'commerce', 'payment'];
    const topics = (repoData.topics || []).map((t: string) => t.toLowerCase());
    if (businessTopics.some(topic => topics.includes(topic))) {
      adjustedWeights.business += 0.10;
      adjustedWeights.technical -= 0.05;
      adjustedWeights.marketTiming += 0.05;
      adjustedWeights.abandonment -= 0.10;
    }

    // For community-driven projects, increase community weight
    if (repoData.forks_count > 50 || repoData.stargazers_count > 500) {
      adjustedWeights.community += 0.10;
      adjustedWeights.communityReadiness += 0.05;
      adjustedWeights.technical -= 0.05;
      adjustedWeights.revivalComplexity -= 0.05;
      adjustedWeights.abandonment -= 0.05;
    }

    return adjustedWeights;
  }

  /**
   * Get enhanced recommendation with detailed reasoning
   */
  private getEnhancedRecommendation(score: number, weights: any, confidence: number): any {
    let level: 'high' | 'medium' | 'low' | 'not-recommended';
    let reasoning: string[] = [];

    if (score >= 80) {
      level = 'high';
      reasoning.push('Excellent revival potential with strong fundamentals');
      reasoning.push('High likelihood of successful community re-engagement');
    } else if (score >= 65) {
      level = 'high';
      reasoning.push('Strong revival potential with good market opportunity');
      reasoning.push('Solid technical foundation for revival efforts');
    } else if (score >= 50) {
      level = 'medium';
      reasoning.push('Moderate revival potential requiring focused effort');
      reasoning.push('Some challenges but manageable with proper strategy');
    } else if (score >= 35) {
      level = 'medium';
      reasoning.push('Limited revival potential with significant challenges');
      reasoning.push('Would require substantial investment and expertise');
    } else if (score >= 20) {
      level = 'low';
      reasoning.push('Low revival potential due to multiple barriers');
      reasoning.push('Consider only if unique strategic value exists');
    } else {
      level = 'not-recommended';
      reasoning.push('Revival not recommended due to fundamental issues');
      reasoning.push('Better opportunities likely exist elsewhere');
    }

    // Add confidence-based reasoning
    if (confidence < 60) {
      reasoning.push('Analysis confidence is limited due to insufficient data');
    } else if (confidence > 85) {
      reasoning.push('High confidence in analysis based on comprehensive data');
    }

    return { level, reasoning };
  }
}

// Export singleton instance
export const analysisEngine = new AnalysisEngine();
