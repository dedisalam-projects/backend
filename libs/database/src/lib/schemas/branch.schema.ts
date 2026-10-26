import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BranchDocument = Branch & Document;

@Schema({ timestamps: true, collection: 'branches' })
export class Branch {
  @Prop({ required: true, unique: true, index: true })
  code!: string; // kode_igr, contoh '04'

  @Prop({ required: true, index: true })
  name!: string; // contoh 'INDOGROSIR BANDUNG'

  @Prop({ default: '' })
  city!: string; // contoh 'Bandung'

  @Prop({ default: '' })
  address?: string;

  @Prop({ default: '' })
  phone?: string;

  @Prop({ default: '' })
  latitude?: string;

  @Prop({ default: '' })
  longitude?: string;

  @Prop({ default: '' })
  imageUrl?: string;

  @Prop({ default: true })
  isActive!: boolean;
}

export const BranchSchema = SchemaFactory.createForClass(Branch);
