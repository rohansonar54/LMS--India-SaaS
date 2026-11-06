import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILog extends Document {
  username: string;
  type: string;
  logs: string;
  locationId?: mongoose.Types.ObjectId;
  locationName?: string;
  createdAt: Date;
}

// 20 days retention policy in seconds: 20 * 24 * 60 * 60 = 1,728,000 seconds
export const LOG_RETENTION_DAYS = 20;
export const LOG_RETENTION_SECONDS = LOG_RETENTION_DAYS * 24 * 60 * 60; // 1,728,000s

const LogSchema = new Schema<ILog>({
  username: { type: String, required: true, default: 'System' },
  type: { type: String, required: true },
  logs: { type: String, required: true },
  locationId: { type: Schema.Types.ObjectId, ref: 'Location', default: null, index: true },
  locationName: { type: String, default: '' },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: LOG_RETENTION_SECONDS, // Native MongoDB TTL index: automatically deletes documents older than 20 days
  },
});

export const Log: Model<ILog> = mongoose.models.Log || mongoose.model<ILog>('Log', LogSchema);

/**
 * Automatically purges any logs older than 20 days from the database.
 * Returns the count of deleted old log records.
 */
export async function purgeOldLogs(): Promise<number> {
  const cutoffDate = new Date(Date.now() - LOG_RETENTION_SECONDS * 1000);
  const result = await Log.deleteMany({ createdAt: { $lt: cutoffDate } });
  return result.deletedCount || 0;
}
