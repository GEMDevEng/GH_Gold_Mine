import React from 'react';
import { Star, GitFork, Eye, Calendar, ExternalLink } from 'lucide-react';
import { Card, CardContent, Badge, Button } from '../ui';

export interface Project {
  id: string;
  name: string;
  fullName: string;
  description?: string;
  language?: string;
  stars: number;
  forks: number;
  watchers: number;
  lastCommit: string;
  createdAt: string;
  updatedAt: string;
  score: number;
  tags: string[];
  owner: {
    login: string;
    avatar: string;
  };
  url: string;
}

export interface ProjectCardProps {
  project: Project;
  onViewDetails?: (project: Project) => void;
  onAnalyze?: (project: Project) => void;
  className?: string;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onViewDetails,
  onAnalyze,
  className = '',
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    if (score >= 50) return 'secondary';
    return 'error';
  };

  return (
    <Card className={`hover:shadow-md transition-shadow duration-200 ${className}`}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <img
              src={project.owner.avatar}
              alt={project.owner.login}
              className="w-10 h-10 rounded-full flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {project.name}
              </h3>
              <p className="text-sm text-gray-500 truncate">
                {project.owner.login}
              </p>
            </div>
          </div>
          <Badge variant={getScoreColor(project.score) as any}>
            Score: {project.score}
          </Badge>
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {project.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center space-x-4 mb-4 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <Star className="w-4 h-4" />
            <span>{project.stars.toLocaleString()}</span>
          </div>
          <div className="flex items-center space-x-1">
            <GitFork className="w-4 h-4" />
            <span>{project.forks.toLocaleString()}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Eye className="w-4 h-4" />
            <span>{project.watchers.toLocaleString()}</span>
          </div>
          {project.language && (
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>{project.language}</span>
            </div>
          )}
        </div>

        {/* Last commit */}
        <div className="flex items-center space-x-1 text-sm text-gray-500 mb-4">
          <Calendar className="w-4 h-4" />
          <span>Last commit {formatDate(project.lastCommit)}</span>
        </div>

        {/* Tags */}
        {project.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {project.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {project.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{project.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-sm text-gray-500 hover:text-primary-600 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>View on GitHub</span>
          </a>
          <div className="flex items-center space-x-2">
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(project)}
              >
                View Details
              </Button>
            )}
            {onAnalyze && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onAnalyze(project)}
              >
                Analyze
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
