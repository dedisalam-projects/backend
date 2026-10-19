# Panduan Refactoring Arsitektur JavaScript PDF Generator

Panduan ini dibuat secara otomatis oleh `py_scripts/generate_js_refactor_guide.py` berdasarkan analisis komparatif antara:
1. **Kebutuhan Matematis Ground Truth** (18 PDF Original Traveloka & 12 Dataset Gojek).
2. **Implementasi Script JS Aktif** di direktori `src/` dan root CLI.

---

## 1. Executive Summary & Audit Temuan

- **Total File JS Dianalisis**: `18` file.
- **Total Dokumen Acuan Ground Truth**: `18` file Traveloka (`A4: 595.28 x 827.70 pt`).
- **Rentang Lebar Kolom No. (`col1_width`)**: `[19.91, 20.4, 20.55, 20.81, 21.86, 23.36, 23.73]` pt.

### A. Redundansi & Duplikasi Fungsi (Code Smells - DRY Violation)
| Nama Fungsi | Ditemukan di File | Rekomendasi Solusi |
|---|---|---|
| **`formatRupiah`** | `src/templates/gojek/gocar.js`<br>`src/templates/html/gocar.js`<br>`src/templates/html/goride.js`<br>`src/templates/traveloka/bus.js`<br>`src/templates/traveloka/hotel.js` | Pindahkan ke modul utilitas bersama `src/core/helpers.js` |
| **`wrapText`** | `src/templates/gojek/gocar.js`<br>`src/templates/traveloka/index.js` | Pindahkan ke modul utilitas bersama `src/core/helpers.js` |

### B. Ketahanan Stream I/O & Memory Safety (Stream Resilience)
| File Generator / Dispatcher | `stream.on('error')` | `doc.on('error')` | Kesiapan Produksi |
|---|:---:|:---:|:---:|
| `generate_pdfkit.js` | [MISSING] | [MISSING] | **RAWAN LEAK** (Perlu refactor) |
| `src/templates/traveloka/renderer.js` | [PASS] | [MISSING] | **RAWAN LEAK** (Perlu refactor) |

---

## 2. Blueprint Target Arsitektur Baru (Target Clean Architecture)

Untuk menjaga keteraturan kode saat menambah template baru (seperti Kereta Api, Pesawat, GoFood), arsitektur JS harus dibagi ke dalam 4 layer berjenjang:

```
aset/
├── generate.js                  # [Layer 1] Unified CLI & Central Entry Point
├── src/
│   ├── core/                   # [Layer 2] Shared Engine & PDFKit Primitives
│   │   ├── canvas.js           # Page dimensions, standard margins, color tokens
│   │   ├── fonts.js            # Unified font registration (Arial, DejaVu, Nimbus)
│   │   ├── helpers.js          # Shared formatRupiah, wrapText, getAmountX
│   │   └── stream.js           # Stream pipeline with robust error rejection
│   │
│   ├── normalizers/            # [Layer 3] Schema Sanitization & Auto-Calculation
│   │   ├── traveloka.js        # Compute col1_width, wrap date lines, format spans
│   │   └── gojek.js            # Compute item totals, sanitize timestamps
│   │
│   └── templates/              # [Layer 4] Pure Presentational Drawing Engines
│       ├── traveloka/          # Traveloka templates (Header, Bus, Hotel, Table, Footer)
│       └── gojek/              # Gojek templates (GoCar, GoRide, Comfort, Hemat)
```

---

## 3. Resep Refactoring Konkret (Step-by-Step Refactoring Recipes)

### Resep 1: Unifikasi Format Mata Uang & Angka Tabular
**Masalah:** Fungsi `formatRupiah` ditulis ulang di 4 file berbeda dengan penanganan tipe data yang tidak seragam.
**Solusi:** Buat modul terpusat di `src/core/helpers.js`:
```javascript
// src/core/helpers.js
function formatRupiah(num) {
    if (typeof num === 'string') return num.trim();
    if (num === null || num === undefined || isNaN(num)) return '0';
    return num.toLocaleString('id-ID');
}

function getAmountX(doc, str, targetRightX, baseWidth = 535.69) {
    const cleanStr = String(str).trim();
    if (cleanStr.length === 7) return targetRightX === 482.00 ? 454.91 : 535.69;
    if (cleanStr.length === 6) return targetRightX === 482.00 ? 459.08 : 539.85;
    return targetRightX - doc.widthOfString(cleanStr);
}
```

