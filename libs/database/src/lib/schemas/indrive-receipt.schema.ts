import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type IndriveReceiptDocument = IndriveReceipt & Document;

@Schema({ _id: false })
export class IndrivePoint {
  @Prop({ required: true }) location!: string;
  @Prop({ required: true }) time!: string;
}

@Schema({ timestamps: true, collection: 'receipts_indrive' })
export class IndriveReceipt {
  @Prop({ required: true, enum: ['indrive-mobil', 'indrive-motor'], index: true })
  serviceType!: string;

  @Prop({ required: true, unique: true, index: true })
  invoiceNumber!: string;

  @Prop({ required: true })
  recipientName!: string;

  @Prop({ default: 'Perjalanan dalam kota' })
  orderType!: string;

  @Prop({ required: true })
  driverName!: string;

  @Prop({ required: true })
  vehicleDetail!: string;

  @Prop({ required: true })
  tripDate!: string;

  @Prop({ required: true })
  invoiceDate!: string;

  @Prop({ type: IndrivePoint, required: true })
  pickup!: IndrivePoint;

  @Prop({ type: IndrivePoint, required: true })
  dropoff!: IndrivePoint;

  @Prop({ required: true })
  distance!: string;

  @Prop({ default: 'Tarif perjalanan (termasuk pajak)' })
  description!: string;

  @Prop({ required: true, default: 0 })
  fare!: number;

  @Prop({ default: 'Tunai' })
  paymentMethod!: string;

  @Prop({ default: 'draft', enum: ['draft', 'generated'] })
  status!: string;

  @Prop()
  lastGeneratedAt?: Date;
}

export const IndriveReceiptSchema = SchemaFactory.createForClass(IndriveReceipt);
IndriveReceiptSchema.index({ serviceType: 1, createdAt: -1 });
