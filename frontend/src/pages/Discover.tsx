import React from 'react';
import { PageLayout } from '../components/layout/PageLayout';

export const Discover: React.FC = () => {
  return (
    <PageLayout
      title="Discover Projects"
      description="Search and filter abandoned GitHub projects"
    >
      <div className="text-center py-12">
        <p className="text-gray-500">Discovery interface coming soon...</p>
      </div>
    </PageLayout>
  );
};
