import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input, Select, Button, Badge } from '../ui';

export interface SearchFiltersState {
  query: string;
  language: string;
  minStars: string;
  maxStars: string;
  lastCommit: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface SearchFiltersProps {
  filters: SearchFiltersState;
  onFiltersChange: (filters: SearchFiltersState) => void;
  onSearch: () => void;
  onClearFilters: () => void;
  isLoading?: boolean;
  className?: string;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  onFiltersChange,
  onSearch,
  onClearFilters,
  isLoading = false,
  className = '',
}) => {
  const updateFilter = (key: keyof SearchFiltersState, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const languageOptions = [
    { value: '', label: 'All Languages' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'cpp', label: 'C++' },
    { value: 'csharp', label: 'C#' },
    { value: 'php', label: 'PHP' },
    { value: 'ruby', label: 'Ruby' },
  ];

  const lastCommitOptions = [
    { value: '', label: 'Any time' },
    { value: '1d', label: 'Last day' },
    { value: '1w', label: 'Last week' },
    { value: '1m', label: 'Last month' },
    { value: '3m', label: 'Last 3 months' },
    { value: '6m', label: 'Last 6 months' },
    { value: '1y', label: 'Last year' },
  ];

  const sortByOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'stars', label: 'Stars' },
    { value: 'forks', label: 'Forks' },
    { value: 'updated', label: 'Recently updated' },
    { value: 'created', label: 'Recently created' },
  ];

  const sortOrderOptions = [
    { value: 'desc', label: 'Descending' },
    { value: 'asc', label: 'Ascending' },
  ];

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'query' || key === 'sortBy' || key === 'sortOrder') return false;
    return value !== '';
  });

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      {/* Search Input */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search repositories..."
            value={filters.query}
            onChange={(e) => updateFilter('query', e.target.value)}
            className="pl-10"
            onKeyPress={(e) => e.key === 'Enter' && onSearch()}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Select
          label="Language"
          options={languageOptions}
          value={filters.language}
          onChange={(e) => updateFilter('language', e.target.value)}
          placeholder="Select language"
        />

        <Input
          label="Min Stars"
          type="number"
          placeholder="e.g., 100"
          value={filters.minStars}
          onChange={(e) => updateFilter('minStars', e.target.value)}
        />

        <Input
          label="Max Stars"
          type="number"
          placeholder="e.g., 10000"
          value={filters.maxStars}
          onChange={(e) => updateFilter('maxStars', e.target.value)}
        />

        <Select
          label="Last Commit"
          options={lastCommitOptions}
          value={filters.lastCommit}
          onChange={(e) => updateFilter('lastCommit', e.target.value)}
          placeholder="Select timeframe"
        />
      </div>

      {/* Sort Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Select
          label="Sort By"
          options={sortByOptions}
          value={filters.sortBy}
          onChange={(e) => updateFilter('sortBy', e.target.value)}
        />

        <Select
          label="Sort Order"
          options={sortOrderOptions}
          value={filters.sortOrder}
          onChange={(e) => updateFilter('sortOrder', e.target.value as 'asc' | 'desc')}
        />
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="mb-6">
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
                  onClick={() => updateFilter('language', '')}
                  className="ml-1 hover:text-red-600"
                  aria-label="Remove language filter"
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
                  onClick={() => updateFilter('minStars', '')}
                  className="ml-1 hover:text-red-600"
                  aria-label="Remove minimum stars filter"
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
                  onClick={() => updateFilter('maxStars', '')}
                  className="ml-1 hover:text-red-600"
                  aria-label="Remove maximum stars filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {filters.lastCommit && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <span>Last Commit: {lastCommitOptions.find(opt => opt.value === filters.lastCommit)?.label}</span>
                <button
                  type="button"
                  onClick={() => updateFilter('lastCommit', '')}
                  className="ml-1 hover:text-red-600"
                  aria-label="Remove last commit filter"
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
          onClick={onClearFilters}
          disabled={!hasActiveFilters}
          className="flex items-center space-x-2"
        >
          <X className="w-4 h-4" />
          <span>Clear Filters</span>
        </Button>

        <Button
          variant="primary"
          onClick={onSearch}
          loading={isLoading}
          className="flex items-center space-x-2"
        >
          <Search className="w-4 h-4" />
          <span>Search Projects</span>
        </Button>
      </div>
    </div>
  );
};
