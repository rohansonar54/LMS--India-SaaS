import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILocation extends Document {
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  phone: string;
  email?: string;
  active: boolean;
  createdAt: Date;
}

const LocationSchema = new Schema<ILocation>({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  address: { type: String, default: '' },
  city: { type: String, default: 'Nashik' },
  state: { type: String, default: 'Maharashtra' },
  country: { type: String, default: 'India' },
  pincode: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  active: { type: Boolean, default: true, index: true },
  createdAt: { type: Date, default: Date.now },
});

export const Location: Model<ILocation> =
  mongoose.models.Location || mongoose.model<ILocation>('Location', LocationSchema);
