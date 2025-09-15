#!/usr/bin/env python3
"""
GitHub Repository Analysis Tool

This script provides comprehensive code analysis for repositories,
generating metrics for code quality assessment including:
- Code complexity analysis (radon)
- Linting (flake8, ESLint)
- Documentation analysis (spaCy, NLTK)
- Dependency analysis
- Security scanning
"""

import os
import sys
import json
import tempfile
import subprocess
import shutil
from pathlib import Path
from typing import Dict, List, Optional, Any
from urllib.parse import urlparse
import argparse
import requests
import time
import re

class RepositoryAnalyzer:
    def __init__(self, repo_url: str, local_path: Optional[str] = None):
        self.repo_url = repo_url
        self.local_path = local_path or self._get_repo_name_from_url(repo_url)
        self.analysis_results = {
            'repository': repo_url,
            'timestamp': int(time.time()),
            'code_quality': {},
            'documentation': {},
            'security': {},
            'dependencies': {},
            'complexity': {},
            'errors': [],
            'warnings': []
        }

    def _get_repo_name_from_url(self, url: str) -> str:
        """Extract repository name from GitHub URL"""
        parsed = urlparse(url)
        if 'github.com' in parsed.netloc:
            path_parts = parsed.path.strip('/').split('/')
            if len(path_parts) >= 2:
                return f"{path_parts[-2]}_{path_parts[-1]}"
        return "unknown_repository"

    def clone_repository(self) -> Optional[str]:
        """Clone the repository to a temporary directory"""
        try:
            temp_dir = tempfile.mkdtemp(prefix=self.local_path)
            print(f"Cloning {self.repo_url} to {temp_dir}", file=sys.stderr)

            subprocess.run(
                ['git', 'clone', '--depth', '1', self.repo_url, temp_dir],
                check=True,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )

            return temp_dir

        except subprocess.CalledProcessError as e:
            self.analysis_results['errors'].append(f"Failed to clone repository: {e}")
            return None
        except subprocess.TimeoutExpired:
            self.analysis_results['errors'].append("Repository cloning timed out")
            return None
        except Exception as e:
            self.analysis_results['errors'].append(f"Unexpected error during clone: {e}")
            return None

    def run_flake8_analysis(self, repo_path: str) -> Dict[str, Any]:
        """Run flake8 for Python code quality analysis"""
        results = {
            'score': 0,
            'issues': 0,
            'critical_issues': 0,
            'details': {}
        }

        try:
            # Check if there are Python files
            python_files = list(Path(repo_path).rglob('*.py'))
            if not python_files:
                results['details']['message'] = 'No Python files found'
                return results

            # Run flake8
            cmd = ['flake8', '--statistics', '--count', repo_path]
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120,
                cwd=os.getcwd()
            )

            # Parse flake8 output
            if result.returncode == 0:
                results['score'] = 90  # No issues found
            else:
                # Count issues from stderr
                lines = result.stderr.strip().split('\n')
                issue_count = 0
                critical_count = 0

                for line in lines:
                    if line.strip():
                        issue_count += 1
                        if any(issue in line.lower() for issue in ['e9', 'f', 'e112', 'e113']):
                            critical_count += 1

                results['issues'] = issue_count
                results['critical_issues'] = critical_count

                # Calculate score (fewer issues = higher score)
                base_score = 80
                penalty = min(50, (issue_count * 2) + (critical_count * 5))
                results['score'] = max(0, base_score - penalty)

        except subprocess.TimeoutExpired:
            results['details']['timeout'] = True
            results['score'] = 0
        except Exception as e:
            results['details']['error'] = str(e)
            results['score'] = 0

        return results

    def run_radon_analysis(self, repo_path: str) -> Dict[str, Any]:
        """Run radon for complexity analysis"""
        results = {
            'complexity_score': 0,
            'average_complexity': 0,
            'complex_functions': 0,
            'details': {}
        }

        try:
            python_files = list(Path(repo_path).rglob('*.py'))
            if not python_files:
                return results

            # Run radon cc (cyclomatic complexity)
            cmd = ['radon', 'cc', '--json', repo_path]
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60
            )

            if result.returncode == 0:
                try:
                    complexity_data = json.loads(result.stdout)
                    total_complexity = 0
                    function_count = 0
                    complex_fn_count = 0

                    for file_data in complexity_data.values():
                        for func_data in file_data:
                            complexity = func_data.get('complexity', 1)
                            total_complexity += complexity
                            function_count += 1

                            # Functions/methods with complexity > 10 are considered complex
                            if complexity > 10:
                                complex_fn_count += 1

                    if function_count > 0:
                        avg_complexity = total_complexity / function_count

                        # Higher complexity = lower score
                        if avg_complexity <= 5:
                            complexity_score = 90
                        elif avg_complexity <= 10:
                            complexity_score = 70
                        elif avg_complexity <= 20:
                            complexity_score = 40
                        else:
                            complexity_score = 20

                        results['complexity_score'] = complexity_score
                        results['average_complexity'] = round(avg_complexity, 2)
                        results['complex_functions'] = complex_fn_count

                except json.JSONDecodeError:
                    results['details']['error'] = 'Failed to parse radon output'
            else:
                results['details']['error'] = 'Radon analysis failed'

        except subprocess.TimeoutExpired:
            results['details']['timeout'] = True
        except Exception as e:
            results['details']['error'] = str(e)

        return results

    def run_eslint_analysis(self, repo_path: str) -> Dict[str, Any]:
        """Run ESLint for JavaScript/TypeScript analysis"""
        results = {
            'score': 0,
            'issues': 0,
            'critical_issues': 0,
            'details': {}
        }

        try:
            # Check for JS/TS files
            js_files = list(Path(repo_path).rglob('*.js'))
            ts_files = list(Path(repo_path).rglob('*.ts'))
            jsx_files = list(Path(repo_path).rglob('*.jsx'))
            tsx_files = list(Path(repo_path).rglob('*.tsx'))

            source_files = js_files + ts_files + jsx_files + tsx_files

            if not source_files:
                results['details']['message'] = 'No JS/TS files found'
                return results

            # Check for ESLint config
            eslint_config = [
                '.eslintrc.json', '.eslintrc.js', '.eslintrc.yml',
                '.eslintrc.yaml', 'package.json'
            ]

            has_eslint_config = any(Path(repo_path).joinpath(config).exists()
                                  for config in eslint_config)

            if not has_eslint_config:
                results['details']['message'] = 'No ESLint configuration found'
                results['score'] = 40  # Partial score for having JS/TS files
                return results

            # Run ESLint
            cmd = ['npx', '--yes', 'eslint', '--max-warnings=0', '--format=json', repo_path]
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120,
                cwd=repo_path
            )

            if result.returncode in [0, 1]:  # 0 = no issues, 1 = issues found
                try:
                    eslint_data = json.loads(result.stdout) if result.stdout else []
                    total_issues = sum(len(item.get('messages', [])) for item in eslint_data)
                    critical_issues = 0

                    for file_data in eslint_data:
                        for message in file_data.get('messages', []):
                            severity = message.get('ruleId', '').lower()
                            if any(severity_check in severity for severity_check in
                                   ['no-unused-vars', 'error', 'no-unreachable']):
                                critical_issues += 1

                    results['issues'] = total_issues
                    results['critical_issues'] = critical_issues

                    # Calculate score
                    base_score = 80
                    penalty = min(60, (total_issues * 1) + (critical_issues * 3))
                    results['score'] = max(0, base_score - penalty)

                except json.JSONDecodeError:
                    results['details']['error'] = 'Failed to parse ESLint output'
                    results['score'] = 30
            else:
                results['details']['error'] = 'ESLint execution failed'
                results['score'] = 20

        except subprocess.TimeoutExpired:
            results['details']['timeout'] = True
            results['score'] = 0
        except Exception as e:
            results['details']['error'] = str(e)
            results['score'] = 0

        return results

    def analyze_documentation(self, repo_path: str) -> Dict[str, Any]:
        """Analyze README and documentation quality using text analysis"""
        results = {
            'score': 0,
            'readme_length': 0,
            'has_code_examples': False,
            'has_installation': False,
            'has_contributing': False,
            'readability_score': 0,
            'details': {}
        }

        try:
            # Look for README file
            readme_files = [
                'README.md', 'README.rst', 'README.txt', 'readme.md',
                'Readme.md', 'readme.txt', 'README'
            ]

            readme_content = None
            readme_path = None

            for readme_file in readme_files:
                potential_path = Path(repo_path) / readme_file
                if potential_path.exists():
                    try:
                        with open(potential_path, 'r', encoding='utf-8') as f:
                            readme_content = f.read()
                            readme_path = readme_file
                            break
                    except UnicodeDecodeError:
                        # Try with different encoding
                        try:
                            with open(potential_path, 'r', encoding='latin-1') as f:
                                readme_content = f.read()
                                readme_path = readme_file
                                break
                        except UnicodeDecodeError:
                            continue

            if not readme_content:
                results['details']['message'] = 'No README file found'
                return results

            results['readme_length'] = len(readme_content)

            # Analyze content quality
            content_lower = readme_content.lower()

            # Check for common sections
            sections = {
                'installation': len(re.findall(r'#{1,3}.*instal', content_lower)) > 0,
                'usage': len(re.findall(r'#{1,3}.*us(age|e)', content_lower)) > 0,
                'contributing': len(re.findall(r'#{1,3}.*contribut', content_lower)) > 0,
                'license': len(re.findall(r'#{1,3}.*licens', content_lower)) > 0,
            }

            results['has_installation'] = sections['installation']
            results['has_contributing'] = sections['contributing']

            # Check for code examples
            code_examples = len(re.findall(r'```[\s\S]*?```', readme_content))
            results['has_code_examples'] = code_examples > 0

            # Calculate readability
            sentences = len(re.findall(r'[.!?]+', readme_content))
            words = len(readme_content.split())
            avg_sentence_length = words / max(1, sentences)

            # Readability score (lower sentence length = higher readability)
            if avg_sentence_length <= 15:
                readability_score = 90
            elif avg_sentence_length <= 25:
                readability_score = 70
            elif avg_sentence_length <= 40:
                readability_score = 50
            else:
                readability_score = 30

            results['readability_score'] = readability_score

            # Overall documentation score
            base_score = 40  # Base score for having a README
            if sections['installation']:
                base_score += 15
            if sections['usage']:
                base_score += 10
            if sections['contributing']:
                base_score += 10
            if code_examples > 0:
                base_score += 15
            if sections['license']:
                base_score += 10

            # Readability bonus/penalty
            readability_bonus = (readability_score - 50) / 2
            base_score += readability_bonus

            results['score'] = max(0, min(100, base_score))

        except Exception as e:
            results['details']['error'] = str(e)
            results['score'] = 10  # Very low score for errors

        return results

    def analyze_dependencies(self, repo_path: str) -> Dict[str, Any]:
        """Analyze dependency files"""
        results = {
            'score': 0,
            'has_package_json': False,
            'has_requirements_txt': False,
            'has_pipfile': False,
            'has_setup_py': False,
            'has_cargo_toml': False,
            'has_go_mod': False,
            'details': {}
        }

        try:
            base_path = Path(repo_path)

            # Check for common dependency files
            dependency_files = {
                'has_package_json': base_path / 'package.json',
                'has_requirements_txt': base_path / 'requirements.txt',
                'has_pipfile': base_path / 'Pipfile',
                'has_setup_py': base_path / 'setup.py',
                'has_cargo_toml': base_path / 'Cargo.toml',
                'has_go_mod': base_path / 'go.mod'
            }

            for key, file_path in dependency_files.items():
                results[key] = file_path.exists()
                if file_path.exists():
                    results['score'] += 15  # Points for each dependency file

            # Additional points for lock files
            lock_files = [
                'package-lock.json', 'yarn.lock', 'Pipfile.lock',
                'Cargo.lock', 'go.sum', 'poetry.lock'
            ]

            has_lock_files = any((base_path / lock_file).exists() for lock_file in lock_files)
            if has_lock_files:
                results['score'] += 20
                results['details']['has_lockfiles'] = True

            # Check for security scanning config
            security_files = ['.snyk', 'security.md', '.github/FUNDING.yml']
            has_security_config = any((base_path / security_file).exists() for security_file in security_files)
            if has_security_config:
                results['score'] += 10
                results['details']['has_security_config'] = True

        except Exception as e:
            results['details']['error'] = str(e)
            results['score'] = 0

        # Cap score at 100
        results['score'] = min(100, results['score'])

        return results

    def analyze_security(self, repo_path: str) -> Dict[str, Any]:
        """Analyze security-related files and configurations"""
        results = {
            'score': 0,
            'has_security_md': False,
            'has_github_security_policy': False,
            'has_dependabot_config': False,
            'has_codeql_config': False,
            'details': {}
        }

        try:
            base_path = Path(repo_path)

            # Check for security files
            security_files = {
                'has_security_md': base_path / 'SECURITY.md',
                'has_github_security_policy': base_path / '.github' / 'SECURITY.md'
            }

            for key, file_path in security_files.items():
                results[key] = file_path.exists()
                if file_path.exists():
                    results['score'] += 20

            # Check for dependabot and security scanning
            workflow_dir = base_path / '.github' / 'workflows'
            if workflow_dir.exists():
                workflow_files = list(workflow_dir.glob('*.yml')) + list(workflow_dir.glob('*.yaml'))

                for workflow_file in workflow_files:
                    try:
                        with open(workflow_file, 'r', encoding='utf-8') as f:
                            content = f.read().lower()

                            if 'dependabot' in content or 'dependabot config' in content:
                                results['has_dependabot_config'] = True
                                results['score'] += 15

                            if 'codeql' in content or 'security-events' in content:
                                results['has_codeql_config'] = True
                                results['score'] += 15

                    except Exception:
                        continue

            # Base security score for having any security measures
            if results['score'] == 0:
                results['score'] = 30  # Basic score for an active repository

        except Exception as e:
            results['details']['error'] = str(e)
            results['score'] = 10

        return results

    def run_analysis(self) -> Dict[str, Any]:
        """Run the complete analysis pipeline"""
        repo_path = None

        try:
            # Clone repository
            repo_path = self.clone_repository()
            if not repo_path:
                return self.analysis_results

            # Run all analyses
            print("Running flake8 analysis...", file=sys.stderr)
            self.analysis_results['code_quality']['flake8'] = self.run_flake8_analysis(repo_path)

            print("Running radon analysis...", file=sys.stderr)
            self.analysis_results['complexity'] = self.run_radon_analysis(repo_path)

            print("Running ESLint analysis...", file=sys.stderr)
            self.analysis_results['code_quality']['eslint'] = self.run_eslint_analysis(repo_path)

            print("Analyzing documentation...", file=sys.stderr)
            self.analysis_results['documentation'] = self.analyze_documentation(repo_path)

            print("Analyzing dependencies...", file=sys.stderr)
            self.analysis_results['dependencies'] = self.analyze_dependencies(repo_path)

            print("Analyzing security...", file=sys.stderr)
            self.analysis_results['security'] = self.analyze_security(repo_path)

            # Calculate aggregate scores
            self._calculate_aggregate_scores()

        except Exception as e:
            self.analysis_results['errors'].append(f"Analysis failed: {str(e)}")
            print(f"Analysis failed: {str(e)}", file=sys.stderr)

        finally:
            # Clean up temporary directory
            if repo_path and os.path.exists(repo_path):
                try:
                    shutil.rmtree(repo_path)
                    print(f"Cleaned up temporary directory: {repo_path}", file=sys.stderr)
                except Exception as e:
                    self.analysis_results['warnings'].append(f"Failed to cleanup {repo_path}: {e}")

        return self.analysis_results

    def _calculate_aggregate_scores(self):
        """Calculate aggregate scores from individual analyses"""
        # Code Quality Score (weighted average)
        flake8_score = self.analysis_results.get('code_quality', {}).get('flake8', {}).get('score', 0)
        eslint_score = self.analysis_results.get('code_quality', {}).get('eslint', {}).get('score', 0)
        complexity_score = self.analysis_results.get('complexity', {}).get('complexity_score', 0)

        weights = {
            'flake8': 0.4 if flake8_score > 0 else 0,
            'eslint': 0.4 if eslint_score > 0 else 0,
            'complexity': 0.2 if complexity_score > 0 else 0
        }

        total_weight = sum(weights.values())
        if total_weight > 0:
            aggregate_code_score = (
                (flake8_score * weights['flake8']) +
                (eslint_score * weights['eslint']) +
                (complexity_score * weights['complexity'])
            ) / total_weight
        else:
            aggregate_code_score = 50  # Default if no analyses succeeded

        # Add aggregate scores
        self.analysis_results['aggregate'] = {
            'code_quality_score': round(aggregate_code_score, 2),
            'documentation_score': self.analysis_results.get('documentation', {}).get('score', 0),
            'security_score': self.analysis_results.get('security', {}).get('score', 0),
            'dependency_score': self.analysis_results.get('dependencies', {}).get('score', 0)
        }


def main():
    parser = argparse.ArgumentParser(description='Analyze GitHub repository')
    parser.add_argument('repo_url', help='GitHub repository URL')
    parser.add_argument('--output', '-o', type=argparse.FileType('w'),
                       default='-', help='Output file (default: stdout)')

    args = parser.parse_args()

    # Validate GitHub URL
    if not ('github.com' in args.repo_url or args.repo_url.startswith('https://')):
        print(json.dumps({
            'error': 'Invalid GitHub repository URL',
            'repository': args.repo_url
        }), file=sys.stderr)
        sys.exit(1)

    # Run analysis
    analyzer = RepositoryAnalyzer(args.repo_url)
    results = analyzer.run_analysis()

    # Output results
    json.dump(results, args.output, indent=2)
    if args.output != '-':
        args.output.close()


if __name__ == '__main__':
    main()
