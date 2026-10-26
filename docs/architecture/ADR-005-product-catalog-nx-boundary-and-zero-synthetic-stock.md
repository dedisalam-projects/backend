# ADR-005: Product Catalog NX Boundary Isolation and Zero Synthetic Stock Governance

**Date**: 2026-10-26  
**Status**: accepted  
**Deciders**: Hendro Wijaya (Principal System Architect), Arya Pratama (CTO)  
**Stakeholders**: Bagus Wicaksono (Lead Dev), Dian Kartika (Lead QA), Backend Team  

## Context

Pada arsitektur backend monorepo NX saat ini, ditemukan dua pelanggaran desain fundamental:
1. `apps/gateway/src/product/product.service.ts` mengimpor fungsi sinkronisasi secara langsung dari root scripts monorepo (`import { syncIndogrosirProducts } from '../../../../scripts/sync-indogrosir'`). Hal ini melanggar isolasi boundary modul monorepo NX (`@nx/enforce-module-boundaries`), merusak modularitas, serta menyebabkan kegagalan CI linter `gateway:lint` (Exit Code 1). Selain itu, script tersebut menginstansiasi koneksi `MongoClient` sekunder secara ad-hoc, menduplikasi pool koneksi MongoDB dan mengabaikan lifecycle NestJS.
2. Skema Mongoose `Product`, DTO `CreateProductDto`/`UpdateProductDto`, dan pipeline sinkronisasi Indogrosir memuat atribut `stock: 1250` dan fallback sintetis `stock: Number(item.stock || 100)`. Hal ini melanggar mandat mutlak Founder & CEO Pak Dedi: **"Zero atribut sintetis di DB - no dummy barcode/stok"**. API resmi KlikIndogrosir Superapp (`klikapi.mitraindogrosir.co.id`) adalah Source of Truth (SOT) tunggal dan hanya menyediakan status ketersediaan boolean (`isAvailable`), bukan kuantitas stok gudang.

## Decision

1. **Ekstraksi Domain Service `IndogrosirSyncService`**:
   - Memindahkan logika sinkronisasi katalog KlikIndogrosir ke dalam service domain terisolasi di `apps/gateway/src/product/indogrosir-sync.service.ts`.
   - Mengintegrasikan service tersebut dengan lifecycle dependensi NestJS menggunakan model `@InjectModel(Product.name)` Mongoose yang sudah ada, tanpa membuat koneksi `MongoClient` mentah sekunder.
   - Mengubah `scripts/sync-indogrosir.ts` menjadi CLI standalone tool yang tidak diimpor oleh kode runtime aplikasi.
2. **Pembersihan Total Atribut Sintetis `stock`**:
   - Menghapus field `stock` dari skema Mongoose `ProductSchema`, DTO produk, dan data catalog dump.
   - Mempertahankan murni atribut ketersediaan boolean `isAvailable: boolean` sebagai representasi deterministik SOT Indogrosir.
3. **Standarisasi Kontrak Unit Test**:
   - Mengharuskan pembuatan `product.controller.spec.ts` dan `product.service.spec.ts` dengan ambang batas code coverage minimal 80% dan 0% tipe `any`.
4. **Perbaikan Konfigurasi Staging Gateway**:
   - Menyertakan environment variable `MONGODB_URI` pada service `gateway` di `infrastructure/docker-compose.staging.yml` untuk mencegah runtime crash saat inisialisasi Mongoose.

## Alternatives Considered

### Alternative 1: Mengabaikan Rule Linting NX Boundary
- **Pros**: Tidak memerlukan restrukturisasi kode.
- **Cons**: Monorepo integrity rusak, dependensi tersembunyi antar-layer meningkat, dan CI build/linting pipeline gagal secara permanen.
- **Why not**: Melanggar standar arsitektur enterprise NX monorepo dan standard engineering governance.

### Alternative 2: Memisahkan ke Library Terpisah `@dedisalam/catalog`
- **Pros**: Logika sinkronisasi terpisah secara fisik di `libs/catalog`.
- **Cons**: Overhead konfigurasi library baru untuk fitur yang saat ini hanya dikonsumsi oleh modul produk di Gateway (YAGNI / Over-engineering pada fase ini).
- **Why not**: Ekstraksi ke `IndogrosirSyncService` di dalam `apps/gateway/src/product/` menyelesaikan masalah boundary secara langsung, mempertahankan kesederhanaan monorepo, dan dapat dipromosikan ke library terpisah jika di kemudian hari ada microservice lain yang membutuhkan.

### Alternative 3: Mempertahankan Fallback Stock `stock: 100`
- **Pros**: Antarmuka frontend yang mengharapkan angka stok tidak perlu diubah.
- **Cons**: Data sintetis palsu mencemari basis data produksi, melanggar mandat kedaulatan data CEO, dan menyesatkan pelanggan.
- **Why not**: CEO menetapkan larangan mutlak atas atribut sintetis. UI/UX wajib menampilkan status stok berdasarkan boolean `isAvailable`.

## Consequences

### Positive
- `nx run gateway:lint` lolos dengan Exit Code 0 tanpa pelanggaran module boundaries.
- Integritas data terjamin: MongoDB hanya menyimpan data riil sesuai SOT API resmi KlikIndogrosir.
- Gateway staging container dapat berjalan stabil tanpa crash saat inisialisasi koneksi MongoDB.
- Modul produk memiliki perlindungan regresi dengan unit test suite coverage >= 80%.

### Negative
- Konsumen API yang sebelumnya membaca field `stock` wajib beralih menggunakan field `isAvailable`.

### Risks & Mitigations
- **Risiko**: Kolom `stock` lama masih tersimpan di dokumen MongoDB yang sudah di-sync sebelumnya.
- **Mitigasi**: Menjalankan operasi pembersihan database `db.products.updateMany({}, { $unset: { stock: "" } })` pada migrasi data.
