# D-07 Technical Blueprint: Product Module Architecture Refactor & Boundary Isolation
**Document ID**: D-07-SPEC-BE-PRODUCT-001  
**Author**: Hendro Wijaya, Principal System Architect (Tier 2)  
**Approver**: Arya Pratama, Chief Technology Officer (Tier 1)  
**Stakeholders**: Bagus Wicaksono (Lead Dev), Dian Kartika (Lead QA), Backend Team  
**Status**: APPROVED / READY FOR IMPLEMENTATION  
**Target Codebase**: `/home/dedisalam/projects/backend` & `/home/dedisalam/projects/infrastructure`  

---

## 1. Executive Summary & Problem Statement

Berdasarkan audit CTO Technical Governance pada repositori backend, ditemukan 4 anomali arsitektur kritis pada modul produk:

1. **Pelanggaran NX Module Boundaries (`@nx/enforce-module-boundaries`)**:
   `apps/gateway/src/product/product.service.ts` mengimpor langsung dari root script non-library (`../../../../scripts/sync-indogrosir`). Hal ini merusak modularitas monorepo NX dan menggagalkan pipeline `nx run gateway:lint` (Exit Code 1).
2. **Pelanggaran Mandat Kedaulatan Data CEO (Atribut Sintetis Dummy Stock)**:
   Pada `backend/scripts/sync-indogrosir.ts`, `backend/libs/database/src/lib/schemas/product.schema.ts`, dan `backend/libs/common/src/dto/product.dto.ts`, terdapat field dummy numerik `stock: 1250` dan fallback `stock: Number(item.stock || 100)`. Mandat CEO menetapkan: **"Zero atribut sintetis di DB - no dummy barcode/stok"**. API resmi KlikIndogrosir Superapp (`klikapi.mitraindogrosir.co.id`) hanya mengekspos status ketersediaan boolean (`isAvailable`), bukan kuantitas stok fisik gudang.
3. **Absennya Unit Test Suite (0% Coverage)**:
   Modul `apps/gateway/src/product/` tidak memiliki file unit test (`*.spec.ts`), melanggar standar rekayasa enterprise minimum 80% coverage.
4. **Konfigurasi Staging Gateway Rusak (Runtime Crash)**:
   Pada `infrastructure/docker-compose.staging.yml`, service `gateway` belum menyertakan environment variable `MONGODB_URI`, menyebabkan runtime fatal crash saat startup pada factory `createMongooseOptions('dedisalam')`.

---

## 2. Arsitektur Target & Spesifikasi Rekayasa

```
+-----------------------------------------------------------------------------------+
| NX MONOREPO ARCHITECTURAL BOUNDARY                                                |
|                                                                                   |
|  [apps/gateway]                                                                   |
|    src/product/                                                                   |
|      ├── product.module.ts                                                        |
|      ├── product.controller.ts (REST API Endpoints)                               |
|      ├── product.service.ts (Domain Business Logic)                               |
|      ├── indogrosir-sync.service.ts (Injectable Catalog Sync Domain Service) <----+|
|      ├── product.controller.spec.ts (Coverage >= 80%, 0% any)                     |
|      ├── product.service.spec.ts (Coverage >= 80%, 0% any)                        |
|      └── indogrosir-sync.service.spec.ts (Coverage >= 80%, 0% any)                |
|                                                                                   |
|  [libs/database]                                                                  |
|    src/lib/schemas/                                                               |
|      └── product.schema.ts (PURGED: stock attribute REMOVED; isAvailable RETAINED) |
|                                                                                   |
|  [libs/common]                                                                    |
|    src/dto/                                                                       |
|      └── product.dto.ts (PURGED: stock attribute REMOVED from Create/Update DTO)  |
|                                                                                   |
|  [scripts/] (CLI Tools Only)                                                      |
|    └── sync-indogrosir.ts (CLI Standalone Runner delegating to domain logic)      |
+-----------------------------------------------------------------------------------+
```

