import React, { useState, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from './Input';
import { Select } from './Select';
import { Button } from './Button';
import { Badge } from './Badge';
import { SearchFilters as ApiSearchFilters } from '../../services/api';

export interface SearchFiltersProps {
  onSearch: (filters: ApiSearchFilters) => void;
  loading?: boolean;
  initialFilters?: Partial<ApiSearchFilters>;
  className?: string;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  onSearch,
  loading = false,
  initialFilters = {},
  className = '',
}) => {
  const [filters, setFilters] = useState<ApiSearchFilters>({
    query: '',
    language: '',
    minStars: 10,
    maxStars: 10000,
    sort: 'stars',
    order: 'desc',
    perPage: 20,
    page: 1,
    ...initialFilters,
  });

  useEffect(() => {
    setFilters(prev => ({ ...prev, ...initialFilters }));
  }, [initialFilters]);

  const updateFilter = <K extends keyof ApiSearchFilters>(
    key: K,
    value: ApiSearchFilters[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSearch = () => {
    onSearch({ ...filters, page: 1 });
  };

  const clearFilters = () => {
    const clearedFilters: ApiSearchFilters = {
      query: '',
      language: '',
      minStars: undefined,
      maxStars: undefined,
      minForks: undefined,
      maxForks: undefined,
      lastCommitBefore: undefined,
      lastCommitAfter: undefined,
      hasIssues: undefined,
      hasWiki: undefined,
      hasPages: undefined,
      archived: undefined,
      fork: undefined,
      sort: 'stars',
      order: 'desc',
      perPage: 20,
      page: 1,
    };
    setFilters(clearedFilters);
    onSearch(clearedFilters);
  };

  const languageOptions = [
    { value: '', label: 'All Languages' },
    { value: 'JavaScript', label: 'JavaScript' },
    { value: 'TypeScript', label: 'TypeScript' },
    { value: 'Python', label: 'Python' },
    { value: 'Java', label: 'Java' },
    { value: 'Go', label: 'Go' },
    { value: 'Rust', label: 'Rust' },
    { value: 'C++', label: 'C++' },
    { value: 'C#', label: 'C#' },
    { value: 'PHP', label: 'PHP' },
    { value: 'Ruby', label: 'Ruby' },
    { value: 'Swift', label: 'Swift' },
    { value: 'Kotlin', label: 'Kotlin' },
    { value: 'Dart', label: 'Dart' },
    { value: 'Shell', label: 'Shell' },
  ];

  const sortOptions = [
    { value: 'stars', label: 'Stars' },
    { value: 'forks', label: 'Forks' },
    { value: 'updated', label: 'Recently updated' },
    { value: 'created', label: 'Recently created' },
  ];

  const orderOptions = [
    { value: 'desc', label: 'Descending' },
    { value: 'asc', label: 'Ascending' },
  ];

  const getLastCommitDate = (period: string): Date => {
    const now = new Date();
    switch (period) {
      case '1w':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '1m':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '3m':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '6m':
        return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return now;
    }
  };

  const handleLastCommitChange = (period: string) => {
    if (period === '') {
      updateFilter('lastCommitBefore', undefined);
    } else {
      updateFilter('lastCommitBefore', getLastCommitDate(period));
    }
  };

  const hasActiveFilters = Boolean(
    filters.language ||
    filters.minStars ||
    filters.maxStars ||
    filters.minForks ||
    filters.maxForks ||
    filters.lastCommitBefore ||
    filters.hasIssues ||
    filters.hasWiki ||
    filters.hasPages ||
    filters.archived !== undefined ||
    filters.fork !== undefined
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search repositories by name, description, or topic..."
          value={filters.query || ''}
          onChange={(e) => updateFilter('query', e.target.value)}
          className="pl-10"
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
      </div>

      {/* Basic Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Select
          label="Language"
          options={languageOptions}
          value={filters.language || ''}
          onChange={(e) => updateFilter('language', e.target.value || undefined)}
        />

        <Input
          label="Min Stars"
          type="number"
          placeholder="e.g., 10"
          value={filters.minStars?.toString() || ''}
          onChange={(e) => updateFilter('minStars', e.target.value ? parseInt(e.target.value) : undefined)}
        />

        <Input
          label="Max Stars"
          type="number"
          placeholder="e.g., 10000"
          value={filters.maxStars?.toString() || ''}
          onChange={(e) => updateFilter('maxStars', e.target.value ? parseInt(e.target.value) : undefined)}
        />

        <Select
          label="Last Commit"
          options={[
            { value: '', label: 'Any time' },
            { value: '1w', label: 'Last week' },
            { value: '1m', label: 'Last month' },
            { value: '3m', label: 'Last 3 months' },
            { value: '6m', label: 'Last 6 months' },
            { value: '1y', label: 'Last year' },
          ]}
          value=""
          onChange={(e) => handleLastCommitChange(e.target.value)}
        />
      </div>

      {/* Advanced Filters */}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center">
          <span>Advanced Filters</span>
          <svg className="ml-2 h-4 w-4 transform group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Min Forks"
              type="number"
              placeholder="e.g., 5"
              value={filters.minForks?.toString() || ''}
              onChange={(e) => updateFilter('minForks', e.target.value ? parseInt(e.target.value) : undefined)}
            />

            <Input
              label="Max Forks"
              type="number"
              placeholder="e.g., 1000"
              value={filters.maxForks?.toString() || ''}
              onChange={(e) => updateFilter('maxForks', e.target.value ? parseInt(e.target.value) : undefined)}
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Repository Type</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.fork === false}
                    onChange={(e) => updateFilter('fork', e.target.checked ? false : undefined)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Exclude forks</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.archived === false}
                    onChange={(e) => updateFilter('archived', e.target.checked ? false : undefined)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Exclude archived</span>
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.hasIssues === true}
                onChange={(e) => updateFilter('hasIssues', e.target.checked ? true : undefined)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Has issues</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.hasWiki === true}
                onChange={(e) => updateFilter('hasWiki', e.target.checked ? true : undefined)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Has wiki</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.hasPages === true}
                onChange={(e) => updateFilter('hasPages', e.target.checked ? true : undefined)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Has pages</span>
            </label>
          </div>
        </div>
      </details>

      {/* Sort Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Sort By"
          options={sortOptions}
          value={filters.sort || 'stars'}
          onChange={(e) => updateFilter('sort', e.target.value as any)}
        />

        <Select
          label="Sort Order"
          options={orderOptions}
          value={filters.order || 'desc'}
          onChange={(e) => updateFilter('order', e.target.value as 'asc' | 'desc')}
        />
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Active Filters:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.language && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <span>Language: {filters.language}</span>
                <button
                  type="button"
                  onClick={() => updateFilter('language', undefined)}
                  className="ml-1 hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {filters.minStars && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <span>Min Stars: {filters.minStars}</span>
                <button
                  type="button"
                  onClick={() => updateFilter('minStars', undefined)}
                  className="ml-1 hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {filters.maxStars && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <span>Max Stars: {filters.maxStars}</span>
                <button
                  type="button"
                  onClick={() => updateFilter('maxStars', undefined)}
                  className="ml-1 hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={clearFilters}
          disabled={!hasActiveFilters}
          className="flex items-center space-x-2"
        >
          <X className="w-4 h-4" />
          <span>Clear Filters</span>
        </Button>

        <Button
          onClick={handleSearch}
          disabled={loading}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
        >
          <Search className="w-4 h-4" />
          <span>{loading ? 'Searching...' : 'Search Repositories'}</span>
        </Button>
      </div>
    </div>
  );
};