### Resep 2: Normalizer Layer Terpisah Sebelum Render
**Masalah:** Logika layout (seperti menentukan hari dalam tanggal transaksi atau memecah nama penumpang multiline) tercampur di dalam fungsi gambar PDFKit.
**Solusi:** Pisahkan proses normalisasi data JSON sebelum memanggil fungsi `doc.text()`:
```javascript
// src/normalizers/traveloka.js
function normalizeTravelokaData(raw) {
    const data = { ...raw };
    // 1. Standardize col1_width
    if (typeof data.col1_width !== 'number') {
        const isHotel = (data.category || '').toLowerCase().includes('hotel');
        data.col1_width = isHotel ? 20.40 : 19.91;
    }
    // 2. Normalize multiline transaction date
    if (typeof data.transaction_date === 'string' && data.transaction_date.includes('\n')) {
        data.transaction_date_lines = data.transaction_date.split('\n');
    }
    // 3. Normalize footer terms URL based on payment method
    const payMethod = (data.payment_method || data.payment_bar_method || '').toLowerCase();
    const isPaylater = payMethod.includes('gopay') || payMethod.includes('paylater');
    if (!data.footer_terms) {
        data.footer_terms = isPaylater ?
            'Syarat dan Ketentuan berlaku. Silakan lihat https://www.traveloka.com/en-id/travelokapay/paylater/termsandconditions' :
            'Syarat dan Ketentuan berlaku. Silakan lihat http://www.traveloka.com/termsandconditions';
        data.footer_x = isPaylater ? 101.44 : 149.32;
    }
    return data;
}
```

### Resep 3: Wrapper Eksekusi Stream PDF yang Aman (Zero Memory Leak)
**Masalah:** `generateTravelokaPdf` dan `generateGojekPdf` memiliki potensi hang jika stream penulisan disk mengalami permission error atau disk full.
**Solusi:** Gunakan wrapper utilitas stream terstandarisasi:
```javascript
// src/core/stream.js
function writePdfToFile(doc, outputPath) {
    return new Promise((resolve, reject) => {
        const stream = fs.createWriteStream(outputPath);
        stream.on('finish', () => resolve(outputPath));
        stream.on('error', (err) => {
            doc.end();
            reject(new Error(`Failed to write PDF to ${outputPath}: ${err.message}`));
        });
        doc.on('error', (err) => {
            stream.destroy();
            reject(new Error(`PDFKit Document generation error: ${err.message}`));
        });
        doc.pipe(stream);
    });
}
```

### Resep 4: Unified CLI Entry Point
**Masalah:** Terdapat script terpisah `generate_traveloka.js` dan `generate_pdfkit.js` dengan sintaks CLI yang berbeda.
**Solusi:** Buat file entry point `generate.js` tunggal yang fleksibel:
```bash
# Sintaks terpadu baru:
node generate.js input.json output.pdf
# Secara otomatis mengenali tipe dokumen dari isi JSON (Traveloka / Gojek)
```

---

## 4. Checklist Rencana Kerja Refactoring

- [ ] **Tahap 1 (Ekstraksi Core)**: Buat `src/core/helpers.js`, `src/core/canvas.js`, `src/core/fonts.js`, dan `src/core/stream.js`.
- [ ] **Tahap 2 (Sanitisasi Layer Normalizer)**: Buat `src/normalizers/traveloka.js` dan pindahkan perhitungan `col1_width` dari renderer ke normalizer.
- [ ] **Tahap 3 (Pembersihan Template JS)**: Import modul core ke dalam `src/templates/traveloka/bus.js` dan `hotel.js`, hapus duplikasi `formatRupiah`.
- [ ] **Tahap 4 (Stream Error Handling)**: Ganti penulisan stream manual dengan `writePdfToFile` di seluruh dispatcher.
- [ ] **Tahap 5 (Validasi Regresi)**: Jalankan `python py_scripts/batch_audit_all_traveloka.py` untuk memastikan seluruh 18 file tetap 100% PASS.
