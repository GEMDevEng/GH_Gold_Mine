import mongoose, { Document, Schema } from 'mongoose';
import { RepositoryMetrics, RepositoryActivity, RepositoryAnalysis } from '../types/github';

export interface IRepository extends Document {
  _id: string;
  githubId: number;
  fullName: string;
  name: string;
  description?: string;
  url: string;
  homepage?: string;
  owner: {
    login: string;
    type: 'User' | 'Organization';
    avatar: string;
    url: string;
    githubId: number;
  };
  metrics: RepositoryMetrics;
  activity: RepositoryActivity;
  quality: {
    hasReadme: boolean;
    hasLicense: boolean;
    hasContributing: boolean;
    hasCodeOfConduct: boolean;
    hasIssueTemplate: boolean;
    hasPrTemplate: boolean;
    documentationScore: number;
    codeQualityScore: number;
  };
  revival: {
    potentialScore: number;
    reasons: string[];
    concerns: string[];
    recommendation: 'high' | 'medium' | 'low' | 'not-recommended';
  };
  analysis?: RepositoryAnalysis; // New analysis engine results
  tags: string[];
  isArchived: boolean;
  isFork: boolean;
  isPrivate: boolean;
  defaultBranch: string;
  createdAt: Date;
  updatedAt: Date;
  analyzedAt: Date;
  lastSyncAt: Date;
  lastAnalyzedAt?: Date; // When analysis was last performed
}

const repositorySchema = new Schema<IRepository>({
  githubId: {
    type: Number,
    required: true,
    unique: true,
    index: true,
  },
  fullName: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    index: true,
  },
  description: {
    type: String,
    trim: true,
  },
  url: {
    type: String,
    required: true,
  },
  homepage: {
    type: String,
    trim: true,
  },
  owner: {
    login: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['User', 'Organization'],
      required: true,
    },
    avatar: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    githubId: {
      type: Number,
      required: true,
      index: true,
    },
  },
  metrics: {
    stars: {
      type: Number,
      default: 0,
      index: true,
    },
    forks: {
      type: Number,
      default: 0,
      index: true,
    },
    watchers: {
      type: Number,
      default: 0,
    },
    openIssues: {
      type: Number,
      default: 0,
    },
    size: {
      type: Number,
      default: 0,
    },
    lastCommitDate: {
      type: Date,
      required: true,
      index: true,
    },
    lastReleaseDate: {
      type: Date,
    },
    contributorCount: {
      type: Number,
      default: 0,
    },
    commitCount: {
      type: Number,
      default: 0,
    },
    branchCount: {
      type: Number,
      default: 0,
    },
    releaseCount: {
      type: Number,
      default: 0,
    },
    issueCount: {
      type: Number,
      default: 0,
    },
    pullRequestCount: {
      type: Number,
      default: 0,
    },
    languages: {
      type: Map,
      of: Number,
      default: {},
    },
    license: {
      type: String,
      index: true,
    },
    topics: [{
      type: String,
      index: true,
    }],
  },
  activity: {
    commitFrequency: {
      type: Number,
      default: 0,
    },
    issueActivity: {
      type: Number,
      default: 0,
    },
    prActivity: {
      type: Number,
      default: 0,
    },
    contributorActivity: {
      type: Number,
      default: 0,
    },
    lastActivity: {
      type: Date,
      required: true,
      index: true,
    },
    activityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true,
    },
  },
  quality: {
    hasReadme: {
      type: Boolean,
      default: false,
    },
    hasLicense: {
      type: Boolean,
      default: false,
    },
    hasContributing: {
      type: Boolean,
      default: false,
    },
    hasCodeOfConduct: {
      type: Boolean,
      default: false,
    },
    hasIssueTemplate: {
      type: Boolean,
      default: false,
    },
    hasPrTemplate: {
      type: Boolean,
      default: false,
    },
    documentationScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true,
    },
    codeQualityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true,
    },
  },
  revival: {
    potentialScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true,
    },
    reasons: [{
      type: String,
    }],
    concerns: [{
      type: String,
    }],
    recommendation: {
      type: String,
      enum: ['high', 'medium', 'low', 'not-recommended'],
      default: 'not-recommended',
      index: true,
    },
  },
  tags: [{
    type: String,
    index: true,
  }],
  isArchived: {
    type: Boolean,
    default: false,
    index: true,
  },
  isFork: {
    type: Boolean,
    default: false,
    index: true,
  },
  isPrivate: {
    type: Boolean,
    default: false,
    index: true,
  },
  defaultBranch: {
    type: String,
    default: 'main',
  },
  analyzedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  lastSyncAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  lastAnalyzedAt: {
    type: Date,
    index: true,
  },
  analysis: {
    type: Schema.Types.Mixed, // Store the full analysis object
    default: null,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc: any, ret: any) {
      delete ret.__v;
      return ret;
    },
  },
});

// Compound indexes for efficient queries
repositorySchema.index({ 'metrics.stars': -1, 'activity.lastActivity': -1 });
repositorySchema.index({ 'revival.potentialScore': -1, 'metrics.stars': -1 });
repositorySchema.index({ 'owner.login': 1, 'metrics.stars': -1 });
repositorySchema.index({ 'metrics.topics': 1, 'metrics.stars': -1 });
repositorySchema.index({ 'activity.activityScore': -1, 'quality.documentationScore': -1 });

// Text index for search
repositorySchema.index({
  fullName: 'text',
  description: 'text',
  'metrics.topics': 'text',
});

export const Repository = mongoose.model<IRepository>('Repository', repositorySchema);
