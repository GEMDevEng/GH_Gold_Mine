import mongoose, { Document, Schema } from 'mongoose';
import { RepositorySearchFilters } from '../types/github';

export interface ISearchResult extends Document {
  _id: string;
  userId: string;
  query: string;
  filters: RepositorySearchFilters;
  results: {
    totalCount: number;
    repositories: string[]; // Repository IDs
    page: number;
    perPage: number;
  };
  metadata: {
    searchTime: number; // milliseconds
    rateLimitUsed: number;
    cacheHit: boolean;
  };
  createdAt: Date;
  expiresAt: Date;
}

const searchResultSchema = new Schema<ISearchResult>({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  query: {
    type: String,
    required: true,
    trim: true,
  },
  filters: {
    query: String,
    language: String,
    minStars: Number,
    maxStars: Number,
    minForks: Number,
    maxForks: Number,
    lastCommitBefore: Date,
    lastCommitAfter: Date,
    hasIssues: Boolean,
    hasWiki: Boolean,
    hasPages: Boolean,
    archived: Boolean,
    fork: Boolean,
    sort: {
      type: String,
      enum: ['stars', 'forks', 'updated', 'created'],
    },
    order: {
      type: String,
      enum: ['asc', 'desc'],
    },
    perPage: Number,
    page: Number,
  },
  results: {
    totalCount: {
      type: Number,
      required: true,
    },
    repositories: [{
      type: Schema.Types.ObjectId,
      ref: 'Repository',
    }],
    page: {
      type: Number,
      required: true,
    },
    perPage: {
      type: Number,
      required: true,
    },
  },
  metadata: {
    searchTime: {
      type: Number,
      required: true,
    },
    rateLimitUsed: {
      type: Number,
      required: true,
    },
    cacheHit: {
      type: Boolean,
      default: false,
    },
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    index: { expireAfterSeconds: 0 },
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

// Indexes for efficient queries
searchResultSchema.index({ userId: 1, createdAt: -1 });
searchResultSchema.index({ query: 1, userId: 1 });

export const SearchResult = mongoose.model<ISearchResult>('SearchResult', searchResultSchema);
