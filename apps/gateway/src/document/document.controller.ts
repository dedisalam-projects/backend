import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Res,
  Logger,
  Inject,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { Response } from 'express';
import { Public, DocumentQueryDto } from '@dedisalam/common';

@Controller('api/v1/documents')
@Public()
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class DocumentController {
  private readonly logger = new Logger(DocumentController.name);

  constructor(@Inject('BLIP_SERVICES') private readonly blipClient: ClientProxy) {}

  @Get(':provider')
  async listDocuments(@Param('provider') provider: string, @Query() query: DocumentQueryDto) {
    this.logger.log(`Forwarding list documents for provider: ${provider} to blip-services`);
    const result = await firstValueFrom(
      this.blipClient.send('document.find_all', { provider, query }).pipe(timeout(10000)),
    );
    return {
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Get(':provider/:id')
  async getDocument(@Param('provider') provider: string, @Param('id') id: string) {
    this.logger.log(`Forwarding get document: ${provider}/${id} to blip-services`);
    const doc = await firstValueFrom(
      this.blipClient.send('document.find_one', { provider, id }).pipe(timeout(10000)),
    );
    return {
      success: true,
      data: doc,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Post(':provider')
  async createDocument(@Param('provider') provider: string, @Body() body: any) {
    this.logger.log(`Forwarding create document for provider: ${provider} to blip-services`);
    const created = await firstValueFrom(
      this.blipClient.send('document.create', { provider, payload: body }).pipe(timeout(10000)),
    );
    return {
      success: true,
      data: created,
      message: 'Document created successfully',
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Put(':provider/:id')
  async updateDocument(
    @Param('provider') provider: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    this.logger.log(`Forwarding update document: ${provider}/${id} to blip-services`);
    const updated = await firstValueFrom(
      this.blipClient.send('document.update', { provider, id, payload: body }).pipe(timeout(10000)),
    );
    return {
      success: true,
      data: updated,
      message: 'Document updated successfully',
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Delete(':provider/:id')
  async deleteDocument(@Param('provider') provider: string, @Param('id') id: string) {
    this.logger.log(`Forwarding delete document: ${provider}/${id} to blip-services`);
    const result = await firstValueFrom(
      this.blipClient.send('document.delete', { provider, id }).pipe(timeout(10000)),
    );
    return {
      success: true,
      data: result,
      message: 'Document deleted successfully',
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Post(':provider/:id/generate')
  async generateDocumentPdf(
    @Param('provider') provider: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    this.logger.log(`Forwarding PDF generation for document: ${provider}/${id} to blip-services`);
    const response = await firstValueFrom(
      this.blipClient.send('document.generate_pdf', { provider, id }).pipe(timeout(30000)),
    );

    const buffer = Buffer.from(response.buffer, 'base64');
    const filename = response.filename || `document_${Date.now()}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });

    res.end(buffer);
  }
}
