import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IService extends Document {
  name: string;             // e.g. 'Wash & Iron', 'Iron Only', 'Dry Clean', 'Wash & Fold', 'Steam Press'
  code: string;             // unique identifier code
  defaultPrice: number;     // baseline default rate in ₹
  description?: string;
  category: string;         // 'Laundry' | 'Dry Cleaning' | 'Pressing' | 'Specialty'
  active: boolean;
  order: number;            // sorting order
  createdAt: Date;
}

const ServiceSchema = new Schema<IService>({
  name: { type: String, required: true, trim: true, unique: true },
  code: { type: String, trim: true },
  defaultPrice: { type: Number, required: true, min: 0, default: 25 },
  description: { type: String, trim: true, default: '' },
  category: { type: String, default: 'Laundry' },
  active: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export const Service: Model<IService> =
  mongoose.models.Service || mongoose.model<IService>('Service', ServiceSchema);
