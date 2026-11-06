import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  username: string;
  password: string;
  name: string;
  level: number; // 0 = Admin, 1 = Staff
  locationId?: mongoose.Types.ObjectId;
  locationName?: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, required: true, default: 'Staff User' },
  level: { type: Number, default: 1 }, // 0: Admin, 1: Staff
  locationId: { type: Schema.Types.ObjectId, ref: 'Location', default: null },
  locationName: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
