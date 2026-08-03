import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true, index: true })
  email!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, select: false })
  password!: string;

  @Prop({ default: 'user' })
  role!: string;

  @Prop({ default: true })
  isActive!: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
export type UserDocument = User & Document;
