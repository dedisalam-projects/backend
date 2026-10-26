# D-10 Technical Blueprint: NX Dependency Boundary Standardization & PDF Engine Lint Gate Remediation

**Document ID**: D-10-SPEC-BE-ARCH-004  
**Author**: Hendro Wijaya, Principal System Architect (Tier 2)  
**Approver**: Arya Pratama, Chief Technology Officer (Tier 1)  
**Stakeholders**: Bagus Wicaksono (Lead Dev), Dian Kartika (Lead QA), Backend Team  
**Status**: APPROVED / READY FOR IMPLEMENTATION  
**Target Codebase**: `/home/dedisalam/projects/backend`  

---

## 1. Executive Summary & Root Cause Analysis

Audit teknis CTO menemukan dua titik kegagalan pada pipeline linting monorepo backend yang menyebabkan eksekusi `nx run-many --target=lint --all` gagal dengan **Exit Code 1**:

1. **Defisit Manifest `libs/common/package.json`**:
   - Pustaka `libs/common` mengimpor pustaka `@nestjs/jwt`, `nestjs-pino`, `bcrypt`, dan `mongoose` dalam kodenya (`src/utils/ws-auth.helper.ts`, `src/utils/auth-operations.helper.ts`, `src/filters/all-exceptions.filter.ts`).
   - Berkas `libs/common/package.json` belum mencantumkan keempat paket ini di field `dependencies`.
   - Rule `@nx/dependency-checks` memicu error fatal:
     `The "common" project uses the following packages, but they are missing from "dependencies": @nestjs/jwt, nestjs-pino, bcrypt, mongoose`.

2. **Akumulasi 18 Error ESLint pada `libs/pdf-engine`**:
   - `src/core/fonts.js` (1 error): Terjadi duplikasi definisi `function registerAllFonts(doc)` pada baris 34 dan 102 yang memicu rule `@typescript-eslint/adjacent-overload-signatures`.
   - `src/templates/gojek/gocar.js` (1 error): Variabel `p` dideklarasikan dengan `let p = pageData;` namun tidak pernah direassign, memicu rule `prefer-const`.
   - 16 blok try-catch kosong (`no-empty`) yang mengabaikan error tanpa jejak:
     - `src/core/helpers.js` (1 lokasi): Baris 23 pada pembacaan font measurer doc.
     - `src/core/openpdf.js` (3 lokasi): Baris 43, 93, 143 pada pengecekan Java runner dan pembersihan file temporer.
     - `src/core/stream.js` (3 lokasi): Baris 25, 26, 56 pada destruksi stream dan stream fallback.
     - `src/core/weasyprint.js` (4 lokasi): Baris 34, 43, 101, 104 pada pengecekan CLI binary dan unlinking file temporer.
     - `src/core/wkhtml.js` (4 lokasi): Baris 48, 57, 151, 154 pada pengecekan binary system/docker dan unlinking file temporer.
     - `src/templates/html/shared.js` (1 lokasi): Baris 18 pada pembacaan base64 image/font.

---

## 2. Preskriptif Teknis Perubahan

### 2.1. Standarisasi `libs/common/package.json`

Tambahkan 4 paket yang hilang ke dalam blok `dependencies` pada `/home/dedisalam/projects/backend/libs/common/package.json`:

```json
{
  "name": "@dedisalam/common",
  "version": "0.0.1",
  "private": true,
  "type": "commonjs",
  "main": "./src/index.js",
  "types": "./src/index.d.ts",
  "dependencies": {
    "tslib": "^2.3.0",
    "class-validator": "^0.15.1",
    "class-transformer": "^0.5.1",
    "@nestjs/swagger": "^11.4.6",
    "@nestjs/passport": "^11.0.5",
    "@nestjs/websockets": "^11.1.28",
    "@nestjs/microservices": "^11.1.28",
    "passport-jwt": "^4.0.1",
    "@nestjs/config": "^4.0.4",
    "node-vault": "^0.12.0",
    "ioredis": "*",
    "jsonwebtoken": "^9.0.2",
    "socket.io": "^4.8.3",
    "cookie": "^0.7.2",
    "@nestjs/jwt": "^11.0.2",
    "nestjs-pino": "^4.6.1",
    "bcrypt": "^6.0.0",
    "mongoose": "^9.7.4"
  },
  "peerDependencies": {
    "@nestjs/common": "^11.1.28",
    "@nestjs/core": "*",
    "express": "*",
    "rxjs": "*"
  }
}
```

---

