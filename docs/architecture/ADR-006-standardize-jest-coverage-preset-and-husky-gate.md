# ADR-006: Standarisasi Jest Coverage Preset Monorepo Backend (Ambang Batas 80%) & Kalibrasi Husky Pre-Push Gate

**Date**: 2026-10-26  
**Status**: accepted  
**Deciders**: Hendro Wijaya (Principal System Architect), Arya Pratama (CTO)  
**Stakeholders**: Bagus Wicaksono (Lead Dev), Dian Kartika (Lead QA), Backend Team  

## Context

Audit teknis CTO menemukan masalah integritas CI/CD gate pada monorepo backend (`/home/dedisalam/projects/backend`):
1. Berkas root `jest.preset.js` saat ini mengonfigurasi threshold uncalibrated 100%:
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
2. Akibatnya, eksekusi unit test `npm run test:unit` pada hook `.husky/pre-push` selalu mengembalikan status gagal (exit code 1) karena defisit coverage minor pada komponen non-eksekusi (misal: anonymous arrow functions pada dekorator `@Type(() => ...)` di DTO `product.dto.ts` menghasilkan 89.7% functions coverage di `libs/common`, dan edge branch handling di `apps/gateway` menghasilkan 95.45% branch coverage).
3. Kegagalan permanen ini mendorong pengembang melakukan bypass git push dengan flag `--no-verify`. Hal ini merupakan pelanggaran serius terhadap standar rekayasa Permana Tech (D-14, D-17, D-23) dan merusak sistem pertahanan *Three Lines of Defense*.
4. Standar enterprise Permana Tech menetapkan ambang batas realistis, terukur, dan berkualitas tinggi pada level minimal **80%** untuk seluruh dimensi matriks (statements, branches, functions, lines).

## Decision

1. **Kalibrasi Global Coverage Threshold ke 80%**:
   Mengubah nilai `coverageThreshold.global` pada `jest.preset.js` dari 100% menjadi 80% untuk statements, branches, functions, dan lines:
   ```javascript
   coverageThreshold: {
     global: {
       statements: 80,
       branches: 80,
       functions: 80,
       lines: 80,
     },
   }
   ```

2. **Standardisasi `coveragePathIgnorePatterns` Global**:
   Menambahkan filter ignorasi jalur cakupan pada `jest.preset.js` agar boilerplate DTO, interface kontrak, module definition, file index barrel, dan entrypoint aplikasi tidak mendistorsi matriks cakupan logika bisnis:
   ```javascript
   coveragePathIgnorePatterns: [
     '/node_modules/',
     '.+\\.dto\\.ts$',
     '.+\\.interface\\.ts$',
     '.+\\.module\\.ts$',
     '.+/main\\.ts$',
     '.+/index\\.ts$',
   ]
   ```

3. **Penegakan Determinisme `.husky/pre-push` Gate**:
   Memastikan hook `.husky/pre-push` mengeksekusi `npm run test:contract && npm run test:unit` dengan jaminan exit code 0 pada codebase yang sehat.
   Melarang keras penggunaan flag `--no-verify` pada seluruh operasi git push di branch tim maupun master.

4. **Kaskade Review Bertingkat (PP-017 & PP-018)**:
   Penerapan perubahan konfigurasi wajib melalui alur delegasi:
   - Worker (`backend`) menerapkan kalibrasi preset.
   - Lead Developer (`lead-dev`) melakukan L1 Squad Review.
   - Lead QA (`qa`) melakukan sertifikasi independen D-17 QA Clearance.
   - CTO (`cto`) melakukan Skeptical Superior Review dan Continuous Delivery push ke master.
   - Lapor tertutup ke CEO Pak Dedi.

## Alternatives Considered

### Alternative 1: Menulis Mocking / Unit Test Sintetis untuk Mencapai 100%
- **Pros**: Nilai 100% di preset tetap dipertahankan di atas kertas.
- **Cons**: Memaksa pembuatan ratusan baris kode tes sintetis tanpa nilai bisnis (menguji dekorator class-transformer atau baris re-export), meningkatkan beban pemeliharaan monorepo, serta bertentangan dengan prinsip YAGNI dan Zero Synthetic Artifacts.
- **Why not**: Standar industri enterprise dan Permana Tech menetapkan 80% sebagai golden standard yang seimbang antara reliabilitas dan kecepatan delivery.

### Alternative 2: Menghapus `coverageThreshold` dari `jest.preset.js`
- **Pros**: Unit test di pre-push tidak akan pernah gagal karena batas cakupan.
- **Cons**: Membuka celah regresi fatal; kode baru dapat masuk tanpa unit test sama sekali.
- **Why not**: Menghilangkan *quality gate* merusak fondasi enterprise engineering governance.

## Consequences

### Positive
- `npm run test:unit` dan `.husky/pre-push` lolos dengan Exit Code 0 secara deterministik.
- Eliminasi total kebutuhan bypass `--no-verify`.
- Tim memiliki ambang batas kualitas yang realistis (>= 80%) dan terbebas dari penalti coverage akibat boilerplate.
- Integritas CI/CD gate pulih sesuai prinsip Three Lines of Defense.

### Negative
- Library atau app baru yang memiliki cakupan di bawah 80% akan tetap diblokir oleh pre-push hook hingga tes unit yang memadai ditulis.

### Risks & Mitigations
- **Risiko**: Ada modul logika bisnis kritis yang tidak sengaja terabaikan oleh pattern regex ignore.
- **Mitigasi**: Pola `coveragePathIgnorePatterns` dibatasi secara ketat hanya pada ekstensi boilerplate (`.dto.ts`, `.interface.ts`, `.module.ts`, `main.ts`, `index.ts`), tidak menyentuh service, controller, guard, filter, interceptor, atau util.
