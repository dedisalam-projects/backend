# D-23 Golden Contract Test Vectors: Product Module Test Suite & Strict Typing Clearance
**Document ID**: D-23-CONTRACT-BE-PRODUCT-002  
**Author**: Hendro Wijaya, Principal System Architect (Tier 2)  
**Approver**: Arya Pratama, Chief Technology Officer (Tier 1)  
**Target QA**: Dian Kartika, QA & Automation Lead (Tier 2) & QA Team (Tier 3)  
**Target Dev**: Bagus Wicaksono, Lead Software Engineer (Tier 2) & Backend Workers (Tier 3)  
**Status**: APPROVED & MANDATORY FOR GATE 2 QA CERTIFICATION  
**Scope**: `backend/apps/gateway/src/product/`, `backend/libs/common/src/dto/product.dto.ts`  

---

## 1. Overview & Acceptance Matrix

Dokumen ini mendefinisikan vektor uji deterministik (*Deterministic Test Vectors*) dan kriteria penerimaan otomatis (*Acceptance Criteria*) yang wajib lolos 100% pada pengujian unit, linter, dan verifikasi kaskade review sebelum modul produk dinyatakan lulus sertifikasi D-17 QA Clearance.

---

## 2. Test Vector Matrix (D-23 Vectors)

### Vector TV-01: Strict Typing & Zero 'any' Compliance
| Parameter | Spesifikasi Wajib |
|---|---|
| **Command** | `nx run gateway:lint` atau `./node_modules/.bin/nx run gateway:lint` |
| **Target Directory** | `apps/gateway/src/product/` |
| **Banned Patterns** | Larangan total penggunaan keyword `any` (`@typescript-eslint/no-explicit-any`) |
| **Acceptance Criteria** | 1. Perintah linter menghasilkan **Exit Code 0**.<br>2. Jumlah peringatan `@typescript-eslint/no-explicit-any` pada direktori `apps/gateway/src/product/` adalah **0 (Nol)**.<br>3. Parameter controller `@Body() body: any` digantikan oleh DTO tervalidasi (`CreateBranchDto`, `UpdateBranchDto`, `CreateBrandDto`, `UpdateBrandDto`, `CreateCategoryDto`, `UpdateCategoryDto`).<br>4. File `product.controller.spec.ts` bebas dari casting `as any`. |

---

### Vector TV-02: Product Module Line & Branch Coverage Gate
| Parameter | Spesifikasi Wajib |
|---|---|
| **Command** | `./node_modules/.bin/jest --config apps/gateway/jest.config.cts --coverage apps/gateway/src/product/` |
| **Target Files** | `product.service.ts`, `indogrosir-sync.service.ts`, `branch.controller.ts`, `brand.controller.ts`, `category.controller.ts`, `product.controller.ts` |
| **Target Coverage** | Statements >= 80%, Branches >= 80%, Functions >= 80%, Lines >= 80% |
| **Acceptance Criteria** | 1. Coverage lines pada setiap berkas individual di dalam `apps/gateway/src/product/` mencapai **>= 80%**.<br>2. Total lines coverage seluruh modul produk mencapai minimal **85%**.<br>3. Tidak ada branch error handling krusial yang terlewatkan (NotFoundException, ConflictException, Live API fallback). |

---

### Vector TV-03: Mongoose Chain Mocking & Unit Test Determinism
| Parameter | Spesifikasi Wajib |
|---|---|
| **Test File** | `apps/gateway/src/product/product.service.spec.ts` |
| **Target Class** | `ProductService` (`apps/gateway/src/product/product.service.ts`) |
| **Test Cases Wajib** | 1. `findAll`: pagination default & custom, search query regex, category filter, availability flag, sort ascending/descending.<br>2. `findOne`: hit return data, miss throw NotFoundException.<br>3. `create`: normal persist, duplicate PLU throw ConflictException.<br>4. `update`: normal persist, missing ID throw NotFoundException.<br>5. `remove`: normal delete, missing ID throw NotFoundException.<br>6. `getStats`: accurate aggregation & zero-divide safety.<br>7. `getRecap`: island breakdown grouping, category level counts.<br>8. CRUD methods untuk `Branch`, `Brand`, and `Category`. |
| **Acceptance Criteria** | Seluruh test suite lolos deterministik tanpa dependensi jaringan, instance DB MongoDB nyata, atau side-effect memory leak. |

---

### Vector TV-04: Indogrosir Sync Domain Mocking & Fault Tolerance
| Parameter | Spesifikasi Wajib |
|---|---|
| **Test File** | `apps/gateway/src/product/indogrosir-sync.service.spec.ts` |
| **Target Class** | `IndogrosirSyncService` (`apps/gateway/src/product/indogrosir-sync.service.ts`) |
| **Test Cases Wajib** | 1. Live Sync via HTTP API (sukses 200 dengan parsing `product_details`, pembaruan `lastSyncedAt`, dan flag `isAvailable`).<br>2. Fallback Catalog Dump saat token absen atau network error (timeout/500/401) tanpa melempar fatal exception.<br>3. Upsert Branch Document (memperbarui timestamp `updatedAt` cabang target).<br>4. Batch processing tracking (`inserted`, `updated`, `failed`, `totalProcessed`). |
| **Acceptance Criteria** | Pengujian unit memvalidasi bahwa sistem tahan terhadap kegagalan jaringan eksternal KlikIndogrosir dan menjamin ketiadaan atribut sintetis `stock`. |

---

### Vector TV-05: Sub-Controller Unit Test Coverage
| Parameter | Spesifikasi Wajib |
|---|---|
| **Test Files** | `branch.controller.spec.ts`, `brand.controller.spec.ts`, `category.controller.spec.ts` |
| **Coverage Requirement** | 100% Lines & Functions |
| **Acceptance Criteria** | 1. Setiap controller memiliki berkas unit test pendamping terisolasi.<br>2. Setiap endpoint HTTP (`GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`) teruji delegasinya ke `ProductService`.<br>3. Format response envelope `{ success: true, data: ..., meta: ... }` tervalidasi dengan ketat. |

---

### Vector TV-06: Four-Stage Cascade Review & D-17 QA Clearance Protocol
| Stage | Pelaku | Bukti Fisik Wajib (Physical Artifacts) |
|---|---|---|
| **1. Implementation** | `backend` (Worker) | Test files dibuat (`product.service.spec.ts`, `indogrosir-sync.service.spec.ts`, controller specs), type annotations bersih (0% any), coverage >= 80%. |
| **2. L1 Squad Review** | `lead-dev` (Leader) | Review kode komprehensif, validasi konvensi monorepo NX, konfirmasi zero-any, tanda tangan approval PR. |
| **3. Gate 2 QA Cert** | `qa` (Leader) | Eksekusi test suite independen, verifikasi TV-01 s/d TV-05, penerbitan **Sertifikat D-17 QA Clearance**. |
| **4. Superior Review** | `cto` (C-Level) | Skeptical audit terhadap sertifikat D-17 dan terminal log Jest coverage. |
| **5. Continuous Delivery** | `cto` / All | Push commit ke GitHub master (PP-019), pastikan kontainer sehat, lapor Founder & CEO Pak Dedi (PP-018). |
