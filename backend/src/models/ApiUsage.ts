import mongoose, { Document, Schema } from 'mongoose';

export interface IApiUsage extends Document {
  _id: string;
  userId: string;
  endpoint: string;
  method: string;
  timestamp: Date;
  rateLimitInfo: {
    remaining: number;
    reset: Date;
    limit: number;
  };
  responseTime: number;
  success: boolean;
  statusCode?: number;
  error?: string;
  userAgent?: string;
  ipAddress?: string;
}

const apiUsageSchema = new Schema<IApiUsage>({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  endpoint: {
    type: String,
    required: true,
    index: true,
  },
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  rateLimitInfo: {
    remaining: {
      type: Number,
      required: true,
    },
    reset: {
      type: Date,
      required: true,
    },
    limit: {
      type: Number,
      required: true,
    },
  },
  responseTime: {
    type: Number,
    required: true,
  },
  success: {
    type: Boolean,
    required: true,
    index: true,
  },
  statusCode: {
    type: Number,
  },
  error: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  ipAddress: {
    type: String,
  },
}, {
  timestamps: false, // We use our own timestamp field
  toJSON: {
    transform: function(doc: any, ret: any) {
      delete ret.__v;
      return ret;
    },
  },
});

// Compound indexes for analytics
apiUsageSchema.index({ userId: 1, timestamp: -1 });
apiUsageSchema.index({ endpoint: 1, timestamp: -1 });
apiUsageSchema.index({ success: 1, timestamp: -1 });

// TTL index to automatically delete old records after 30 days
apiUsageSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const ApiUsage = mongoose.model<IApiUsage>('ApiUsage', apiUsageSchema);

// Discovery Job model for tracking long-running discovery operations
export interface IDiscoveryJob extends Document {
  _id: string;
  userId: string;
  name: string;
  filters: any; // RepositorySearchFilters
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: {
    current: number;
    total: number;
    percentage: number;
    stage: string;
  };
  results: {
    found: number;
    analyzed: number;
    highPotential: number;
    repositories: string[]; // Repository IDs
  };
  settings: {
    maxResults: number;
    analysisDepth: 'basic' | 'detailed' | 'comprehensive';
    includeArchived: boolean;
    includeForks: boolean;
  };
  startedAt: Date;
  completedAt?: Date;
  estimatedCompletionAt?: Date;
  error?: string;
  logs: Array<{
    timestamp: Date;
    level: 'info' | 'warn' | 'error';
    message: string;
    data?: any;
  }>;
}

const discoveryJobSchema = new Schema<IDiscoveryJob>({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  filters: {
    type: Schema.Types.Mixed,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true,
  },
  progress: {
    current: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    stage: {
      type: String,
      default: 'initializing',
    },
  },
  results: {
    found: {
      type: Number,
      default: 0,
    },
    analyzed: {
      type: Number,
      default: 0,
    },
    highPotential: {
      type: Number,
      default: 0,
    },
    repositories: [{
      type: Schema.Types.ObjectId,
      ref: 'Repository',
    }],
  },
  settings: {
    maxResults: {
      type: Number,
      default: 1000,
      max: 10000,
    },
    analysisDepth: {
      type: String,
      enum: ['basic', 'detailed', 'comprehensive'],
      default: 'basic',
    },
    includeArchived: {
      type: Boolean,
      default: false,
    },
    includeForks: {
      type: Boolean,
      default: false,
    },
  },
  startedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  completedAt: {
    type: Date,
  },
  estimatedCompletionAt: {
    type: Date,
  },
  error: {
    type: String,
  },
  logs: [{
    timestamp: {
      type: Date,
      default: Date.now,
    },
    level: {
      type: String,
      enum: ['info', 'warn', 'error'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
    },
  }],
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
discoveryJobSchema.index({ userId: 1, status: 1, startedAt: -1 });
discoveryJobSchema.index({ status: 1, startedAt: -1 });

export const DiscoveryJob = mongoose.model<IDiscoveryJob>('DiscoveryJob', discoveryJobSchema);
