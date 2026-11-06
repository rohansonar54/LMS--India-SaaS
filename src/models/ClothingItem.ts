import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IItemServiceRate {
  serviceName: string; // e.g. 'Wash & Iron', 'Iron Only', 'Wash & Fold', 'Dry Clean'
  price: number;       // in INR (₹)
}

export interface IClothingItem extends Document {
  name: string;        // e.g. 'Shirt', 'T-Shirt', 'Saree', 'Jeans', 'Bedsheet'
  category: string;    // 'Men' | 'Women' | 'Household' | 'Special' | 'Other'
  icon?: string;
  defaultService: string;
  services: IItemServiceRate[];
  active: boolean;
  locationId?: mongoose.Types.ObjectId; // null = global, or specific to location
  createdAt: Date;
}

const ItemServiceRateSchema = new Schema<IItemServiceRate>({
  serviceName: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
});

const ClothingItemSchema = new Schema<IClothingItem>({
  name: { type: String, required: true, trim: true },
  category: { type: String, default: 'General' },
  icon: { type: String, default: '👕' },
  defaultService: { type: String, default: 'Wash & Iron' },
  services: [ItemServiceRateSchema],
  active: { type: Boolean, default: true },
  locationId: { type: Schema.Types.ObjectId, ref: 'Location', default: null },
  createdAt: { type: Date, default: Date.now },
});

export const ClothingItem: Model<IClothingItem> =
  mongoose.models.ClothingItem || mongoose.model<IClothingItem>('ClothingItem', ClothingItemSchema);

