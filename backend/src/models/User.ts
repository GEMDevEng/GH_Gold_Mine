import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: string;
  githubId: string;
  username: string;
  email: string;
  name: string;
  avatar: string;
  bio?: string;
  location?: string;
  company?: string;
  blog?: string;
  publicRepos: number;
  followers: number;
  following: number;
  githubCreatedAt: Date;
  accessToken: string;
  refreshToken?: string;
  preferences: {
    emailNotifications: boolean;
    analysisAlerts: boolean;
    weeklyDigest: boolean;
    theme: 'light' | 'dark' | 'auto';
  };
  subscription: {
    plan: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'inactive' | 'cancelled';
    expiresAt?: Date;
  };
  usage: {
    apiCalls: number;
    analysesRun: number;
    projectsDiscovered: number;
    lastResetAt: Date;
  };
  isActive: boolean;
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  updateLastLogin(): Promise<IUser>;
  incrementUsage(type: 'apiCalls' | 'analysesRun' | 'projectsDiscovered'): Promise<IUser>;
  resetUsage(): Promise<IUser>;
}

const userSchema = new Schema<IUser>({
  githubId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  avatar: {
    type: String,
    required: true,
  },
  bio: {
    type: String,
    trim: true,
  },
  location: {
    type: String,
    trim: true,
  },
  company: {
    type: String,
    trim: true,
  },
  blog: {
    type: String,
    trim: true,
  },
  publicRepos: {
    type: Number,
    default: 0,
  },
  followers: {
    type: Number,
    default: 0,
  },
  following: {
    type: Number,
    default: 0,
  },
  githubCreatedAt: {
    type: Date,
    required: true,
  },
  accessToken: {
    type: String,
    required: true,
    select: false, // Don't include in queries by default
  },
  refreshToken: {
    type: String,
    select: false,
  },
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    analysisAlerts: {
      type: Boolean,
      default: true,
    },
    weeklyDigest: {
      type: Boolean,
      default: false,
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto',
    },
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled'],
      default: 'active',
    },
    expiresAt: {
      type: Date,
    },
  },
  usage: {
    apiCalls: {
      type: Number,
      default: 0,
    },
    analysesRun: {
      type: Number,
      default: 0,
    },
    projectsDiscovered: {
      type: Number,
      default: 0,
    },
    lastResetAt: {
      type: Date,
      default: Date.now,
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLoginAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc: any, ret: any) {
      delete ret.accessToken;
      delete ret.refreshToken;
      delete ret.__v;
      return ret;
    },
  },
});

// Indexes for performance
userSchema.index({ githubId: 1 });
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ 'subscription.plan': 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLoginAt: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return this.name;
});

// Method to compare passwords (for future use if we add password auth)
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  // For now, we only use GitHub OAuth, but this is here for future expansion
  return false;
};

// Pre-save middleware to hash passwords (for future use)
userSchema.pre('save', async function(next) {
  // For now, we only use GitHub OAuth
  next();
});

// Static method to find by GitHub ID
userSchema.statics.findByGithubId = function(githubId: string) {
  return this.findOne({ githubId, isActive: true });
};

// Static method to find by username
userSchema.statics.findByUsername = function(username: string) {
  return this.findOne({ username: username.toLowerCase(), isActive: true });
};

// Method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLoginAt = new Date();
  return this.save();
};

// Method to increment usage counters
userSchema.methods.incrementUsage = function(type: 'apiCalls' | 'analysesRun' | 'projectsDiscovered') {
  this.usage[type] += 1;
  return this.save();
};

// Method to reset usage counters (monthly)
userSchema.methods.resetUsage = function() {
  this.usage.apiCalls = 0;
  this.usage.analysesRun = 0;
  this.usage.projectsDiscovered = 0;
  this.usage.lastResetAt = new Date();
  return this.save();
};

export const User = mongoose.model<IUser>('User', userSchema);
