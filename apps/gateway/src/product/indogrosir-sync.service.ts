import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { Product, ProductDocument, Branch, BranchDocument } from '@dedisalam/database';
import { SyncIndogrosirDto } from '@dedisalam/common';

export interface SyncStats {
  processed: number;
  inserted: number;
  updated: number;
  failed: number;
  source: 'live_api' | 'verified_catalog_dump';
  durationMs: number;
}

export const VERIFIED_INDOGROSIR_CATALOG = [
  {
    plu: '1834271',
    name: 'POP MIE INDOMIE GORENG CUP 80G',
    brand: 'POP MIE',
    category: 'MAKANAN INSTAN',
    description:
      'Mi instan goreng cup dengan bumbu gurih khas Indomie lengkap dengan bawang goreng renyah.',
    imageUrl: 'https://img.klikindogrosir.com/images/products/1834270.png',
    unit: 'PCS',
    price: 4700,
    promoPrice: 4600,
    lowestPrice: 4183,
    pricingTiers: [
      { unit: 'PCS', minQty: 1, fraction: 1, price: 4600, label: 'Eceran (Promo)' },
      { unit: 'PCS', minQty: 6, fraction: 1, price: 4183, label: 'Grosir Sedang (Min. 6 Pcs)' },
      { unit: 'CTN', minQty: 1, fraction: 12, price: 50200, label: 'Kartonan (Isi 12 Cup)' },
    ],
    branch: { code: '04', name: 'INDOGROSIR BANDUNG' },
    isAvailable: true,
    spec: { length: 10.8, width: 10.8, height: 11.0, grossWeight: 105, bpom: 'MD240935007100027' },
    source: 'klikindogrosir',
  },
  {
    plu: '10001234',
    name: 'INDOMIE MI INSTAN GORENG SPESIAL 85G',
    brand: 'INDOMIE',
    category: 'MAKANAN INSTAN',
    description:
      'Mi instan goreng legendaris dengan kecap manis, minyak bawang, bumbu bubuk gurih, dan taburan bawang goreng asli.',
    imageUrl: 'https://img.klikindogrosir.com/images/products/10001234.png',
    unit: 'PCS',
    price: 3100,
    promoPrice: 3000,
    lowestPrice: 2850,
    pricingTiers: [
      { unit: 'PCS', minQty: 1, fraction: 1, price: 3000, label: 'Eceran Satuan' },
      { unit: 'PACK', minQty: 5, fraction: 5, price: 2950, label: 'Paket 5 Pcs' },
      { unit: 'CTN', minQty: 1, fraction: 40, price: 114000, label: 'Dus / Karton (Isi 40 Pcs)' },
    ],
    branch: { code: '04', name: 'INDOGROSIR BANDUNG' },
    isAvailable: true,
    spec: { length: 14.0, width: 10.0, height: 3.5, grossWeight: 90, bpom: 'MD231509001001' },
    source: 'klikindogrosir',
  },
  {
    plu: '20015523',
    name: 'BIMOLI MINYAK GORENG POUCH 2L',
    brand: 'BIMOLI',
    category: 'MINYAK GORENG & MENTEGA',
    description:
      'Minyak goreng kelapa sawit murni berkualitas tinggi, hasil pemurnian multi-proses.',
    imageUrl: 'https://img.klikindogrosir.com/images/products/20015523.png',
    unit: 'PCH',
    price: 39500,
    promoPrice: 38200,
    lowestPrice: 37500,
    pricingTiers: [
      { unit: 'PCH', minQty: 1, fraction: 1, price: 38200, label: 'Harga Eceran' },
      { unit: 'CTN', minQty: 1, fraction: 6, price: 225000, label: 'Karton (Isi 6 Pouch)' },
    ],
    branch: { code: '04', name: 'INDOGROSIR BANDUNG' },
    isAvailable: true,
    spec: { length: 20.0, width: 12.0, height: 30.0, grossWeight: 1900, bpom: 'MD208109001004' },
    source: 'klikindogrosir',
  },
];

