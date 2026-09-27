import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type JackalReceiptDocument = JackalReceipt & Document;

@Schema({ _id: false })
export class JackalCustomer {
  @Prop({ required: true }) name!: string;
  @Prop({ default: '-' }) address!: string;
  @Prop({ required: true }) phone!: string;
  @Prop({ required: true }) email!: string;
  @Prop({ default: '' }) otp!: string;
}

@Schema({ _id: false })
export class JackalPoint {
  @Prop({ required: true }) point!: string;
  @Prop({ required: true }) address!: string;
  @Prop({ default: '' }) mapsUrl!: string;
  @Prop() date?: string;
  @Prop() time?: string;
}

@Schema({ _id: false })
export class JackalPassenger {
  @Prop({ default: '' }) qrCode!: string;
  @Prop({ required: true }) name!: string;
  @Prop({ required: true }) seat!: string;
  @Prop({ required: true }) route!: string;
  @Prop({ required: true }) schedule!: string;
}

@Schema({ _id: false })
export class JackalPayment {
  @Prop({ required: true }) totalPrice!: number;
  @Prop({ default: 0 }) adminFee!: number;
  @Prop({ default: 0 }) discount!: number;
  @Prop({ required: true }) totalPaid!: number;
  @Prop({ default: 'BCA VIRTUAL ACCOUNT' }) method!: string;
  @Prop({ required: true }) time!: string;
}

@Schema({ timestamps: true, collection: 'receipts_jackal' })
export class JackalReceipt {
  @Prop({ default: 'jackal-shuttle', index: true })
  serviceType!: string;

  @Prop({ required: true, unique: true, index: true })
  bookingCode!: string;

  @Prop({ required: true })
  bookingDate!: string;

  @Prop({ type: JackalCustomer, required: true })
  customer!: JackalCustomer;

  @Prop({ type: JackalPoint, required: true })
  departure!: JackalPoint;

  @Prop({ type: JackalPoint, required: true })
  destination!: JackalPoint;

  @Prop({ type: [JackalPassenger], default: [] })
  passengers!: JackalPassenger[];

  @Prop({ type: JackalPayment, required: true })
  payment!: JackalPayment;

  @Prop({ default: 'draft', enum: ['draft', 'generated'] })
  status!: string;

  @Prop()
  lastGeneratedAt?: Date;
}

export const JackalReceiptSchema = SchemaFactory.createForClass(JackalReceipt);
JackalReceiptSchema.index({ bookingCode: 1, createdAt: -1 });
