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
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { Response } from 'express';
import { Public, DocumentQueryDto } from '@dedisalam/common';
import { DocumentService } from './document.service';

@Controller('api/v1/documents')
@Public()
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class DocumentController {
  private readonly logger = new Logger(DocumentController.name);

  constructor(private readonly documentService: DocumentService) {}

  // ==========================================
  // HTTP REST Endpoints
  // ==========================================

  @Get(':provider')
  async listDocuments(@Param('provider') provider: string, @Query() query: DocumentQueryDto) {
    this.logger.log(`Listing documents for provider: ${provider}`);
    const result = await this.documentService.findAll(provider, query);
    return {
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Get(':provider/:id')
  async getDocument(@Param('provider') provider: string, @Param('id') id: string) {
    this.logger.log(`Fetching document: ${provider}/${id}`);
    const doc = await this.documentService.findOne(provider, id);
    return {
      success: true,
      data: doc,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Post(':provider')
  async createDocument(@Param('provider') provider: string, @Body() body: any) {
    this.logger.log(`Creating document for provider: ${provider}`);
    const created = await this.documentService.create(provider, body);
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
    this.logger.log(`Updating document: ${provider}/${id}`);
    const updated = await this.documentService.update(provider, id, body);
    return {
      success: true,
      data: updated,
      message: 'Document updated successfully',
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Delete(':provider/:id')
  async deleteDocument(@Param('provider') provider: string, @Param('id') id: string) {
    this.logger.log(`Deleting document: ${provider}/${id}`);
    const result = await this.documentService.delete(provider, id);
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
    this.logger.log(`Generating PDF for document: ${provider}/${id}`);
    const { buffer, filename } = await this.documentService.generatePdf(provider, id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });

    res.end(buffer);
  }

  // ==========================================
  // Microservice Message Patterns (RabbitMQ)
  // ==========================================

  @MessagePattern('document.find_all')
  async handleFindAll(@Payload() data: { provider: string; query: DocumentQueryDto }) {
    return this.documentService.findAll(data.provider, data.query || {});
  }

  @MessagePattern('document.find_one')
  async handleFindOne(@Payload() data: { provider: string; id: string }) {
    return this.documentService.findOne(data.provider, data.id);
  }

  @MessagePattern('document.create')
  async handleCreate(@Payload() data: { provider: string; payload: any }) {
    return this.documentService.create(data.provider, data.payload);
  }

  @MessagePattern('document.update')
  async handleUpdate(@Payload() data: { provider: string; id: string; payload: any }) {
    return this.documentService.update(data.provider, data.id, data.payload);
  }

  @MessagePattern('document.delete')
  async handleDelete(@Payload() data: { provider: string; id: string }) {
    return this.documentService.delete(data.provider, data.id);
  }

  @MessagePattern('document.generate_pdf')
  async handleGeneratePdf(@Payload() data: { provider: string; id: string }) {
    const { buffer, filename, docType } = await this.documentService.generatePdf(
      data.provider,
      data.id,
    );
    return {
      buffer: buffer.toString('base64'),
      filename,
      docType,
    };
  }
}
