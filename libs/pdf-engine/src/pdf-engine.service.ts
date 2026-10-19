import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';

// Load unified core generator from local library

const { generateBuffer } = require('./core/generate');

export interface PdfGenerationResult {
  buffer: Buffer;
  docType: string;
  duration: number;
  size: number;
}

export interface PdfGenerationOptions {
  engine?: 'wkhtmltopdf' | 'pdfkit' | string;
  dpi?: string | number;
  [key: string]: any;
}

@Injectable()
export class PdfEngineService {
  private readonly logger = new Logger(PdfEngineService.name);

  /**
   * Generates a PDF buffer from normalized payload.
   * Routes Gojek documents to native wkhtmltopdf C/C++ engine by default,
   * while routing Traveloka, inDrive, and Jackal to their respective pixel-calibrated engines.
   */
  async generateBuffer(
    payload: any,
    options: PdfGenerationOptions = {},
  ): Promise<PdfGenerationResult> {
    const startTime = Date.now();
    try {
      const result: PdfGenerationResult = await generateBuffer(payload, options);
      this.logger.log(
        `Generated ${result.docType} (${result.size} bytes) in ${result.duration || Date.now() - startTime}ms`,
      );
      return result;
    } catch (err: any) {
      this.logger.error(`PDF generation failed: ${err.message}`, err.stack);
      throw err;
    }
  }
}
