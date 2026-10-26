import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true, collection: 'categories' })
export class Category {
  @Prop({ required: true, unique: true, index: true })
  code!: string; // slug / unique code, contoh: 'makanan-instan'

  @Prop({ required: true, index: true })
  name!: string; // nama kategori, contoh: 'MAKANAN INSTAN'

  @Prop({ default: 'category', index: true })
  level?: string; // 'division' | 'department' | 'category'

  @Prop({ default: '' })
  divisionCode?: string;

  @Prop({ default: '' })
  departmentCode?: string;

  @Prop({ default: '' })
  categoryCode?: string;

  @Prop({ default: '' })
  url?: string;

  @Prop({ default: true })
  isActive!: boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
