import mongoose, { Document, Schema } from 'mongoose';

export interface IUserSession extends Document {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt?: Date;
  userAgent?: string;
  ipAddress?: string;
}

const UserSessionSchema = new Schema<IUserSession>({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastUsedAt: {
    type: Date,
  },
  userAgent: {
    type: String,
  },
  ipAddress: {
    type: String,
  },
}, {
  timestamps: true,
});

// Indexes for performance and cleanup
UserSessionSchema.index({ userId: 1, expiresAt: 1 });
UserSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for automatic cleanup

// Static methods
UserSessionSchema.statics.findValidSession = function(userId: string, tokenHash: string) {
  return this.findOne({
    userId,
    tokenHash,
    expiresAt: { $gt: new Date() },
  });
};

UserSessionSchema.statics.cleanupExpiredSessions = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() },
  });
};

UserSessionSchema.statics.revokeUserSessions = function(userId: string) {
  return this.deleteMany({ userId });
};

// Instance methods
UserSessionSchema.methods.updateLastUsed = function() {
  this.lastUsedAt = new Date();
  return this.save();
};

UserSessionSchema.methods.isExpired = function() {
  return this.expiresAt < new Date();
};

export const UserSession = mongoose.model<IUserSession>('UserSession', UserSessionSchema);
export default UserSession;
