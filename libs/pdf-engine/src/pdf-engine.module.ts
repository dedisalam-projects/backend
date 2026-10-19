import { Module } from '@nestjs/common';
import { PdfEngineService } from './pdf-engine.service';

@Module({
  providers: [PdfEngineService],
  exports: [PdfEngineService],
})
export class PdfEngineModule {}
