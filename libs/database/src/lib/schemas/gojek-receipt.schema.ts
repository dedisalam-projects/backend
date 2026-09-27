import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GojekReceiptDocument = GojekReceipt & Document;

@Schema({ _id: false })
export class GojekTripPoint {
  @Prop({ required: true }) date!: string;
  @Prop({ required: true }) time!: string;
  @Prop({ required: true }) placeName!: string;
  @Prop({ required: true }) address!: string;
}

@Schema({ _id: false })
export class GojekPaymentRow {
  @Prop({ required: true }) item!: string;
  @Prop({ required: true }) amount!: number;
}

@Schema({ timestamps: true, collection: 'receipts_gojek' })
export class GojekReceipt {
  @Prop({
    required: true,
    enum: ['gocar', 'gocar-hemat', 'goride', 'goride-comfort', 'goride-hemat'],
    index: true,
  })
  serviceType!: string;

  @Prop({ required: true, unique: true, index: true })
  orderId!: string;

  @Prop({ required: true })
  transactionDate!: string;

  @Prop({ required: true })
  customerName!: string;

  @Prop({ required: true })
  driverName!: string;

  @Prop({ required: true })
  vehiclePlate!: string;

  @Prop({ required: true })
  vehicleType!: string;

  @Prop({ required: true })
  distance!: string;

  @Prop({ required: true })
  duration!: string;

  @Prop({ type: GojekTripPoint, required: true })
  pickup!: GojekTripPoint;

  @Prop({ type: GojekTripPoint, required: true })
  destination!: GojekTripPoint;

  @Prop({ type: [GojekPaymentRow], default: [] })
  paymentRows!: GojekPaymentRow[];

  @Prop({ required: true, default: 0 })
  totalPaid!: number;

  @Prop({ default: 'draft', enum: ['draft', 'generated'] })
  status!: string;

  @Prop()
  lastGeneratedAt?: Date;
}

export const GojekReceiptSchema = SchemaFactory.createForClass(GojekReceipt);
GojekReceiptSchema.index({ serviceType: 1, createdAt: -1 });
