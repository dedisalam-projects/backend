import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TravelokaReceiptDocument = TravelokaReceipt & Document;

@Schema({ _id: false })
export class TravelokaCustomer {
  @Prop({ required: true }) name!: string;
  @Prop({ required: true }) email!: string;
  @Prop({ required: true }) phone!: string;
}

@Schema({ _id: false })
export class TravelokaHotelDetail {
  @Prop() hotelName?: string;
  @Prop() address?: string;
  @Prop() checkInDate?: string;
  @Prop() duration?: string;
}

@Schema({ _id: false })
export class TravelokaItem {
  @Prop({ required: true }) itemNo!: number;
  @Prop({ required: true }) itemType!: string;
  @Prop({ type: [String], default: [] }) descriptionLines!: string[];
  @Prop({ default: '' }) description!: string;
  @Prop({ default: 1 }) quantity!: number;
  @Prop({ required: true }) unitPrice!: number;
  @Prop({ required: true }) totalPrice!: number;
  @Prop({ default: 83.25 }) rowHeight!: number;
}

@Schema({ timestamps: true, collection: 'receipts_traveloka' })
export class TravelokaReceipt {
  @Prop({ required: true, enum: ['Tiket Bus & Shuttle', 'Hotel / Akomodasi'], index: true })
  category!: string;

  @Prop({ required: true, unique: true, index: true })
  receiptNo!: string;

  @Prop({ required: true })
  poNumber!: string;

  @Prop({ required: true })
  transactionDate!: string;

  @Prop({ required: true })
  paymentMethod!: string;

  @Prop({ default: 'Lunas' })
  paymentStatus!: string;

  @Prop({ type: TravelokaCustomer, required: true })
  customer!: TravelokaCustomer;

  @Prop({ default: '' })
  passengerName?: string;

  @Prop({ default: '' })
  guestName?: string;

  @Prop({ type: TravelokaHotelDetail })
  hotel?: TravelokaHotelDetail;

  @Prop({ type: [TravelokaItem], default: [] })
  items!: TravelokaItem[];

  @Prop({ required: true, default: 0 })
  totalAmount!: number;

  @Prop({ default: 'draft', enum: ['draft', 'generated'] })
  status!: string;

  @Prop()
  lastGeneratedAt?: Date;
}

export const TravelokaReceiptSchema = SchemaFactory.createForClass(TravelokaReceipt);
TravelokaReceiptSchema.index({ category: 1, createdAt: -1 });