### 2.2. Remidiasi Kode `libs/pdf-engine`

#### A. `libs/pdf-engine/src/core/fonts.js`
- **Tindakan**: Hapus deklarasi parsial `function registerAllFonts(doc)` pada baris 34-37:
  ```javascript
  // HAPUS BLOK INI:
  function registerAllFonts(doc) {
      registerGojekFonts(doc);
      registerTravelokaFonts(doc);
  }
  ```
- Deklarasi kanonikal lengkap tetap berada pada baris 102 yang mendaftarkan seluruh font (Gojek, Traveloka, inDrive, Jackal).

#### B. `libs/pdf-engine/src/templates/gojek/gocar.js`
- **Tindakan**: Ubah baris 473:
  ```javascript
  // SEBELUM:
  let p = pageData;

  // SESUDAH:
  const p = pageData;
  ```

#### C. Remidiasi 16 Blok `no-empty` Try-Catch
Ganti blok catch kosong dengan penanganan logging graceful menggunakan safe diagnostic warning atau komentar terstruktur berstandar linter:

1. **`src/core/helpers.js` (baris 23)**:
   ```javascript
   } catch (e) {
       // Graceful fallback: measurer doc handles missing fonts by falling back to default PDFKit typography
   }
   ```

2. **`src/core/openpdf.js`**:
   - Baris 43:
     ```javascript
     } catch (e) {
         // Local Java CLI detection failed or executable not in path; continue probing
     }
     ```
   - Baris 93 & 143:
     ```javascript
     } catch (e) {
         // Non-critical cleanup failure on temporary json/pdf payload
     }
     ```

3. **`src/core/stream.js`**:
   - Baris 25 & 26:
     ```javascript
     try { stream.destroy(); } catch (e) { /* ignore cleanup error */ }
     try { doc.end(); } catch (e) { /* ignore document end error */ }
     ```
   - Baris 56:
     ```javascript
     try { doc.end(); } catch (e) { /* ignore buffer document end error */ }
     ```

4. **`src/core/weasyprint.js`**:
   - Baris 34 & 43:
     ```javascript
     } catch (e) {
         // Binary detection probe failed, fallback to next runner candidate
     }
     ```
   - Baris 101 & 104:
     ```javascript
     } catch (e) {
         // Ignore non-fatal unlink error for temporary HTML/PDF scratch files
     }
     ```

5. **`src/core/wkhtml.js`**:
   - Baris 48 & 57:
     ```javascript
     } catch (e) {
         // Binary detection probe failed for wkhtmltopdf/docker, fallback to next runner
     }
     ```
   - Baris 151 & 154:
     ```javascript
     } catch (e) {
         // Ignore non-fatal unlink error for temporary HTML/PDF scratch files
     }
     ```

6. **`src/templates/html/shared.js` (baris 18)**:
   ```javascript
   } catch (e) {
       // Graceful fallback for non-existent asset file; returns empty string
   }
   ```

---

## 3. Matriks Quality Gate & Two-Tier Review Workflow (PP-017 & PP-018)

Sesuai PP-017, penyelesaian refactor ini wajib mengikuti kaskade review berjenjang:

```
[System Architect - T2] (t_526afb63)
       │
       ▼ (menerbitkan ADR-007, D-10, D-25)
[Worker Backend - T3]
       │
       ▼ (implementasi kode & lulus 100% linting)
[Lead Dev Review - T2]
       │
       ▼ (L1 Code Review, Zero 'any', clean code, zero regressions)
[Lead QA Certification - T2]
       │
       ▼ (Sertifikat D-17 QA, verifikasi empiris linting & test suite)
[CTO Superior Skeptical Review - T1]
       │
       ▼ (Validasi bukti empiris, CD merge ke master via PP-019)
[Lapor CEO Pak Dedi - PP-018]
```

---

## 4. Acceptance Criteria (Definisi Selesai)

1. `libs/common/package.json` memiliki field `dependencies` yang lengkap (`@nestjs/jwt`, `nestjs-pino`, `bcrypt`, `mongoose`).
2. Perintah `./node_modules/.bin/nx lint common` lulus dengan **0 errors**.
3. Perintah `./node_modules/.bin/nx lint pdf-engine` lulus dengan **0 errors**.
4. Perintah `./node_modules/.bin/nx run-many --target=lint --all` selesai dengan **Exit Code 0** di seluruh 10 proyek monorepo.
5. Unit test suite monorepo (`npm run test:contract && npm run test:unit`) tetap stabil dan lulus 100%.
