import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon,
  ClockIcon,
  CpuChipIcon,
  ServerIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Progress } from './ui/Progress';
import apiService from '../services/api';

interface PerformanceStats {
  timeWindow: number;
  general: {
    count: number;
    average: number;
    median: number;
    min: number;
    max: number;
    p95: number;
  };
  analysis: {
    count: number;
    successRate: number;
    averageDuration: number;
    medianDuration: number;
    p95Duration: number;
    averageGithubCalls: number;
    averageDbQueries: number;
  };
  database: {
    count: number;
    averageDuration: number;
    medianDuration: number;
    p95Duration: number;
    slowQueries: number;
    collectionStats: Array<{
      collection: string;
      count: number;
      averageDuration: number;
    }>;
  };
  api: {
    count: number;
    averageDuration: number;
    medianDuration: number;
    p95Duration: number;
    slowRequests: number;
    endpointStats: Array<{
      endpoint: string;
      count: number;
      averageDuration: number;
    }>;
    statusCodeDistribution: Record<string, any[]>;
  };
  system: {
    memory: {
      heapUsed: number;
      heapTotal: number;
      external: number;
      rss: number;
    };
    cpu: {
      user: number;
      system: number;
    };
    uptime: number;
  };
}

interface Alert {
  type: 'warning' | 'error';
  category: string;
  message: string;
  threshold: number;
  current: number;
}

const PerformanceMonitor: React.FC = () => {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState(3600000); // 1 hour

  useEffect(() => {
    loadPerformanceData();
    const interval = setInterval(loadPerformanceData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [timeWindow]);

  const loadPerformanceData = async () => {
    try {
      setError(null);
      
      const [statsResponse, alertsResponse] = await Promise.allSettled([
        apiService.getPerformanceMetrics(timeWindow),
        apiService.getPerformanceAlerts()
      ]);

      if (statsResponse.status === 'fulfilled') {
        setStats(statsResponse.value);
      }

      if (alertsResponse.status === 'fulfilled') {
        setAlerts(alertsResponse.value.alerts || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatMemory = (bytes: number): string => {
    return `${Math.round(bytes)}MB`;
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getAlertColor = (type: string): 'warning' | 'destructive' => {
    return type === 'error' ? 'destructive' : 'warning';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Performance Data</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={loadPerformanceData}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <div className="text-center">
          <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Performance Data</h3>
          <p className="text-gray-500">Performance monitoring data will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Performance Monitor</h2>
        <div className="flex items-center space-x-4">
          <select
            value={timeWindow}
            onChange={(e) => setTimeWindow(parseInt(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value={900000}>Last 15 minutes</option>
            <option value={3600000}>Last hour</option>
            <option value={21600000}>Last 6 hours</option>
            <option value={86400000}>Last 24 hours</option>
          </select>
          <Button onClick={loadPerformanceData} size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-orange-500" />
              Performance Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge variant={getAlertColor(alert.type)}>
                      {alert.type.toUpperCase()}
                    </Badge>
                    <span className="text-sm">{alert.message}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {alert.category}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ServerIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">System Uptime</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatUptime(stats.system.uptime)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CpuChipIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Memory Usage</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatMemory(stats.system.memory.heapUsed)}
                </p>
                <p className="text-xs text-gray-500">
                  of {formatMemory(stats.system.memory.heapTotal)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Analysis Success Rate</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.analysis.successRate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">
                  {stats.analysis.count} analyses
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Analysis Time</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatDuration(stats.analysis.averageDuration)}
                </p>
                <p className="text-xs text-gray-500">
                  P95: {formatDuration(stats.analysis.p95Duration)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Analysis Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Analysis Engine Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Success Rate</span>
                  <span className="text-sm text-gray-500">
                    {stats.analysis.successRate.toFixed(1)}%
                  </span>
                </div>
                <Progress value={stats.analysis.successRate} />
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Average Duration:</span>
                  <div className="font-medium">{formatDuration(stats.analysis.averageDuration)}</div>
                </div>
                <div>
                  <span className="text-gray-500">Median Duration:</span>
                  <div className="font-medium">{formatDuration(stats.analysis.medianDuration)}</div>
                </div>
                <div>
                  <span className="text-gray-500">GitHub API Calls:</span>
                  <div className="font-medium">{stats.analysis.averageGithubCalls.toFixed(1)}</div>
                </div>
                <div>
                  <span className="text-gray-500">DB Queries:</span>
                  <div className="font-medium">{stats.analysis.averageDbQueries.toFixed(1)}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Performance */}
        <Card>
          <CardHeader>
            <CardTitle>API Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Total Requests:</span>
                  <div className="font-medium">{stats.api.count.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-gray-500">Slow Requests:</span>
                  <div className="font-medium">{stats.api.slowRequests}</div>
                </div>
                <div>
                  <span className="text-gray-500">Average Response:</span>
                  <div className="font-medium">{formatDuration(stats.api.averageDuration)}</div>
                </div>
                <div>
                  <span className="text-gray-500">P95 Response:</span>
                  <div className="font-medium">{formatDuration(stats.api.p95Duration)}</div>
                </div>
              </div>

              {stats.api.endpointStats.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Top Endpoints</h4>
                  <div className="space-y-1">
                    {stats.api.endpointStats.slice(0, 5).map((endpoint, index) => (
                      <div key={index} className="flex justify-between text-xs">
                        <span className="truncate">{endpoint.endpoint}</span>
                        <span>{formatDuration(endpoint.averageDuration)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PerformanceMonitor;
