import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { Branch } from './branch.schema';
import { Category } from './category.schema';
import { Brand } from './brand.schema';

export type ProductDocument = Product & Document;

@Schema({ _id: false })
export class PricingTier {
  @Prop({ required: true })
  unit!: string;

  @Prop({ required: true, default: 1 })
  minQty!: number;

  @Prop({ default: 1 })
  fraction!: number;

  @Prop({ required: true })
  price!: number;

  @Prop({ default: '' })
  label!: string;
}

export const PricingTierSchema = SchemaFactory.createForClass(PricingTier);

@Schema({ _id: false })
export class ProductSpec {
  @Prop({ default: 0 })
  length!: number;

  @Prop({ default: 0 })
  width!: number;

  @Prop({ default: 0 })
  height!: number;

  @Prop({ default: 0 })
  grossWeight!: number;

  @Prop({ default: '' })
  bpom!: string;
}

export const ProductSpecSchema = SchemaFactory.createForClass(ProductSpec);

@Schema({ timestamps: true, collection: 'products' })
export class Product {
  @Prop({ required: true, unique: true, index: true })
  plu!: string;

  @Prop({ required: true, index: true })
  name!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Brand.name, required: false, index: true })
  brandId?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Category.name, required: false, index: true })
  categoryId?: Types.ObjectId;

  @Prop({ default: '' })
  description!: string;

  @Prop({ default: '' })
  imageUrl!: string;

  @Prop({ default: 'PCS' })
  unit!: string;

  @Prop({ required: true, default: 0 })
  price!: number;

  @Prop({ default: 0 })
  promoPrice!: number;

  @Prop({ default: 0 })
  lowestPrice!: number;

  @Prop({ type: [PricingTierSchema], default: [] })
  pricingTiers!: PricingTier[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Branch.name, required: false, index: true })
  branchId?: Types.ObjectId;

  @Prop({ required: true, index: true, default: '04' })
  branchCode!: string;

  @Prop({ default: true, index: true })
  isAvailable!: boolean;

  @Prop({ type: ProductSpecSchema, default: () => ({}) })
  spec!: ProductSpec;

  @Prop({ default: 'klikindogrosir', index: true })
  source!: string;

  @Prop({ type: Object, default: {} })
  rawMetadata!: Record<string, any>;

  @Prop({ default: () => new Date() })
  lastSyncedAt!: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ name: 'text' });
