import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BrandDocument = Brand & Document;

@Schema({ timestamps: true, collection: 'brands' })
export class Brand {
  @Prop({ required: true, unique: true, index: true })
  code!: string; // slug / unique code, contoh: 'pop-mie'

  @Prop({ required: true, index: true })
  name!: string; // nama brand, contoh: 'POP MIE'

  @Prop({ default: true })
  isActive!: boolean;
}

export const BrandSchema = SchemaFactory.createForClass(Brand);
