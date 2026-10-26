# D-08 Technical Blueprint: Product Module Test Suite Standardization & Strict Typing Architecture
**Document ID**: D-08-SPEC-BE-PRODUCT-002  
**Author**: Hendro Wijaya, Principal System Architect (Tier 2)  
**Approver**: Arya Pratama, Chief Technology Officer (Tier 1)  
**Stakeholders**: Bagus Wicaksono (Lead Dev), Dian Kartika (Lead QA), Backend Team  
**Status**: APPROVED / READY FOR IMPLEMENTATION  
**Target Codebase**: `/home/dedisalam/projects/backend`  

---

## 1. Executive Summary & Root Cause Analysis

Hasil audit empiris CTO Technical Governance dan verifikasi Jest coverage pada modul `backend/apps/gateway/src/product/` menemukan defisit kualitas kritis:

1. **Defisit Test Coverage (19.46% Lines vs Target >= 80%)**:
   - `branch.controller.ts`: **0%** (belum ada `branch.controller.spec.ts`)
   - `brand.controller.ts`: **0%** (belum ada `brand.controller.spec.ts`)
   - `category.controller.ts`: **0%** (belum ada `category.controller.spec.ts`)
   - `indogrosir-sync.service.ts`: **16.66%** (belum ada `indogrosir-sync.service.spec.ts`)
   - `product.service.ts`: **4.68%** (belum ada `product.service.spec.ts`)
   - Total lines coverage modul produk hanya **19.46%**, menggagalkan ambang batas kualitas enterprise (min. 80%).

2. **Pelanggaran Strict Typing (Type 'any' Leak)**:
   - Ditemukan 27 peringatan `@typescript-eslint/no-explicit-any` pada modul produk:
     - `branch.controller.ts`: 2 `any` pada parameter `@Body() body: any` (create & update).
     - `brand.controller.ts`: 2 `any` pada parameter `@Body() body: any` (create & update).
     - `category.controller.ts`: 2 `any` pada parameter `@Body() body: any` (create & update).
     - `indogrosir-sync.service.ts`: 3 `any` pada parsing response live API dan catch error.
     - `product.service.ts`: 16 `any` pada controller delegates, mongo query casting, dan data rekapitulasi pulau.
     - `product.controller.spec.ts`: 6 `any` pada mock resolution cast.

3. **Bypass Kaskade Review & D-17 QA Clearance**:
   - Pengerjaan sebelumnya ditandai selesai langsung tanpa melalui L1 Squad Review oleh Lead Developer (`lead-dev`), tanpa verifikasi independen Lead QA (`qa`), dan tanpa Sertifikat D-17 QA Clearance.

---

## 2. Arsitektur Type Safety (Zero 'any' Policy)

Seluruh tipe data liar wajib digantikan dengan DTO dan Interface formal yang terdefinisi di `libs/common/src/dto/product.dto.ts` atau interface internal.

### 2.1. DTO Baru untuk Branch, Brand, dan Category

Wajib ditambahkan pada `backend/libs/common/src/dto/product.dto.ts` (dan di-export via `index.ts`):

```typescript
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

// --- Branch DTOs ---
export class CreateBranchDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  province?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateBranchDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  province?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// --- Brand DTOs ---
export class CreateBrandDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateBrandDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// --- Category DTOs ---
export class CreateCategoryDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  divisionCode?: string;

  @IsString()
  @IsOptional()
  level?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  divisionCode?: string;

  @IsString()
  @IsOptional()
  level?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
```

### 2.2. Typed Interfaces untuk Internal Service Logic

Wajib didefinisikan pada `product.service.ts` atau file interface tersendiri untuk menggantikan casting `any`:

```typescript
export interface BranchRawMetadata {
  island_name?: string;
  [key: string]: unknown;
}

export interface IslandBranchItem {
  code: string;
  name: string;
  city?: string;
  address?: string;
  phone?: string;
}

export interface IslandGroup {
  count: number;
  branches: IslandBranchItem[];
}

export interface CategoryRecapItem {
  code: string;
  name: string;
  divisionCode?: string;
  level?: string;
}

export interface InventoryAggRow {
  _id: null;
  totalValue: number;
}
```

### 2.3. Typed Interface untuk KlikIndogrosir Live Response

Wajib didefinisikan pada `indogrosir-sync.service.ts`:

```typescript
export interface KlikIndogrosirApiProduct {
  prdcd?: string;
  plu?: string;
  nama_produk?: string;
  long_description?: string;
  deskripsi?: string;
  brand?: string;
  division?: string;
  url_pic_prod?: string;
  unit?: string;
  hrg_jual?: number | string;
  prmd_hrgjual?: number | string;
  hrg_termurah?: number | string;
  pricing_tier?: Array<{
    unit: string;
    minQty: number;
    price: number;
    label?: string;
  }>;
  isAvailable?: boolean;
  spec?: Record<string, unknown>;
}

export interface KlikIndogrosirSearchResponse {
  product_details?: KlikIndogrosirApiProduct[];
  [key: string]: unknown;
}
```

