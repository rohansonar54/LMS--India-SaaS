import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISupply extends Document {
  name: string;
  unit: string;
  stock: number;
  cost: number;
  locationId?: mongoose.Types.ObjectId;
  locationName?: string;
  createdAt: Date;
}

const SupplySchema = new Schema<ISupply>({
  name: { type: String, required: true, trim: true },
  unit: { type: String, required: true, default: 'pcs' },
  stock: { type: Number, required: true, default: 0, min: 0 },
  cost: { type: Number, default: 0 },
  locationId: { type: Schema.Types.ObjectId, ref: 'Location', default: null, index: true },
  locationName: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

export const Supply: Model<ISupply> = mongoose.models.Supply || mongoose.model<ISupply>('Supply', SupplySchema);
