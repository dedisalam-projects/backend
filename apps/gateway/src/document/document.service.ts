import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as path from 'path';
import {
  TravelokaReceipt,
  TravelokaReceiptDocument,
  GojekReceipt,
  GojekReceiptDocument,
  IndriveReceipt,
  IndriveReceiptDocument,
  JackalReceipt,
  JackalReceiptDocument,
} from '@dedisalam/database';
import { DocumentGateway } from './document.gateway';
import { DocumentQueryDto } from './dto/document-query.dto';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);
  private asetGenerator: any = null;

  constructor(
    @InjectModel(TravelokaReceipt.name)
    private readonly travelokaModel: Model<TravelokaReceiptDocument>,
    @InjectModel(GojekReceipt.name)
    private readonly gojekModel: Model<GojekReceiptDocument>,
    @InjectModel(IndriveReceipt.name)
    private readonly indriveModel: Model<IndriveReceiptDocument>,
    @InjectModel(JackalReceipt.name)
    private readonly jackalModel: Model<JackalReceiptDocument>,
    private readonly documentGateway: DocumentGateway,
  ) {
    this.loadAsetGenerator();
  }

  private loadAsetGenerator() {
    try {
      // Look up aset/generate.js from workspace root
      const asetPath = path.resolve(process.cwd(), '../aset/generate.js');

      this.asetGenerator = require(asetPath);
      this.logger.log(`Aset PDF Generator loaded successfully from: ${asetPath}`);
    } catch (err: any) {
      try {
        const fallbackPath = path.resolve(__dirname, '../../../../aset/generate.js');

        this.asetGenerator = require(fallbackPath);
        this.logger.log(`Aset PDF Generator loaded successfully from fallback: ${fallbackPath}`);
      } catch (e: any) {
        this.logger.warn(`Could not load aset generator dynamically: ${err.message}`);
      }
    }
  }

  private getModel(provider: string): Model<any> {
    const p = (provider || '').toLowerCase().trim();
    switch (p) {
      case 'traveloka':
        return this.travelokaModel;
      case 'gojek':
        return this.gojekModel;
      case 'indrive':
        return this.indriveModel;
      case 'jackal':
        return this.jackalModel;
      default:
        throw new BadRequestException(
          `Provider '${provider}' is not supported. Use: traveloka, gojek, indrive, jackal`,
        );
    }
  }

  async findAll(provider: string, query: DocumentQueryDto) {
    const model = this.getModel(provider);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      const regex = new RegExp(s, 'i');
      const p = provider.toLowerCase();
      if (p === 'traveloka') {
        filter.$or = [
          { receiptNo: regex },
          { poNumber: regex },
          { 'customer.name': regex },
          { passengerName: regex },
          { guestName: regex },
        ];
      } else if (p === 'gojek') {
        filter.$or = [
          { orderId: regex },
          { customerName: regex },
          { driverName: regex },
          { vehiclePlate: regex },
        ];
      } else if (p === 'indrive') {
        filter.$or = [
          { invoiceNumber: regex },
          { recipientName: regex },
          { driverName: regex },
          { vehicleDetail: regex },
        ];
      } else if (p === 'jackal') {
        filter.$or = [
          { bookingCode: regex },
          { 'customer.name': regex },
          { 'customer.phone': regex },
        ];
      }
    }

    if (query.category) {
      filter.category = query.category;
    }
    if (query.serviceType) {
      filter.serviceType = query.serviceType;
    }

    const [items, total] = await Promise.all([
      model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      model.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(provider: string, id: string) {
    const model = this.getModel(provider);
    const doc = await model.findById(id).lean().exec();
    if (!doc) {
      throw new NotFoundException(`Document with id '${id}' not found in provider '${provider}'`);
    }
    return doc;
  }

  async create(provider: string, data: any) {
    const model = this.getModel(provider);
    const cleanData = { ...data, status: data.status || 'draft' };
    const created = await model.create(cleanData);
    const result = created.toObject();

    this.documentGateway.notifyCreated(provider, result);
    return result;
  }

  async update(provider: string, id: string, data: any) {
    const model = this.getModel(provider);
    const updated = await model
      .findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
      .lean()
      .exec();
    if (!updated) {
      throw new NotFoundException(`Document with id '${id}' not found in provider '${provider}'`);
    }

    this.documentGateway.notifyUpdated(provider, updated);
    return updated;
  }

  async delete(provider: string, id: string) {
    const model = this.getModel(provider);
    const deleted = await model.findByIdAndDelete(id).lean().exec();
    if (!deleted) {
      throw new NotFoundException(`Document with id '${id}' not found in provider '${provider}'`);
    }

    this.documentGateway.notifyDeleted(provider, id);
    return { success: true, id };
  }

  async generatePdf(
    provider: string,
    id: string,
  ): Promise<{ buffer: Buffer; filename: string; docType: string }> {
    const doc = await this.findOne(provider, id);
    if (!this.asetGenerator?.generateBuffer) {
      this.loadAsetGenerator();
      if (!this.asetGenerator?.generateBuffer) {
        throw new BadRequestException('Aset PDF Engine is unavailable in current runtime.');
      }
    }

    const payload = this.transformToEnginePayload(provider, doc);
    const generationResult = await this.asetGenerator.generateBuffer(payload);

    // Update document status to generated in database
    const model = this.getModel(provider);
    const updated = await model
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status: 'generated',
            lastGeneratedAt: new Date(),
          },
        },
        { new: true },
      )
      .lean()
      .exec();

    // Broadcast status change across all clients in realtime
    this.documentGateway.notifyGenerated(provider, updated);

    const filename = this.deriveFilename(provider, doc);

    return {
      buffer: generationResult.buffer,
      filename,
      docType: generationResult.docType,
    };
  }

  private deriveFilename(provider: string, doc: any): string {
    const p = provider.toLowerCase();
    if (p === 'traveloka') {
      const no = (doc.receiptNo || 'receipt').replace(/[^a-zA-Z0-9_-]/g, '_');
      return `Traveloka_${no}.pdf`;
    } else if (p === 'gojek') {
      const order = (doc.orderId || 'order').replace(/[^a-zA-Z0-9_-]/g, '_');
      return `Gojek_${order}.pdf`;
    } else if (p === 'indrive') {
      const inv = (doc.invoiceNumber || 'invoice').replace(/[^a-zA-Z0-9_-]/g, '_');
      return `inDrive_${inv}.pdf`;
    } else if (p === 'jackal') {
      const code = (doc.bookingCode || 'booking').replace(/[^a-zA-Z0-9_-]/g, '_');
      return `Jackal_${code}.pdf`;
    }
    return `document_${Date.now()}.pdf`;
  }

  public transformToEnginePayload(provider: string, doc: any): any {
    const p = provider.toLowerCase();
    switch (p) {
      case 'traveloka': {
        return {
          category: doc.category || 'Tiket Bus & Shuttle',
          receipt_no: doc.receiptNo,
          po_number: doc.poNumber,
          transaction_date: doc.transactionDate,
          payment_method: doc.paymentMethod,
          payment_bar_method: doc.paymentMethod,
          status: doc.paymentStatus || 'Lunas',
          customer: {
            nama: doc.customer?.name || '',
            email: doc.customer?.email || '',
            phone: doc.customer?.phone || '',
          },
          passenger: doc.passengerName || '',
          guest: doc.guestName || '',
          hotel: doc.hotel
            ? {
                nama: doc.hotel.hotelName,
                alamat: doc.hotel.address,
                tanggal_masuk: doc.hotel.checkInDate,
                durasi: doc.hotel.duration,
              }
            : undefined,
          items: (doc.items || []).map((it: any) => ({
            no: it.itemNo,
            jenis: it.itemType,
            deskripsi_lines: it.descriptionLines || [],
            deskripsi: it.description || '',
            jml: it.quantity || 1,
            harga_satuan: it.unitPrice || 0,
            total: it.totalPrice || 0,
            row_height: it.rowHeight || 83.25,
          })),
          total: doc.totalAmount || 0,
        };
      }

      case 'gojek': {
        return {
          template: doc.serviceType || 'gocar',
          header: {
            tanggal: doc.transactionDate,
            id_pesanan: doc.orderId,
          },
          page: [
            {
              greeting: {
                nama: doc.customerName,
              },
              payment_rows: (doc.paymentRows || []).map((r: any) => ({
                item: r.item,
                nominal: r.amount,
              })),
              trip_detail: {
                pengemudi: doc.driverName,
                kendaraan: {
                  plat: doc.vehiclePlate,
                  tipe: doc.vehicleType,
                },
                jarak: doc.distance,
                waktu: doc.duration,
                penjemputan: {
                  tanggal: doc.pickup?.date,
                  jam: doc.pickup?.time,
                  tempat: doc.pickup?.placeName,
                  alamat: doc.pickup?.address,
                },
                tujuan: {
                  tanggal: doc.destination?.date,
                  jam: doc.destination?.time,
                  tempat: doc.destination?.placeName,
                  alamat: doc.destination?.address,
                },
              },
            },
            {
              total_box: (doc.paymentRows || []).map((r: any) => ({
                item: r.item,
                nominal: r.amount,
              })),
              total_transaksi: doc.totalPaid,
            },
          ],
        };
      }

      case 'indrive': {
        return {
          service: doc.serviceType || 'indrive-mobil',
          invoice_number: doc.invoiceNumber,
          recipient_name: doc.recipientName,
          order_type: doc.orderType || 'Perjalanan dalam kota',
          driver_name: doc.driverName,
          vehicle_detail: doc.vehicleDetail,
          trip_date: doc.tripDate,
          invoice_date: doc.invoiceDate,
          pickup: {
            location: doc.pickup?.location,
            time: doc.pickup?.time,
          },
          dropoff: {
            location: doc.dropoff?.location,
            time: doc.dropoff?.time,
          },
          distance: doc.distance,
          description: doc.description || 'Tarif perjalanan (termasuk pajak)',
          fare: doc.fare || 0,
          payment_method: doc.paymentMethod || 'Tunai',
        };
      }

      case 'jackal': {
        return {
          service: doc.serviceType || 'jackal-shuttle',
          booking_code: doc.bookingCode,
          booking_date: doc.bookingDate,
          customer: {
            name: doc.customer?.name,
            address: doc.customer?.address || '-',
            phone: doc.customer?.phone,
            email: doc.customer?.email,
            otp: doc.customer?.otp || '',
          },
          departure: {
            point: doc.departure?.point,
            address: doc.departure?.address,
            maps_url: doc.departure?.mapsUrl || '',
            date: doc.departure?.date,
            time: doc.departure?.time,
          },
          destination: {
            point: doc.destination?.point,
            address: doc.destination?.address,
            maps_url: doc.destination?.mapsUrl || '',
          },
          passengers: (doc.passengers || []).map((p: any) => ({
            qr_code: p.qrCode || '',
            name: p.name,
            seat: p.seat,
            route: p.route,
            schedule: p.schedule,
          })),
          tickets: (doc.passengers || []).map((p: any, idx: number) => ({
            ticket_no: `TJKL${doc.bookingCode || idx}`,
            seat: p.seat,
            route: p.route,
            schedule: p.schedule,
            price: doc.payment?.totalPrice || 0,
          })),
          payment: {
            total_price: doc.payment?.totalPrice || 0,
            admin_fee: doc.payment?.adminFee || 0,
            discount: doc.payment?.discount || 0,
            total_paid: doc.payment?.totalPaid || 0,
            method: doc.payment?.method || 'BCA VIRTUAL ACCOUNT',
            time: doc.payment?.time || '',
          },
        };
      }

      default:
        throw new BadRequestException(`Cannot transform payload for unknown provider: ${provider}`);
    }
  }
}
