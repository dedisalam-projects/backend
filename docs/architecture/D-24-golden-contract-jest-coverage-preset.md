# D-24 Golden Contract: Test Vectors for Jest Coverage Preset & Husky Pre-Push Gate
**Document ID**: D-24-CONTRACT-TEST-003  
**Author**: Hendro Wijaya, Principal System Architect (Tier 2)  
**Approver**: Arya Pratama, Chief Technology Officer (Tier 1)  
**Target Codebase**: `/home/dedisalam/projects/backend`  
**Related Documents**: `ADR-006`, `D-09-SPEC-BE-TEST-003`, `D-17-qa-clearance`  

---

## 1. Overview & Purpose

Dokumen ini mendefinisikan Vektor Uji Emas (*Golden Test Vectors*) untuk memvalidasi standarisasi konfigurasi `jest.preset.js` dan fungsionalitas hook `.husky/pre-push`. Vektor uji ini menjadi acuan mutlak bagi Worker Backend (`backend`), Lead Developer (`lead-dev`), dan Lead QA (`qa`) sebelum penerbitan Sertifikat D-17 QA Clearance.

---

## 2. Test Vectors (TV-01 s/d TV-05)

### TV-01: Global Coverage Threshold Calibration (Enterprise >= 80%)
- **Target**: `/home/dedisalam/projects/backend/jest.preset.js`
- **Metode Pengujian**: Inspeksi statis objek konfigurasi `coverageThreshold.global`.
- **Kriteria Lolos (Pass Criteria)**:
  - `statements`: persis **80**
  - `branches`: persis **80**
  - `functions`: persis **80**
  - `lines`: persis **80**
  - Tidak ada nilai 100% yang tersisa pada threshold global preset.

### TV-02: Coverage Path Ignore Patterns Validation
- **Target**: `/home/dedisalam/projects/backend/jest.preset.js`
- **Metode Pengujian**: Verifikasi keberadaan dan regex syntax pada array `coveragePathIgnorePatterns`.
- **Kriteria Lolos (Pass Criteria)**:
  - Pola regex mencakup:
    1. `'/node_modules/'`
    2. `'.+\\.dto\\.ts$'`
    3. `'.+\\.interface\\.ts$'`
    4. `'.+\\.module\\.ts$'`
    5. `'.+/main\\.ts$'`
    6. `'.+/index\\.ts$'`
  - Tidak ada berkas logika bisnis (service, controller, guard, filter, interceptor, util) yang masuk dalam pola ignore.

### TV-03: Monorepo All-Project Unit Test Execution
- **Target**: Seluruh project monorepo (`apps/*`, `libs/*`)
- **Metode Pengujian**: Eksekusi `npm run test:unit` dari root direktori backend.
- **Kriteria Lolos (Pass Criteria)**:
  - Perintah `nx run-many --target=test --all --runInBand --coverage` selesai dengan **Exit Code 0**.
  - Ketujuh project (`notification-service`, `blip-services`, `auth-service`, `user-service`, `database`, `gateway`, `common`) berstatus sukses (*passed*).
  - Seluruh metrik cakupan (statements, branches, functions, lines) pada seluruh project mencapai atau melampaui **>= 80%**.

### TV-04: Contract Test Suite Determinism
- **Target**: `libs/common/src/test/contracts/event-contracts.spec.ts`
- **Metode Pengujian**: Eksekusi `npm run test:contract` dari root direktori backend.
- **Kriteria Lolos (Pass Criteria)**:
  - 100% unit tests pada suite kontrak lulus (11 passed).
  - Exit code pengujian adalah **0**.

### TV-05: Husky Pre-Push Hook End-to-End Simulation
- **Target**: `.husky/pre-push`
- **Metode Pengujian**: Eksekusi manual perintah hook `.husky/pre-push` (`npm run test:contract && npm run test:unit`).
- **Kriteria Lolos (Pass Criteria)**:
  - Eksekusi rantai pengujian lulus secara sekuensial.
  - Total durasi pengujian wajar dan deterministik.
  - Exit code akhir adalah **0**.
  - Operasi `git push` dapat dilakukan secara normal **tanpa** menggunakan flag bypass `--no-verify`.

---

## 3. Matriks Kepatuhan Verifikasi (Checklist)

| Vector ID | Deskripsi Vektor Uji | Target Verifikasi | Tooling / Command | Syarat Minimum Lolos |
|-----------|----------------------|-------------------|-------------------|----------------------|
| **TV-01** | Global Threshold 80% | `jest.preset.js` | Static File Inspection | 80% di 4 dimensi |
| **TV-02** | Ignore Boilerplate | `jest.preset.js` | Regex Pattern Check | 6 pola ignore boilerplate aktif |
| **TV-03** | Unit Test Monorepo | 7 Projects | `npm run test:unit` | Exit Code 0, 7/7 projects pass |
| **TV-04** | Contract Test Suite | Event Contracts | `npm run test:contract` | Exit Code 0, 11 tests pass |
| **TV-05** | Husky Pre-Push Gate | Git Hook Script | `.husky/pre-push` | Exit Code 0, Zero `--no-verify` |