---

## 3. Komponen Spesifikasi Teknis

### 3.1. Isolasi NX Boundary & Ekstraksi `IndogrosirSyncService`
1. **Lokasi Baru**: `apps/gateway/src/product/indogrosir-sync.service.ts`
2. **Karakteristik**:
   - Didekorasikan dengan `@Injectable()`.
   - Menggunakan `@InjectModel(Product.name)`, `@InjectModel(Category.name)`, `@InjectModel(Brand.name)`, dan `@InjectModel(Branch.name)` bawaan NestJS Mongoose Module.
   - Menghapus pembuatan instance `MongoClient` manual sekunder untuk mencegah duplikasi connection pool dan memory leak.
   - Didaftarkan sebagai `providers` dan di-export pada `ProductModule`.
3. **Refactor `ProductService`**:
   - Hapus impor `import { syncIndogrosirProducts } from '../../../../scripts/sync-indogrosir';`.
   - Inject `IndogrosirSyncService` melalui constructor `ProductService`.
   - Metode `syncFromIndogrosir(dto: SyncIndogrosirDto)` mendelegasikan eksekusi langsung ke `this.indogrosirSyncService.sync(dto)`.
4. **Refactor `scripts/sync-indogrosir.ts`**:
   - Berfungsi murni sebagai standalone CLI utility untuk operasional manual / cronjob.
   - Dilarang keras diimpor oleh aplikasi runtime manapun di dalam `apps/`.

### 3.2. Eliminasi Total Atribut Sintetis `stock` (Zero Synthetic Attributes)
1. **Schema Mongoose (`libs/database/src/lib/schemas/product.schema.ts`)**:
   - **HAPUS**:
     ```typescript
     // DIELIMINASI:
     @Prop({ default: 0 })
     stock!: number;
     ```
   - **PERTAHANKAN**:
     ```typescript
     @Prop({ default: true, index: true })
     isAvailable!: boolean;
     ```
2. **DTO Contracts (`libs/common/src/dto/product.dto.ts`)**:
   - **HAPUS** field `stock?: number;` beserta decorator `@IsNumber()`, `@IsOptional()`, dan `@Min(0)` dari:
     - `CreateProductDto`
     - `UpdateProductDto`
3. **Data Pipeline & Seed (`scripts/sync-indogrosir.ts` & `indogrosir-sync.service.ts`)**:
   - Hapus seluruh field `stock: 1250`, `stock: 4500`, dst. dari katalog verified mock / seed data.
   - Hapus mapping fallback sintetis `stock: Number(item.stock || 100)`.
   - Payload murni merefleksikan payload asli KlikIndogrosir:
     ```typescript
     isAvailable: Boolean(item.isAvailable ?? true),
     ```
4. **Database Migration D-22**:
   - Eksekusi pembersihan koleksi MongoDB untuk menghapus sisa atribut sintetis pada record lama:
     ```javascript
     db.products.updateMany({}, { $unset: { stock: "" } });
     ```

### 3.3. Kontrak & Standar Unit Test Modul Produk
1. **Target File**:
   - `apps/gateway/src/product/product.controller.spec.ts`
   - `apps/gateway/src/product/product.service.spec.ts`
   - `apps/gateway/src/product/indogrosir-sync.service.spec.ts`
2. **Kriteria Kelulusan**:
   - **Code Coverage**: Line, Branch, Function, dan Statement coverage masing-masing **>= 80%**.
   - **Type Safety**: **0% `any`**. Penggunaan `any` dilarang keras; wajib menggunakan strongly typed interfaces atau typed mock utilities (`jest.Mocked<T>`).
   - **Zero Flakiness**: Seluruh dependency I/O (Database, Network, Message Broker) diisolasi menggunakan deterministic in-memory mock.
