# D-22 Golden Contract Test Vectors: Product Module Architecture & Quality Clearance
**Document ID**: D-22-CONTRACT-BE-PRODUCT-001  
**Author**: Hendro Wijaya, Principal System Architect (Tier 2)  
**Approver**: Arya Pratama, Chief Technology Officer (Tier 1)  
**Target QA**: Dian Kartika, QA & Automation Lead (Tier 2) & QA Team (Tier 3)  
**Target Dev**: Bagus Wicaksono, Lead Software Engineer (Tier 2) & Backend Workers (Tier 3)  
**Status**: APPROVED & MANDATORY FOR GATE 2 QA CERTIFICATION  
**Scope**: `apps/gateway/src/product/`, `libs/database/src/lib/schemas/product.schema.ts`, `libs/common/src/dto/product.dto.ts`, `infrastructure/docker-compose.staging.yml`  

---

## 1. Overview & Golden Rule Testing Vectors

Dokumen ini mendefinisikan vektor uji deterministik (*Deterministic Test Vectors*) dan kriteria penerimaan otomatis (*Acceptance Criteria*) yang wajib lolos 100% pada pengujian unit, linter, dan konfigurasi sebelum refactor modul produk disetujui untuk rilis staging dan production.

---

## 2. Test Vector Matrix (D-22 Vectors)

### Vector TV-01: NX Module Boundary Isolation & Lint Compliance
| Parameter | Spesifikasi Wajib |
|---|---|
| **Command** | `nx run gateway:lint` atau `./node_modules/.bin/nx run gateway:lint` |
| **Target Files** | `apps/gateway/src/product/product.service.ts` |
| **Negative Pattern** | Tidak boleh ada import path keluar dari app boundary (`../../../../scripts/*`) |
| **Acceptance Criteria** | 1. Perintah linter dijalankan dan menghasilkan **Exit Code 0**.<br>2. Tidak ada error `@nx/enforce-module-boundaries` pada seluruh berkas di `apps/gateway/src/product/`.<br>3. Seluruh dependensi sinkronisasi katalog diakses melalui injectable domain service internal atau library yang terdaftar di `tsconfig.base.json`. |

---

### Vector TV-02: Zero Synthetic Attribute Compliance (Stock Purge)
| Parameter | Spesifikasi Wajib |
|---|---|
| **Target Artifacts** | `product.schema.ts`, `product.dto.ts`, `sync-indogrosir.ts`, `indogrosir-sync.service.ts` |
| **Banned Tokens** | `stock: 1250`, `stock: Number(...)`, `@Prop() stock`, `stock?: number` |
| **Mandatory SOT Field** | `isAvailable: boolean` (Indexed, Default `true`) |
| **Acceptance Criteria** | 1. Skema Mongoose `Product` tidak mendefinisikan properti `stock`.<br>2. DTO `CreateProductDto` dan `UpdateProductDto` tidak menerima atau mengekspos properti `stock`.<br>3. Pipeline sinkronisasi katalog resmi KlikIndogrosir hanya mengekstrak dan memperbarui status `isAvailable` boolean murni tanpa angka stok sintetis buatan.<br>4. Koleksi MongoDB `products` bersih dari sisa kolom `stock` (via `$unset`). |

---

### Vector TV-03: Gateway Controller Contract & DTO Validation
| Parameter | Spesifikasi Wajib |
|---|---|
| **Test File** | `apps/gateway/src/product/product.controller.spec.ts` |
| **Target Controller** | `ProductController` (`apps/gateway/src/product/product.controller.ts`) |
| **HTTP Endpoints Tested** | `GET /`, `GET /stats`, `GET /recap`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`, `POST /sync` |
| **Acceptance Criteria** | 1. `GET /api/v1/products` memanggil `productService.findAll` dengan query yang diparse presisi, mengembalikan envelope `{ success: true, data: ..., meta: ... }`.<br>2. `GET /api/v1/products/:id` mengembalikan data produk ketika ID valid, atau melempar `NotFoundException` ketika tidak ditemukan.<br>3. `POST /api/v1/products` mengembalikan status HTTP 201 Created dan pesan konfirmasi.<br>4. `PUT /api/v1/products/:id` dan `DELETE /api/v1/products/:id` memvalidasi keberadaan entitas sebelum mutasi.<br>5. `POST /api/v1/products/sync` memicu sinkronisasi katalog on-demand dan mengembalikan ringkasan statistik pemrosesan. |

---

### Vector TV-04: Product Service Unit Testing Matrix & Mock Isolation
| Parameter | Spesifikasi Wajib |
|---|---|
| **Test Files** | `product.service.spec.ts`, `indogrosir-sync.service.spec.ts` |
| **Mock Strategy** | In-Memory Model Mocking (`Model<ProductDocument>`, `Model<CategoryDocument>`, etc.) |
| **Target Coverage** | Statements >= 80%, Branches >= 80%, Functions >= 80%, Lines >= 80% |
| **Type Discipline** | **0% `any`** (`@typescript-eslint/no-explicit-any` 0 warning pada file spec baru) |
| **Acceptance Criteria** | 1. Seluruh skenario CRUD (create, find, update, delete) teruji dengan assertion deterministik.<br>2. Skenario filtering regex pencarian nama dan PLU terverifikasi.<br>3. Pagination boundaries (clamping minimum limit 1, maksimum 100) teruji.<br>4. Penanganan konflik entitas duplikat (mis. PLU yang sudah ada) menghasilkan exception yang terprediksi. |

---

### Vector TV-05: Staging Container Startup & Configuration Contract
| Parameter | Spesifikasi Wajib |
|---|---|
| **Target File** | `infrastructure/docker-compose.staging.yml` |
| **Service Target** | `gateway` |
| **Required Environment** | `MONGODB_URI=mongodb://${MONGO_INITDB_ROOT_USERNAME:-root_staging}:${MONGO_INITDB_ROOT_PASSWORD:-staging_mongo_password}@mongodb:27017/dedisalam_staging?authSource=admin` |
| **Acceptance Criteria** | 1. Berkas compose memuat deklarasi variabel `MONGODB_URI` pada blok service `gateway`.<br>2. Nilai URI selaras dengan format credential `mongodb` container pada network staging.<br>3. Factory `createMongooseOptions('dedisalam')` tidak melempar error `MongoDB URI is not configured` saat compose dinaikkan. |

---

### Vector TV-06: End-to-End Layered Verification & Cascade Governance
| Stage | Pelaku | Bukti Fisik Wajib (Physical Artifacts) |
|---|---|---|
| **L1 (Worker)** | `backend` | Branch git bersih, `nx test gateway` pass, `nx lint gateway` pass (Exit 0). |
| **L2 (Lead Dev)** | `lead-dev` | Review PR komprehensif, konfirmasi zero-any, zero dummy data, no boundary violation. |
| **Gate 2 (QA)** | `qa` | Eksekusi test suite, laporan Jest coverage >= 80%, verifikasi TV-01 s/d TV-05, penerbitan **Sertifikat D-19 QA Clearance**. |
| **Superior Review** | `cto` | Skeptical audit terhadap sertifikat D-19 dan terminal log output. |
| **Production & Report** | `cto` / All | Merge ke branch utama, Continuous Delivery (PP-019), Lapor CEO Pak Dedi (PP-018). |
