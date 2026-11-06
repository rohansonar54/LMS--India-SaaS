import mongoose, { Schema, Document, Model } from 'mongoose';

// Legacy weight-based laundry item (preserved for full backward compatibility)
export interface ILaundryItem {
  typeId?: mongoose.Types.ObjectId;
  typeName: string;
  unit: string;
  pricePerUnit: number;
  kilo: number;
  subtotal: number;
}

// Modern item-based laundry item row
export interface IOrderItem {
  itemId?: mongoose.Types.ObjectId;
  itemName: string;
  serviceName: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
  notes?: string;
}

export interface ISupplyUsed {
  supplyId: mongoose.Types.ObjectId;
  supplyName: string;
  unit: string;
  qty: number;
}

export interface IStatusHistoryItem {
  status: string;
  timestamp: Date;
  staffName: string;
  notes?: string;
}

export interface IOrderTimeline {
  pendingAt: Date;
  processingAt?: Date;
  washingDryingAt?: Date;
  washingAt?: Date;
  dryingAt?: Date;
  ironingAt?: Date;
  dryCleaningAt?: Date;
  foldingAt?: Date;
  doneAt?: Date;
  claimedAt?: Date;
}

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'washing_drying'
  | 'washing'
  | 'drying'
  | 'ironing'
  | 'dry_cleaning'
  | 'folding'
  | 'done'
  | 'claimed'
  | 'cancelled';

export type PaymentStatus = 'paid' | 'partial' | 'unpaid';

export interface IOrder extends Document {
  orderNumber: string;
  trackingToken?: string;
  locationId?: mongoose.Types.ObjectId;
  locationName?: string;
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  customerContact: string;
  customerAddress: string;
  userId?: mongoose.Types.ObjectId;
  staffName: string;
  pricingType: 'item' | 'weight';
  orderItems: IOrderItem[];
  items: ILaundryItem[]; // backward compatibility
  supplies: ISupplyUsed[];
  subtotal: number;
  additionalCharges: number;
  discount: number;
  total: number;
  amountPaid: number;
  balance: number;
  change: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  status: OrderStatus;
  activeWorkflowSteps: string[];
  expectedDeliveryDate?: Date;
  timeline: IOrderTimeline;
  statusHistory: IStatusHistoryItem[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
  itemId: { type: Schema.Types.ObjectId, ref: 'ClothingItem' },
  itemName: { type: String, required: true },
  serviceName: { type: String, required: true, default: 'Wash & Iron' },
  qty: { type: Number, required: true, default: 1, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  subtotal: { type: Number, required: true, min: 0 },
  notes: { type: String, default: '' },
});

const LaundryItemSchema = new Schema<ILaundryItem>({
  typeId: { type: Schema.Types.ObjectId, ref: 'Price' },
  typeName: { type: String, required: true },
  unit: { type: String, default: 'kg' },
  pricePerUnit: { type: Number, required: true },
  kilo: { type: Number, required: true },
  subtotal: { type: Number, required: true },
});

const SupplyUsedSchema = new Schema<ISupplyUsed>({
  supplyId: { type: Schema.Types.ObjectId, ref: 'Supply' },
  supplyName: { type: String, required: true },
  unit: { type: String, default: 'pcs' },
  qty: { type: Number, required: true, default: 1 },
});

const StatusHistorySchema = new Schema<IStatusHistoryItem>({
  status: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  staffName: { type: String, default: 'Staff' },
  notes: { type: String, default: '' },
});

const TimelineSchema = new Schema<IOrderTimeline>({
  pendingAt: { type: Date, default: Date.now },
  processingAt: { type: Date },
  washingDryingAt: { type: Date },
  washingAt: { type: Date },
  dryingAt: { type: Date },
  ironingAt: { type: Date },
  dryCleaningAt: { type: Date },
  foldingAt: { type: Date },
  doneAt: { type: Date },
  claimedAt: { type: Date },
});

const OrderSchema = new Schema<IOrder>({
  orderNumber: { type: String, required: true, unique: true, index: true },
  trackingToken: { type: String, unique: true, sparse: true, index: true },
  locationId: { type: Schema.Types.ObjectId, ref: 'Location', default: null, index: true },
  locationName: { type: String, default: '' },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  customerName: { type: String, required: true },
  customerContact: { type: String, default: '' },
  customerAddress: { type: String, default: '' },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  staffName: { type: String, default: 'Staff' },
  pricingType: { type: String, enum: ['item', 'weight'], default: 'item' },
  orderItems: [OrderItemSchema],
  items: [LaundryItemSchema],
  supplies: [SupplyUsedSchema],
  subtotal: { type: Number, default: 0 },
  additionalCharges: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true, default: 0 },
  amountPaid: { type: Number, required: true, default: 0 },
  balance: { type: Number, default: 0 },
  change: { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    enum: ['paid', 'partial', 'unpaid'],
    default: 'paid',
  },
  paymentMethod: { type: String, default: 'Cash' },
  status: {
    type: String,
    enum: [
      'pending',
      'processing',
      'washing_drying',
      'washing',
      'drying',
      'ironing',
      'dry_cleaning',
      'folding',
      'done',
      'claimed',
      'cancelled',
    ],
    default: 'pending',
    index: true,
  },
  activeWorkflowSteps: {
    type: [String],
    default: ['pending', 'processing', 'washing_drying', 'folding', 'done', 'claimed'],
  },
  expectedDeliveryDate: { type: Date },
  timeline: { type: TimelineSchema, default: () => ({ pendingAt: new Date() }) },
  statusHistory: [StatusHistorySchema],
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

export const Order: Model<IOrder> = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);
