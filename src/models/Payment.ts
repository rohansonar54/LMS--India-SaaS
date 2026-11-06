import mongoose, { Schema, Document, Model } from 'mongoose';

export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Net Banking' | 'Other';

export interface IPayment extends Document {
  orderId: mongoose.Types.ObjectId;
  orderNumber: string;
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  locationId?: mongoose.Types.ObjectId;
  locationName?: string;
  amount: number;
  method: PaymentMethod;
  referenceNumber?: string;
  staffId?: mongoose.Types.ObjectId;
  staffName: string;
  notes?: string;
  isAdvance: boolean;
  createdAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  orderNumber: { type: String, required: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  customerName: { type: String, required: true },
  locationId: { type: Schema.Types.ObjectId, ref: 'Location', index: true },
  locationName: { type: String, default: '' },
  amount: { type: Number, required: true, min: 0 },
  method: {
    type: String,
    enum: ['Cash', 'UPI', 'Card', 'Net Banking', 'Other'],
    default: 'Cash',
  },
  referenceNumber: { type: String, default: '' },
  staffId: { type: Schema.Types.ObjectId, ref: 'User' },
  staffName: { type: String, default: 'Staff' },
  notes: { type: String, default: '' },
  isAdvance: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);

