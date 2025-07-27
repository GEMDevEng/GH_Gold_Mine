import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  User as UserIcon, 
  Settings, 
  LogOut, 
  Github, 
  MapPin, 
  Building, 
  Link as LinkIcon,
  Calendar,
  Users,
  GitFork,
  Star
} from 'lucide-react';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences'>('profile');

  if (!isOpen || !user) return null;

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">User Profile</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'profile'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'preferences'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Preferences
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* User Info */}
              <div className="flex items-start space-x-4">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-20 h-20 rounded-full border-4 border-gray-200"
                />
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900">{user.name}</h3>
                  <p className="text-gray-600">@{user.username}</p>
                  <p className="text-gray-600">{user.email}</p>
                  {user.bio && (
                    <p className="text-gray-700 mt-2">{user.bio}</p>
                  )}
                </div>
              </div>

              {/* GitHub Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <GitFork className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                  <div className="text-lg font-semibold text-gray-900">{user.publicRepos}</div>
                  <div className="text-sm text-gray-600">Repositories</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Users className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                  <div className="text-lg font-semibold text-gray-900">{user.followers}</div>
                  <div className="text-sm text-gray-600">Followers</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Star className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                  <div className="text-lg font-semibold text-gray-900">{user.following}</div>
                  <div className="text-sm text-gray-600">Following</div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="space-y-3">
                {user.location && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{user.location}</span>
                  </div>
                )}
                {user.company && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Building className="w-4 h-4" />
                    <span>{user.company}</span>
                  </div>
                )}
                {user.blog && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <LinkIcon className="w-4 h-4" />
                    <a
                      href={user.blog}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {user.blog}
                    </a>
                  </div>
                )}
                <div className="flex items-center space-x-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {new Date(user.githubCreatedAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Subscription Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Subscription</h4>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Plan:</span>
                  <span className={`px-2 py-1 rounded text-sm font-medium ${
                    user.subscription.plan === 'free' 
                      ? 'bg-gray-200 text-gray-800'
                      : user.subscription.plan === 'pro'
                      ? 'bg-blue-200 text-blue-800'
                      : 'bg-purple-200 text-purple-800'
                  }`}>
                    {user.subscription.plan.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Usage Stats */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Usage This Month</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">API Calls:</span>
                    <span className="font-medium">{user.usage.apiCalls}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Analyses Run:</span>
                    <span className="font-medium">{user.usage.analysesRun}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Projects Discovered:</span>
                    <span className="font-medium">{user.usage.projectsDiscovered}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Notifications</h4>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={user.preferences.emailNotifications}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      readOnly
                    />
                    <span className="ml-2 text-gray-700">Email notifications</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={user.preferences.analysisAlerts}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      readOnly
                    />
                    <span className="ml-2 text-gray-700">Analysis completion alerts</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={user.preferences.weeklyDigest}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      readOnly
                    />
                    <span className="ml-2 text-gray-700">Weekly digest</span>
                  </label>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Theme</h4>
                <select
                  value={user.preferences.theme}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex justify-between">
            <a
              href={`https://github.com/${user.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>View on GitHub</span>
            </a>
            <button
              onClick={handleLogout}
              className="inline-flex items-center space-x-2 text-red-600 hover:text-red-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
