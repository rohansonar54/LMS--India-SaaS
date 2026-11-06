import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IExpense extends Document {
  locationId: mongoose.Types.ObjectId;
  title: string;
  category: string; // e.g. 'Supplies', 'Rent', 'Utilities', 'Maintenance', 'Salaries', 'Other'
  amount: number;
  date: Date;
  recordedBy: string;
  notes?: string;
  createdAt: Date;
}

const ExpenseSchema = new Schema<IExpense>({
  locationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true, index: true },
  title: { type: String, required: true, trim: true },
  category: { type: String, default: 'Supplies' },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, default: Date.now },
  recordedBy: { type: String, default: 'Admin' },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

export const Expense: Model<IExpense> =
  mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);

