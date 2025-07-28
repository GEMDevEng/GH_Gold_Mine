import React, { useState, useEffect } from 'react';
import { SearchFilters } from '../components/ui/SearchFilters';
import { ProjectCard } from '../components/ui/ProjectCard';
import { Button } from '../components/ui/Button';
import { Loading } from '../components/ui/Loading';
import { Alert } from '../components/ui/Alert';
import { PageLayout } from '../components/layout/PageLayout';
import { apiService, Repository, SearchFilters as ApiSearchFilters } from '../services/api';

interface SearchState {
  repositories: Repository[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  page: number;
  perPage: number;
  hasMore: boolean;
  searchId: string | null;
  cached: boolean;
}

export const RepositorySearch: React.FC = () => {
  const [searchState, setSearchState] = useState<SearchState>({
    repositories: [],
    loading: false,
    error: null,
    totalCount: 0,
    page: 1,
    perPage: 20,
    hasMore: false,
    searchId: null,
    cached: false,
  });

  const [filters, setFilters] = useState<ApiSearchFilters>({
    query: '',
    language: '',
    minStars: 10,
    maxStars: 10000,
    sort: 'stars',
    order: 'desc',
    perPage: 20,
    page: 1,
  });

  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Load initial high-potential repositories
  useEffect(() => {
    if (isInitialLoad) {
      loadHighPotentialRepositories();
      setIsInitialLoad(false);
    }
  }, [isInitialLoad]);

  const loadHighPotentialRepositories = async () => {
    try {
      setSearchState(prev => ({ ...prev, loading: true, error: null }));
      
      const result = await apiService.getHighPotentialRepositories({
        page: 1,
        limit: 20,
        minScore: 70,
      });

      setSearchState(prev => ({
        ...prev,
        repositories: result.repositories,
        totalCount: result.pagination.total,
        page: result.pagination.page,
        hasMore: result.pagination.page < result.pagination.pages,
        loading: false,
        cached: false,
      }));
    } catch (error) {
      setSearchState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load repositories',
        loading: false,
      }));
    }
  };

  const handleSearch = async (newFilters: ApiSearchFilters) => {
    try {
      setSearchState(prev => ({ ...prev, loading: true, error: null }));
      setFilters({ ...newFilters, page: 1 });

      const result = await apiService.searchRepositories({ ...newFilters, page: 1 });

      setSearchState(prev => ({
        ...prev,
        repositories: result.repositories,
        totalCount: result.totalCount,
        page: result.page,
        perPage: result.perPage,
        hasMore: result.page * result.perPage < result.totalCount,
        searchId: result.searchId,
        cached: result.cached,
        loading: false,
      }));
    } catch (error) {
      setSearchState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Search failed',
        loading: false,
      }));
    }
  };

  const handleLoadMore = async () => {
    if (searchState.loading || !searchState.hasMore) return;

    try {
      setSearchState(prev => ({ ...prev, loading: true }));
      
      const nextPage = searchState.page + 1;
      const result = await apiService.searchRepositories({ 
        ...filters, 
        page: nextPage 
      });

      setSearchState(prev => ({
        ...prev,
        repositories: [...prev.repositories, ...result.repositories],
        page: result.page,
        hasMore: result.page * result.perPage < result.totalCount,
        loading: false,
      }));
    } catch (error) {
      setSearchState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load more repositories',
        loading: false,
      }));
    }
  };

  const handleStartCollectionJob = async () => {
    try {
      const jobData = {
        name: `Search: ${filters.query || 'High Potential Repositories'}`,
        filters,
        settings: {
          maxResults: 1000,
          analysisDepth: 'detailed' as const,
          includeArchived: false,
          includeForks: false,
        },
      };

      const result = await apiService.startCollectionJob(jobData);
      
      // Show success message or redirect to job monitoring page
      alert(`Collection job started successfully! Job ID: ${result.jobId}`);
    } catch (error) {
      alert(`Failed to start collection job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getRevivalBadgeColor = (recommendation: string) => {
    switch (recommendation) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Repository Discovery</h1>
            <p className="text-gray-600 mt-2">
              Find abandoned GitHub repositories with revival potential
            </p>
          </div>
          
          {searchState.repositories.length > 0 && (
            <Button
              onClick={handleStartCollectionJob}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Start Collection Job
            </Button>
          )}
        </div>

        {/* Search Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <SearchFilters
            onSearch={handleSearch}
            loading={searchState.loading}
            initialFilters={filters}
          />
        </div>

        {/* Results Info */}
        {searchState.totalCount > 0 && (
          <div className="flex items-center justify-between bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-4">
              <span className="text-blue-900 font-medium">
                {searchState.totalCount.toLocaleString()} repositories found
              </span>
              {searchState.cached && (
                <span className="text-blue-700 text-sm bg-blue-100 px-2 py-1 rounded">
                  Cached results
                </span>
              )}
            </div>
            <div className="text-blue-700 text-sm">
              Showing {searchState.repositories.length} of {searchState.totalCount}
            </div>
          </div>
        )}

        {/* Error Alert */}
        {searchState.error && (
          <Alert
            type="error"
            title="Search Error"
            message={searchState.error}
            onClose={() => setSearchState(prev => ({ ...prev, error: null }))}
          />
        )}

        {/* Loading State */}
        {searchState.loading && searchState.repositories.length === 0 && (
          <div className="flex justify-center py-12">
            <Loading size="lg" />
          </div>
        )}

        {/* Repository Results */}
        {searchState.repositories.length > 0 && (
          <div className="space-y-4">
            {searchState.repositories.map((repo) => (
              <div key={repo._id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">
                        <a 
                          href={repo.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:text-blue-600"
                        >
                          {repo.fullName}
                        </a>
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRevivalBadgeColor(repo.revival.recommendation)}`}>
                        {repo.revival.recommendation} potential
                      </span>
                      <span className="text-sm text-gray-500">
                        Score: {repo.revival.potentialScore}/100
                      </span>
                    </div>
                    
                    {repo.description && (
                      <p className="text-gray-600 mb-3">{repo.description}</p>
                    )}
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-500 mb-3">
                      <span className="flex items-center">
                        ⭐ {repo.metrics.stars.toLocaleString()}
                      </span>
                      <span className="flex items-center">
                        🍴 {repo.metrics.forks.toLocaleString()}
                      </span>
                      <span className="flex items-center">
                        📅 Last commit: {new Date(repo.metrics.lastCommitDate).toLocaleDateString()}
                      </span>
                      {repo.metrics.license && (
                        <span className="flex items-center">
                          📄 {repo.metrics.license}
                        </span>
                      )}
                    </div>

                    {/* Topics */}
                    {repo.metrics.topics.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {repo.metrics.topics.slice(0, 5).map((topic) => (
                          <span 
                            key={topic}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                          >
                            {topic}
                          </span>
                        ))}
                        {repo.metrics.topics.length > 5 && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                            +{repo.metrics.topics.length - 5} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Revival Reasons */}
                    {repo.revival.reasons.length > 0 && (
                      <div className="mb-2">
                        <h4 className="text-sm font-medium text-green-800 mb-1">Why it has potential:</h4>
                        <ul className="text-sm text-green-700 space-y-1">
                          {repo.revival.reasons.slice(0, 3).map((reason, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-green-500 mr-2">•</span>
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Concerns */}
                    {repo.revival.concerns.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-orange-800 mb-1">Potential concerns:</h4>
                        <ul className="text-sm text-orange-700 space-y-1">
                          {repo.revival.concerns.slice(0, 2).map((concern, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-orange-500 mr-2">•</span>
                              {concern}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <img 
                      src={repo.owner.avatar} 
                      alt={repo.owner.login}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{repo.owner.login}</div>
                      <div className="text-gray-500">{repo.owner.type}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Load More Button */}
            {searchState.hasMore && (
              <div className="flex justify-center py-6">
                <Button
                  onClick={handleLoadMore}
                  disabled={searchState.loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {searchState.loading ? (
                    <>
                      <Loading size="sm" className="mr-2" />
                      Loading...
                    </>
                  ) : (
                    'Load More Repositories'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!searchState.loading && searchState.repositories.length === 0 && !searchState.error && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-2">No repositories found</div>
            <div className="text-gray-400">Try adjusting your search filters</div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};
