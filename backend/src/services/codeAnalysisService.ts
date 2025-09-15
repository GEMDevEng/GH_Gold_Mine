import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../config/logger';

interface CodeAnalysisResults {
  codeQuality: {
    flake8: {
      score: number;
      issues: number;
      critical_issues: number;
      details: any;
    };
    eslint: {
      score: number;
      issues: number;
      critical_issues: number;
      details: any;
    };
  };
  complexity: {
    complexity_score: number;
    average_complexity: number;
    complex_functions: number;
    details: any;
  };
  documentation: {
    score: number;
    readme_length: number;
    has_code_examples: boolean;
    has_installation: boolean;
    has_contributing: boolean;
    readability_score: number;
    details: any;
  };
  dependencies: {
    score: number;
    has_package_json: boolean;
    has_requirements_txt: boolean;
    has_pipfile: boolean;
    has_setup_py: boolean;
    has_cargo_toml: boolean;
    has_go_mod: boolean;
    details: any;
  };
  security: {
    score: number;
    has_security_md: boolean;
    has_github_security_policy: boolean;
    has_dependabot_config: boolean;
    has_codeql_config: boolean;
    details: any;
  };
  aggregate: {
    code_quality_score: number;
    documentation_score: number;
    security_score: number;
    dependency_score: number;
  };
  errors: string[];
  warnings: string[];
}

export class CodeAnalysisService {
  private pythonScriptPath: string;
  private timeoutMs: number = 300000; // 5 minutes

  constructor() {
    // Path to the Python analysis script
    this.pythonScriptPath = path.join(__dirname, '../scripts/analyzeRepository.py');
  }

  /**
   * Run comprehensive code analysis using Python tools
   */
  async analyzeRepository(owner: string, repo: string): Promise<CodeAnalysisResults | null> {
    const repoUrl = `https://github.com/${owner}/${repo}`;

    try {
      logger.info(`Starting code analysis for ${repoUrl}`);

      // Verify Python script exists
      await fs.access(this.pythonScriptPath);

      // Run the Python analysis script
      const pythonResults = await this.runPythonScript(repoUrl);

            if (pythonResults.success && pythonResults.data) {
              logger.info(`Code analysis completed for ${repoUrl}`);
              return pythonResults.data;
            } else {
        logger.error(`Python script failed for ${repoUrl}: ${pythonResults.error}`);
        return null;
      }

    } catch (error) {
      logger.error(`Code analysis failed for ${owner}/${repo}:`, error);

      // Return fallback results if analysis fails
      return this.createFallbackResults(owner, repo, error);
    }
  }

  /**
   * Execute the Python analysis script as a subprocess
   */
  private async runPythonScript(repoUrl: string): Promise<{
    success: boolean;
    data?: CodeAnalysisResults;
    error?: string;
  }> {
    return new Promise((resolve) => {
      const pythonProcess = spawn('python3', [this.pythonScriptPath, repoUrl], {
        cwd: path.dirname(this.pythonScriptPath),
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      // Collect stdout
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      // Collect stderr for debugging
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle process completion
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const results: CodeAnalysisResults = JSON.parse(stdout);

            // Check if there were any errors in the analysis
            if (results.errors && results.errors.length > 0) {
              logger.warn(`Analysis completed with errors for ${repoUrl}:`, results.errors);
            }

            resolve({
              success: true,
              data: results
            });
          } catch (parseError) {
            logger.error(`Failed to parse Python script output:`, parseError);
            resolve({
              success: false,
              error: `Parse error: ${parseError.message}`
            });
          }
        } else {
          const error = stderr || `Python script exited with code ${code}`;
          logger.error(`Python script failed:`, error);
          resolve({
            success: false,
            error: error
          });
        }
      });

      // Handle timeout
      const timeout = setTimeout(() => {
        pythonProcess.kill('SIGKILL');
        logger.warn(`Python script timed out for ${repoUrl}`);
        resolve({
          success: false,
          error: 'Analysis timed out (5 minutes)'
        });
      }, this.timeoutMs);

      // Clear timeout on success
      pythonProcess.on('close', () => {
        clearTimeout(timeout);
      });
    });
  }

  /**
   * Create fallback results when analysis fails
   */
  private createFallbackResults(owner: string, repo: string, error: any): CodeAnalysisResults {
    logger.warn(`Creating fallback analysis results for ${owner}/${repo}`);

    return {
      codeQuality: {
        flake8: {
          score: 50,
          issues: 0,
          critical_issues: 0,
          details: { error: 'Analysis failed' }
        },
        eslint: {
          score: 50,
          issues: 0,
          critical_issues: 0,
          details: { error: 'Analysis failed' }
        }
      },
      complexity: {
        complexity_score: 50,
        average_complexity: 5.0,
        complex_functions: 0,
        details: { error: 'Analysis failed' }
      },
      documentation: {
        score: 30, // Assume basic documentation exists
        readme_length: 500,
        has_code_examples: false,
        has_installation: false,
        has_contributing: false,
        readability_score: 50,
        details: { error: 'Analysis failed' }
      },
      dependencies: {
        score: 40, // Assume basic dependency management exists
        has_package_json: false,
        has_requirements_txt: false,
        has_pipfile: false,
        has_setup_py: false,
        has_cargo_toml: false,
        has_go_mod: false,
        details: { error: 'Analysis failed' }
      },
      security: {
        score: 30, // Assume basic security practices
        has_security_md: false,
        has_github_security_policy: false,
        has_dependabot_config: false,
        has_codeql_config: false,
        details: { error: 'Analysis failed' }
      },
      aggregate: {
        code_quality_score: 50,
        documentation_score: 30,
        security_score: 30,
        dependency_score: 40
      },
      errors: [error.message || 'Analysis tool failed'],
      warnings: []
    };
  }

  /**
   * Check if Python and required tools are available
   */
  async checkToolsAvailability(): Promise<{
    available: boolean;
    python: boolean;
    flake8: boolean;
    radon: boolean;
    git: boolean;
    eslint: boolean;
    missing: string[];
  }> {
    const results = {
      available: true,
      python: false,
      flake8: false,
      radon: false,
      git: false,
      eslint: false,
      missing: [] as string[]
    };

    try {
      // Check Python
      await this.runCommand(['python3', '--version']);
      results.python = true;
    } catch {
      results.missing.push('python3');
    }

    try {
      // Check git
      await this.runCommand(['git', '--version']);
      results.git = true;
    } catch {
      results.missing.push('git');
    }

    try {
      // Check flake8
      await this.runCommand(['python3', '-c', 'import flake8']);
      results.flake8 = true;
    } catch {
      results.missing.push('flake8 (pip install flake8)');
    }

    try {
      // Check radon
      await this.runCommand(['python3', '-c', 'import radon']);
      results.radon = true;
    } catch {
      results.missing.push('radon (pip install radon)');
    }

    try {
      // Check ESLint (via npx)
      await this.runCommand(['npx', '--yes', 'eslint', '--version']);
      results.eslint = true;
    } catch {
      results.missing.push('eslint (npm install -g eslint)');
    }

    results.available = results.missing.length === 0;
    return results;
  }

  /**
   * Run a command and return success status
   */
  private async runCommand(cmd: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn(cmd[0], cmd.slice(1), {
        stdio: 'inherit', // Hide output
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });
    });
  }
}

export const codeAnalysisService = new CodeAnalysisService();
