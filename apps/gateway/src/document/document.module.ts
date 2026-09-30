import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import {
  TravelokaReceipt,
  TravelokaReceiptSchema,
  GojekReceipt,
  GojekReceiptSchema,
  IndriveReceipt,
  IndriveReceiptSchema,
  JackalReceipt,
  JackalReceiptSchema,
} from '@dedisalam/database';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { DocumentGateway } from './document.gateway';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: TravelokaReceipt.name, schema: TravelokaReceiptSchema },
      { name: GojekReceipt.name, schema: GojekReceiptSchema },
      { name: IndriveReceipt.name, schema: IndriveReceiptSchema },
      { name: JackalReceipt.name, schema: JackalReceiptSchema },
    ]),
  ],
  controllers: [DocumentController],
  providers: [DocumentService, DocumentGateway],
  exports: [DocumentService, DocumentGateway],
})
export class DocumentModule {}