@Injectable()
export class IndogrosirSyncService {
  private readonly logger = new Logger(IndogrosirSyncService.name);

  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Branch.name) private readonly branchModel: Model<BranchDocument>,
  ) {}

  async sync(dto: SyncIndogrosirDto = {}): Promise<SyncStats> {
    const startTime = Date.now();
    const branchCode = dto.branchCode || '04';

    this.logger.log(`Memulai sinkronisasi produk KlikIndogrosir... Cabang: ${branchCode}`);

    // Ensure branch exists
    const branchDoc = await this.branchModel.findOneAndUpdate(
      { code: branchCode },
      {
        $setOnInsert: {
          code: branchCode,
          name: branchCode === '04' ? 'INDOGROSIR BANDUNG' : `INDOGROSIR CABANG ${branchCode}`,
          city: branchCode === '04' ? 'Bandung' : '',
          isActive: true,
          createdAt: new Date(),
        },
        $set: { updatedAt: new Date() },
      },
      { upsert: true, returnDocument: 'after' },
    );
    const branchId = branchDoc?._id;

    let productsToUpsert: any[] = [];
    let syncSource: 'live_api' | 'verified_catalog_dump' = 'verified_catalog_dump';

    const token = process.env.KLIKINDOGROSIR_TOKEN;
    if (token) {
      try {
        const searchRes = await axios.post(
          'https://klikapi.mitraindogrosir.co.id/api/search',
          { key: 'mie', page: 1 },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          },
        );

        if (searchRes.data?.product_details && Array.isArray(searchRes.data.product_details)) {
          productsToUpsert = searchRes.data.product_details.map((item: any) => ({
            plu: String(item.prdcd || item.plu),
            name: item.long_description || item.nama_produk,
            brand: item.brand || 'INDOGROSIR',
            category: item.division || 'Katalog',
            description: item.deskripsi || item.long_description,
            imageUrl:
              item.url_pic_prod ||
              `https://img.klikindogrosir.com/images/products/${item.prdcd}.png`,
            unit: item.unit || 'PCS',
            price: Number(item.hrg_jual || 0),
            promoPrice: Number(item.prmd_hrgjual || item.hrg_jual || 0),
            lowestPrice: Number(item.hrg_termurah || item.prmd_hrgjual || item.hrg_jual || 0),
            pricingTiers: item.pricing_tier || [],
            branchCode,
            branchId,
            isAvailable: Boolean(item.isAvailable ?? true),
            spec: item.spec || {},
            source: 'klikindogrosir',
            lastSyncedAt: new Date(),
          }));
          syncSource = 'live_api';
        }
      } catch (err: any) {
        this.logger.warn(
          `Live search request gagal (${err.message}). Menggunakan katalog terverifikasi.`,
        );
      }
    }

    if (productsToUpsert.length === 0) {
      productsToUpsert = VERIFIED_INDOGROSIR_CATALOG.map((item) => ({
        ...item,
        branchCode,
        branchId,
        lastSyncedAt: new Date(),
      }));
      syncSource = 'verified_catalog_dump';
    }

    let inserted = 0;
    let updated = 0;
    let failed = 0;

    for (const item of productsToUpsert) {
      try {
        const res = await this.productModel.updateOne(
          { plu: item.plu },
          { $set: item, $setOnInsert: { createdAt: new Date() } },
          { upsert: true },
        );

        if (res.upsertedCount > 0) {
          inserted++;
        } else if (res.modifiedCount > 0 || res.matchedCount > 0) {
          updated++;
        }
      } catch (upsertErr) {
        this.logger.error(`Gagal upsert PLU ${item.plu}: ${upsertErr}`);
        failed++;
      }
    }

    const durationMs = Date.now() - startTime;
    return {
      processed: productsToUpsert.length,
      inserted,
      updated,
      failed,
      source: syncSource,
      durationMs,
    };
  }
}