3. **Lingkup Pengujian**:
   - `ProductController`:
     - `GET /api/v1/products`: Validasi pagination default dan custom query (`search`, `category`, `isAvailable`).
     - `GET /api/v1/products/stats`: Validasi agregasi statistik total, aktif, dan non-aktif.
     - `GET /api/v1/products/recap`: Validasi rekapitulasi data.
     - `GET /api/v1/products/:id`: Validasi produk ditemukan (200) vs tidak ditemukan (`NotFoundException` 404).
     - `POST /api/v1/products`: Validasi pembuatan produk baru (201 Created).
     - `PUT /api/v1/products/:id`: Validasi update produk berhasil (200) vs non-existent (404).
     - `DELETE /api/v1/products/:id`: Validasi penghapusan berhasil (200) vs non-existent (404).
     - `POST /api/v1/products/sync`: Validasi pemanggilan worker sinkronisasi dan response payload statistik.
   - `ProductService`:
     - Kalkulasi pagination (`skip = (page - 1) * limit`), clamping `limit` (max 100).
     - Regex query builder untuk `search` (PLU dan nama).
     - Filter ketersediaan boolean `isAvailable`.

### 3.4. Konfigurasi Staging Gateway (`docker-compose.staging.yml`)
1. **File Target**: `infrastructure/docker-compose.staging.yml`
2. **Patch Konfigurasi**:
   Tambahkan environment variable `MONGODB_URI` pada container service `gateway`:
   ```yaml
   gateway:
     image: dedisalam/backend-gateway:${BACKEND_TAG:-staging}
     pull_policy: missing
     container_name: gateway-staging
     restart: unless-stopped
     ports:
       - "${GATEWAY_STAGING_PORT:-3005}:3000"
     environment:
       - NODE_ENV=staging
       - COOKIE_DOMAIN=.dedisalam.my.id
       - JWT_SECRET=${JWT_SECRET:-staging_jwt_secret_key_testing_only}
       - MONGODB_URI=mongodb://${MONGO_INITDB_ROOT_USERNAME:-root_staging}:${MONGO_INITDB_ROOT_PASSWORD:-staging_mongo_password}@mongodb:27017/dedisalam_staging?authSource=admin
       - RABBITMQ_URL=amqp://${RABBITMQ_USER:-staging_user}:${RABBITMQ_PASS:-staging_rabbitmq_password}@rabbitmq:5672
       - REDIS_URL=redis://:${REDIS_PASSWORD:-staging_redis_password}@redis:6379
       - GATEWAY_PORT=3000
   ```
3. **Verifikasi**:
   - Memastikan `createMongooseOptions('dedisalam')` pada `apps/gateway/src/app/app.module.ts` mendapatkan string URI yang valid saat inisialisasi modul database.

---

## 4. Alur Koordinasi & Handoff Kaskade (PP-017)

1. **Architect (T2)**: Menerbitkan D-07 (Spesifikasi), D-22 (Golden Contract Vectors), dan ADR-005. Meneruskan ke `lead-dev` dan `backend`.
2. **Worker Backend (T3)**: Mengimplementasikan perubahan kode, refactor schema, penghapusan atribut dummy stock, penambahan service sinkronisasi, penulisan unit test spec, dan perbaikan docker-compose staging.
3. **Lead Dev Review (T2)**: Review menyeluruh terhadap PR/branch worker: verifikasi kelulusan linter `gateway:lint`, zero `any`, zero synthetic data, dan unit test pass.
4. **Lead QA Certification (T2)**: Menjalankan eksekusi verifikasi empiris terhadap D-22 Golden Contract Test Vectors, memastikan coverage >= 80%, dan menerbitkan D-19 QA Clearance Certificate.
5. **CTO Superior Skeptical Review (T1)**: Validasi log empiris, exit code 0, dan sign-off clearance.
6. **Continuous Delivery (PP-019) & Lapor CEO (PP-018)**: Merge PR, deployment otomatis, dan pelaporan hasil akhir ke Founder & CEO Pak Dedi.
