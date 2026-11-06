import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPrice extends Document {
  name: string;
  unit: string;
  price: number;
  createdAt: Date;
}

const PriceSchema = new Schema<IPrice>({
  name: { type: String, required: true, trim: true },
  unit: { type: String, required: true, default: 'kg' },
  price: { type: Number, required: true, min: 0 },
  createdAt: { type: Date, default: Date.now },
});

export const Price: Model<IPrice> = mongoose.models.Price || mongoose.model<IPrice>('Price', PriceSchema);
