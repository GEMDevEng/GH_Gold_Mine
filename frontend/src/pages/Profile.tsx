import React from 'react';
import { PageLayout } from '../components/layout/PageLayout';

export const Profile: React.FC = () => {
  return (
    <PageLayout
      title="Profile"
      description="Manage your account and preferences"
    >
      <div className="text-center py-12">
        <p className="text-gray-500">Profile interface coming soon...</p>
      </div>
    </PageLayout>
  );
};
