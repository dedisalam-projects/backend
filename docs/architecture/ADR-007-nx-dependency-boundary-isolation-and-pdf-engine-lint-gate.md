# ADR-007: Standarisasi NX Dependency Boundary libs/common & Remidiasi Lint Gate libs/pdf-engine

**Date**: 2026-10-26  
**Status**: accepted  
**Deciders**: Hendro Wijaya (Principal System Architect), Arya Pratama (CTO)  
**Stakeholders**: Bagus Wicaksono (Lead Dev), Dian Kartika (Lead QA), Backend Team  

## Context

Audit teknis CTO menemukan dua pelanggaran integritas arsitektural dan *quality gate* pada monorepo backend (`/home/dedisalam/projects/backend`):

1. **Pelanggaran Boundary Dependensi Modular (`libs/common/package.json`)**:
   - Modul `libs/common` secara langsung mengimpor `@nestjs/jwt`, `nestjs-pino`, `bcrypt`, dan `mongoose` dalam kode sumber (`src/filters/`, `src/utils/`, `src/config/`).
   - Namun, keempat paket runtime tersebut tidak tercantum dalam field `dependencies` pada `libs/common/package.json`.
   - Hal ini melanggar rule ESLint `@nx/dependency-checks` dengan pesan kesalahan:
     ```
     The "common" project uses the following packages, but they are missing from "dependencies":
       - @nestjs/jwt
       - nestjs-pino
       - bcrypt
       - mongoose
     ```
   - Dampaknya: boundary isolasi dependensi NX rusak, menyebabkan build artifact `libs/common` berpotensi hilang dependensi saat dipaketkan secara mandiri (*buildable library*).

2. **Kegagalan Lint Gate Monorepo (`libs/pdf-engine`)**:
   - Terdapat 18 error aktif ESLint pada `libs/pdf-engine`:
     - 1 error `@typescript-eslint/adjacent-overload-signatures` pada `src/core/fonts.js` akibat duplikasi deklarasi fungsi `registerAllFonts`.
     - 1 error `prefer-const` pada `src/templates/gojek/gocar.js` (`let p = pageData`).
     - 16 error `no-empty` akibat blok `try { ... } catch (e) {}` kosong pada `src/core/helpers.js`, `src/core/openpdf.js`, `src/core/stream.js`, `src/core/weasyprint.js`, `src/core/wkhtml.js`, dan `src/templates/html/shared.js`.
   - Hal ini menyebabkan eksekusi `nx run-many --target=lint --all` gagal dengan **Exit Code 1**, memblokir pipeline CI/CD dan pre-push verification.

## Decision

1. **Deklarasi Eksplisit Dependensi pada `libs/common/package.json`**:
   - Mendaftarkan dependensi runtime yang dibutuhkan oleh `libs/common` secara eksplisit pada field `dependencies`:
     ```json
     "@nestjs/jwt": "^11.0.2",
     "nestjs-pino": "^4.6.1",
     "bcrypt": "^6.0.0",
     "mongoose": "^9.7.4"
     ```
   - Menjamin integritas isolasi NX buildable library tanpa peringatan atau bypass rule `@nx/dependency-checks`.

2. **Remidiasi Komprehensif ESLint pada `libs/pdf-engine`**:
   - **Eliminasi Duplikasi Signature Overload**: Menghapus deklarasi parsial pertama `registerAllFonts` pada baris 34-37 `src/core/fonts.js`, menyisakan deklarasi kanonikal lengkap di baris 102 yang mencakup seluruh font provider (Gojek, Traveloka, inDrive, Jackal).
   - **Penegakan Immutability**: Mengubah deklarasi `let p = pageData` menjadi `const p = pageData` pada `src/templates/gojek/gocar.js`.
   - **Eliminasi Blok Catch Kosong**: Mengganti seluruh 16 empty catch blocks dengan graceful error logging / safe diagnostic handling (misal: `console.warn` atau komentar deskriptif terstruktur) sehingga tidak ada error suppression tanpa jejak audit.

3. **Zero Lint Bypass & Empiris Exit Code 0**:
   - Dilarang keras menggunakan komentar pembungkam `/* eslint-disable */` untuk menyembunyikan error.
   - Seluruh 10 target proyek di monorepo backend wajib lulus `nx run-many --target=lint --all` dengan Exit Code 0.

4. **Kaskade Delegasi & Review Bertingkat (PP-017 & PP-018)**:
   - Worker Backend (`backend` - T3) mengimplementasikan perubahan kode sesuai cetak biru D-10.
   - Lead Developer (`lead-dev` - T2) melakukan L1 Squad Review terhadap kebersihan kode dan ketiadaan regresi.
   - Lead QA (`qa` - T2) melakukan pengujian validasi independen dan menerbitkan Sertifikat D-17 QA.
   - CTO (`cto` - T1) melakukan Skeptical Superior Review dan eksekusi Continuous Delivery ke branch produksi.
   - Lapor tertutup kepada Founder & CEO Pak Dedi.

## Alternatives Considered

### Alternative 1: Menonaktifkan Rule `@nx/dependency-checks` atau `no-empty`
- **Pros**: Linting langsung hijau seketika tanpa mengubah berkas implementasi.
- **Cons**: Melanggar standar rekayasa Permana Tech, menyembunyikan silent failure dan kebocoran boundary dependensi, menciptakan utang teknis kritis. DITOLAK.

### Alternative 2: Memindahkan Dependensi ke `peerDependencies`
- **Pros**: `package.json` common tetap ramping.
- **Cons**: `@nx/dependency-checks` secara eksplisit memeriksa field `dependencies` untuk paket yang diimpor langsung dalam implementasi buildable lib. Penempatan di `peerDependencies` tetap memicu error ESLint pada tooling NX. DITOLAK.

## Consequences

### Positive
- Batas modular monorepo terisolasi dengan sempurna sesuai standar NX Monorepo Enterprise.
- Pipeline linting monorepo 100% bersih dengan Exit Code 0 di seluruh 10 proyek.
- Menghilangkan potensi unhandled exception tersembunyi berkat penanganan error eksplisit pada `libs/pdf-engine`.

### Negative / Trade-offs
- Sedikit peningkatan ukuran manifest `package.json` pada `libs/common`, namun sepenuhnya selaras dengan dependensi aktual root `package.json`.