---

## 3. Mocking Architecture & Test Matrix

### 3.1. Pola Standar Mongoose Query Mocking

NestJS Mongoose model menggunakan method chaining (`find().sort().lean().exec()`). Mock wajib mendukung chaining deterministik tanpa memory leak:

```typescript
export type MockModel<T = unknown> = {
  find: jest.Mock;
  findOne: jest.Mock;
  findById: jest.Mock;
  findByIdAndUpdate: jest.Mock;
  findByIdAndDelete: jest.Mock;
  countDocuments: jest.Mock;
  aggregate: jest.Mock;
  create: jest.Mock;
  new: jest.Mock;
  save: jest.Mock;
};

export const createMockQuery = <T>(resolvedValue: T) => ({
  populate: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(resolvedValue),
});
```

### 3.2. Spesifikasi Pengujian `product.service.spec.ts`

Wajib menguji 100% cabang logika berikut:
1. `findAll(query)`:
   - Skenario default paging (page 1, limit 10).
   - Skenario filter teks (`search`), filter kategori (`category`), status stok (`isAvailable`).
   - Skenario custom sort (`sortBy`, `sortOrder`).
2. `findOne(id)`:
   - Mengembalikan produk terpopulasi ketika ID ada.
   - Melempar `NotFoundException` jika produk tidak ditemukan.
3. `create(dto)`:
   - Sukses membuat produk baru saat PLU belum terdaftar.
   - Melempar `ConflictException` jika PLU sudah digunakan.
4. `update(id, dto)`:
   - Sukses mengupdate produk saat ID valid.
   - Melempar `NotFoundException` saat ID tidak ditemukan.
5. `remove(id)`:
   - Sukses menghapus produk dan mengembalikan pesan status.
   - Melempar `NotFoundException` saat ID tidak ditemukan.
6. `getStats()`:
   - Menghitung total produk, stok tersedia, out-of-stock, dan total valuasi inventaris.
7. `getRecap()`:
   - Menghitung sebaran pulau (`islandMap`), level kategori (`division`, `department`, `category`), dan rata-rata harga.
8. Branch, Brand, Category CRUD:
   - Menguji skenario `findAll`, `create` (dengan penanganan kode duplikat), `update` (not found check), dan `remove`.

### 3.3. Spesifikasi Pengujian `indogrosir-sync.service.spec.ts`

Wajib menguji:
1. `sync(dto)` - Skenario Live API:
   - Mocking `axios.post` sukses dengan token `KLIKINDOGROSIR_TOKEN` aktif.
   - Memvalidasi transformasi payload produk dari field `product_details`.
   - Memastikan properti `isAvailable` terefleksi boolean murni dan zero attribute `stock`.
2. `sync(dto)` - Skenario Fallback / Offline:
   - Mocking kegagalan `axios.post` (mis. timeout / 500 error).
   - Memastikan fallback ke `VERIFIED_INDOGROSIR_CATALOG` berjalan tanpa throwing unhandled exception.
   - Memvalidasi output counter `{ inserted, updated, failed, totalProcessed }`.

### 3.4. Spesifikasi Pengujian Controller Tambahan

Wajib menyediakan unit test file untuk controller:
- `apps/gateway/src/product/branch.controller.spec.ts`
- `apps/gateway/src/product/brand.controller.spec.ts`
- `apps/gateway/src/product/category.controller.spec.ts`
Setiap controller menguji pemanggilan service method, format envelope `{ success: true, data: ..., meta: ... }`, dan status code HTTP (200, 201).

---

## 4. Kaskade Implementasi & Verifikasi (SOP PP-017)

Alur pengerjaan wajib deterministik tanpa bypass:

```
[System Architect (T2)] - Hendro Wijaya
        │ Terbitkan D-08 & D-23
        ▼
[Worker Backend (T3)]
        │ Tulis spec tests, buat DTOs, eliminasi seluruh 'any' (Coverage >= 80%, Linter Exit 0)
        ▼
[Lead Developer (T2)] - Bagus Wicaksono
        │ L1 Squad Review: Audit kode, type safety 0% any, test suite lolos
        ▼
[Lead QA (T2)] - Dian Kartika
        │ Validasi Test Vectors D-23, terbitkan Sertifikat D-17 QA Clearance
        ▼
[CTO (T1)] - Arya Pratama
        │ Skeptical Superior Review: Validasi empiris terminal log & container health
        ▼
[Continuous Delivery (PP-019) & Lapor CEO (PP-018)]
```
