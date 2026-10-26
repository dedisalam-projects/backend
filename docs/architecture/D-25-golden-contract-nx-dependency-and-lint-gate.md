# D-25 Golden Contract: Test Vectors for NX Dependency Boundary & PDF Engine Lint Gate

**Document ID**: D-25-CONTRACT-TEST-004  
**Author**: Hendro Wijaya, Principal System Architect (Tier 2)  
**Approver**: Arya Pratama, Chief Technology Officer (Tier 1)  
**Target Codebase**: `/home/dedisalam/projects/backend`  
**Related Documents**: `ADR-007`, `D-10-SPEC-BE-ARCH-004`, `D-17-qa-clearance`  

---

## 1. Overview & Purpose

Dokumen ini mendefinisikan Vektor Uji Emas (*Golden Test Vectors*) untuk mengaudit dan memverifikasi remidiasi batas dependensi `libs/common` serta pembersihan seluruh error ESLint di `libs/pdf-engine`. Vektor uji ini wajib diverifikasi oleh Worker Backend (`backend`), Lead Developer (`lead-dev`), dan Lead QA (`qa`) sebelum penerbitan Sertifikat D-17 QA Clearance.

---

## 2. Test Vectors (TV-01 s/d TV-06)

### TV-01: NX Dependency Checks Verification (`libs/common`)
- **Target**: `/home/dedisalam/projects/backend/libs/common/package.json`
- **Metode Pengujian**: Eksekusi `./node_modules/.bin/nx lint common`.
- **Kriteria Lolos (Pass Criteria)**:
  - Tidak ada error `@nx/dependency-checks`.
  - Pustaka `@nestjs/jwt`, `nestjs-pino`, `bcrypt`, dan `mongoose` tercatat secara eksplisit pada field `dependencies`.
  - Output eslint melaporkan **0 errors**.

### TV-02: Overload Signatures Adjacency (`fonts.js`)
- **Target**: `/home/dedisalam/projects/backend/libs/pdf-engine/src/core/fonts.js`
- **Metode Pengujian**: Pemeriksaan statis dan linting.
- **Kriteria Lolos (Pass Criteria)**:
  - Deklarasi parsial `function registerAllFonts(doc)` pada baris 34 dihapus.
  - Hanya terdapat satu deklarasi kanonikal `registerAllFonts` pada berkas tersebut.
  - Zero error `@typescript-eslint/adjacent-overload-signatures`.

### TV-03: Variable Immutability (`gocar.js`)
- **Target**: `/home/dedisalam/projects/backend/libs/pdf-engine/src/templates/gojek/gocar.js`
- **Metode Pengujian**: Pemeriksaan statis dan linting.
- **Kriteria Lolos (Pass Criteria)**:
  - Baris 473 menggunakan `const p = pageData;`.
  - Zero error `prefer-const`.

### TV-04: Empty Catch Block Elimination (`libs/pdf-engine`)
- **Target**: Seluruh 6 berkas dalam `libs/pdf-engine` (`helpers.js`, `openpdf.js`, `stream.js`, `weasyprint.js`, `wkhtml.js`, `templates/html/shared.js`).
- **Metode Pengujian**: Pemeriksaan statis dan linting.
- **Kriteria Lolos (Pass Criteria)**:
  - Seluruh 16 blok `try { ... } catch (e) {}` kosong digantikan oleh penanganan graceful logging / komentar terstruktur.
  - Zero error `no-empty` pada output linter.

### TV-05: PDF Engine Isolated Lint Execution
- **Target**: `libs/pdf-engine`
- **Metode Pengujian**: Eksekusi `./node_modules/.bin/nx lint pdf-engine`.
- **Kriteria Lolos (Pass Criteria)**:
  - Perintah selesai dengan **Exit Code 0**.
  - Total error berjumlah **0**.

### TV-06: Monorepo All-Project Lint Gate Clearance
- **Target**: Seluruh 10 project monorepo (`apps/*`, `libs/*`).
- **Metode Pengujian**: Eksekusi `./node_modules/.bin/nx run-many --target=lint --all`.
- **Kriteria Lolos (Pass Criteria)**:
  - Seluruh 10 target proyek (`authenticator-service`, `notification-service`, `blip-services`, `auth-service`, `user-service`, `gateway-e2e`, `pdf-engine`, `database`, `gateway`, `common`) berstatus sukses (*passed*).
  - Total eksekusi selesai dengan **Exit Code 0** tanpa bypass atau suppress warning.

---

## 3. Matriks Kepatuhan Verifikasi (Checklist)

| Vector ID | Deskripsi Vektor Uji | Target Verifikasi | Tooling / Command | Syarat Minimum Lolos |
|---|---|---|---|---|
| **TV-01** | NX Dependency Checks | `libs/common/package.json` | `./node_modules/.bin/nx lint common` | 0 errors |
| **TV-02** | Signature Adjacency | `fonts.js` | `./node_modules/.bin/nx lint pdf-engine` | 0 errors |
| **TV-03** | Immutability | `gocar.js` | `./node_modules/.bin/nx lint pdf-engine` | 0 errors |
| **TV-04** | No-Empty Elimination | 6 berkas di `libs/pdf-engine` | `./node_modules/.bin/nx lint pdf-engine` | 0 errors |
| **TV-05** | PDF Engine Lint Pass | `libs/pdf-engine` | `./node_modules/.bin/nx lint pdf-engine` | Exit Code 0 |
| **TV-06** | Monorepo Full Lint Gate | All 10 Projects | `./node_modules/.bin/nx run-many --target=lint --all` | Exit Code 0 |
