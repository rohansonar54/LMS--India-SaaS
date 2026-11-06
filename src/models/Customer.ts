import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICustomer extends Document {
  fullname: string;
  address: string;
  contact: string;
  locationId?: mongoose.Types.ObjectId;
  locationName?: string;
  outstandingBalance: number;
  createdAt: Date;
}

const CustomerSchema = new Schema<ICustomer>({
  fullname: { type: String, required: true, trim: true },
  address: { type: String, default: '' },
  contact: { type: String, required: true, trim: true },
  locationId: { type: Schema.Types.ObjectId, ref: 'Location', default: null, index: true },
  locationName: { type: String, default: '' },
  outstandingBalance: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export const Customer: Model<ICustomer> =
  mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);
