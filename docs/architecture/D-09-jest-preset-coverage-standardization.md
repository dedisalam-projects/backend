# D-09 Technical Blueprint: Jest Coverage Preset Standardization & Husky Pre-Push Calibration
**Document ID**: D-09-SPEC-BE-TEST-003  
**Author**: Hendro Wijaya, Principal System Architect (Tier 2)  
**Approver**: Arya Pratama, Chief Technology Officer (Tier 1)  
**Stakeholders**: Bagus Wicaksono (Lead Dev), Dian Kartika (Lead QA), Backend Team  
**Status**: APPROVED / READY FOR IMPLEMENTATION  
**Target Codebase**: `/home/dedisalam/projects/backend`  

---

## 1. Executive Summary & Root Cause Analysis

Audit teknis CTO menemukan kelemahan mendasar dalam konfigurasi *quality gate* unit testing monorepo backend:

1. **Uncalibrated Global Coverage Threshold (100%)**:
   - `jest.preset.js` mengonfigurasi threshold absolut 100% pada semua dimensi:
     ```javascript
     coverageThreshold: {
       global: {
         statements: 100,
         branches: 100,
         functions: 100,
         lines: 100,
       },
     }
     ```
2. **Defisit Coverage pada Boilerplate Non-Eksekutif**:
   - Pada `libs/common`, dekorator transform `@Type(() => CreateBranchDto)` pada `product.dto.ts` tidak dieksekusi secara fungsional dalam tes murni DTO, menurunkan *functions coverage* menjadi **89.7%** (ambang batas 100% gagal).
   - Pada `apps/gateway`, penanganan edge case branch pada integrasi sync dan error logging menyisakan *branch coverage* di angka **95.45%** (ambang batas 100% gagal).
3. **Penyimpangan Praktik Kerja (Bypass `--no-verify`)**:
   - Akibat kegagalan permanen `npm run test:unit`, setiap eksekusi hook `.husky/pre-push` mengembalikan Exit Code 1. Pengembang terpaksa menggunakan bypass `--no-verify` untuk melakukan git push ke master.
   - Hal ini melanggar governance D-14, D-17, D-23 dan melemahkan *quality gate*.

---

## 2. Monorepo Coverage Boundary Analysis

Monorepo backend terdiri dari 7 target project utama yang diuji melalui `nx run-many --target=test --all --runInBand --coverage`:
- `apps/gateway`: Gateway publik, controller, service modul produk dan otentikasi.
- `apps/user-service`: Layanan identitas pengguna dan credential.
- `apps/auth-service`: Layanan otentikasi microservice.
- `apps/notification-service`: Layanan notifikasi dan consumer event.
- `apps/blip-services`: Layanan integrasi BLIP.
- `libs/database`: Skema MongoDB dan modul Redis.
- `libs/common`: DTO, filter, guard, interceptor, helper, dan vault loader.

Hasil audit empiris menunjukkan bahwa seluruh logika bisnis di 7 project telah mencapai coverage di atas **90%** (rata-rata 95% - 99%), jauh melampaui standar enterprise 80%. Hambatan kegagalan murni bersumber dari ambang batas uncalibrated 100% dan tidak adanya ignorasi pada berkas boilerplate non-logika (DTO, Interface, Module definition).

---

## 3. Preskriptif Perubahan `jest.preset.js`

Berkas `/home/dedisalam/projects/backend/jest.preset.js` wajib diperbarui menjadi:

```javascript
const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '.+\\.dto\\.ts$',
    '.+\\.interface\\.ts$',
    '.+\\.module\\.ts$',
    '.+/main\\.ts$',
    '.+/index\\.ts$',
  ],
};
```

### Penjelasan Parameter:
- **`coverageThreshold.global`**: Ditetapkan pada 80% untuk statements, branches, functions, dan lines sesuai enterprise benchmark Permana Tech (D-14, D-17).
- **`coveragePathIgnorePatterns`**:
  - `.+\\.dto\\.ts$`: Mengabaikan boilerplate transfer objek dan dekorator class-transformer.
  - `.+\\.interface\\.ts$`: Mengabaikan definisi tipe murni tanpa runtime logic.
  - `.+\\.module\\.ts$`: Mengabaikan deklarasi modul NestJS `@Module()`.
  - `.+/main\\.ts$`: Mengabaikan berkas bootstrap aplikasi.
  - `.+/index\\.ts$`: Mengabaikan barrel re-export.

---

## 4. Kalibrasi Per-Project Jest Configuration

Setiap berkas konfigurasi Jest di tingkat project (`apps/*/jest.config.cts` dan `libs/*/jest.config.cts`) mewarisi preset `jest.preset.js`.
Jika terdapat project yang memerlukan `collectCoverageFrom` spesifik, pastikan pola berikut tetap terjaga:
- Tetap memasukkan `src/**/*.ts` untuk cakupan logika bisnis menyeluruh.
- Mengecualikan berkas tes (`!src/**/*.spec.ts`).
- Mengandalkan `coveragePathIgnorePatterns` dari preset untuk mengecualikan boilerplate secara sentral.

---

## 5. Kalibrasi `.husky/pre-push` & Kebijakan Zero-Bypass

Berkas `.husky/pre-push`:
```sh
npm run test:contract && npm run test:unit
```

### Kebijakan Penegakan:
1. Setiap push commit ke remote repository WAJIB melalui eksekusi hook pre-push.
2. Exit code wajib **0** untuk kedua perintah (`test:contract` dan `test:unit`).
3. Penggunaan flag `--no-verify` **DILARANG KERAS**. Setiap upaya bypass akan memicu penolakan pada Skeptical Superior Review CTO.

---

## 6. Handoff 5 Pilar & Protokol Kaskade Berjenjang (PP-017 & PP-018)

Sesuai tata kelola software house, implementasi teknis dibagi ke dalam 5 pilar terstruktur:

### Pilar 1: Root Cause Analysis & Empirical Monorepo Coverage Boundary Audit (Selesai - Architect)
Audit coverage di 7 project monorepo membuktikan bahwa 100% threshold adalah penyebab kegagalan, sementara logika aplikasi berada pada range 90% - 99.7%.

### Pilar 2: Implementation of Prescriptive Preset (Backend Worker - Tier 3)
Worker mengaplikasikan perubahan `jest.preset.js` sesuai spesifikasi Bagian 3, memverifikasi `npm run test:unit` exit code 0.

### Pilar 3: Squad Code Review L1 (Lead Developer - Tier 2)
Lead Dev memverifikasi perubahan `jest.preset.js`, memastikan tidak ada file logika bisnis yang di-ignore, dan memvalidasi kelulusan seluruh project test suites.

### Pilar 4: Independent Verification & D-17 Certification (Lead QA - Tier 2)
QA memvalidasi seluruh vektor uji D-24 (TV-01 s/d TV-05), menjalankan pre-push hook simulasi, dan menerbitkan Sertifikat D-17 QA Clearance.

### Pilar 5: Skeptical Superior Review & Continuous Delivery (CTO - Tier 1)
CTO mengaudit hasil akhir secara empiris, menyetujui merge/push ke `origin/master` tanpa `--no-verify` (PP-019), dan melapor tertutup ke CEO Pak Dedi (PP-018).
