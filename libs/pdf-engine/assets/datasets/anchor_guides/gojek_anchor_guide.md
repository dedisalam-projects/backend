# Panduan Desain & Anchor Point AI: Dokumen Gojek (Resmi)

Panduan ini diekstrak secara matematis dari analisis **88 file PDF original Gojek** di direktori dataset. Digunakan sebagai acuan baku bagi AI (LLM / Agent) untuk menentukan koordinat anchor, alignment teks, hirarki tipografi, dan margin tanpa estimasi visual.

---

## 1. Spesifikasi Kanvas Dokumen
- **Ukuran Kanvas**: A4 Portrait (`595.00 pt x 842.00 pt`)
- **Total Halaman Baku**: 2 Halaman
  - **Halaman 1**: Bukti Pembayaran / Receipt Perjalanan
  - **Halaman 2**: Faktur Pajak Jasa Aplikasi (PPN)
- **Engine Render Asli**: `wkhtmltopdf 0.12.6.x` (Qt 4.8.7)
- **Toleransi Baku**:
  - Posisi Teks / Anchor: `<= 0.35 pt`
  - Bounding Box / Line Drawing: `<= 0.50 pt`

---

## 2. Koordinat Anchor Sumbu X (Master Alignment Axes)

### Halaman 1 (Bukti Pembayaran)
| Fungsi Elemen | Tipe Anchor | Koordinat X (pt) | Toleransi | Catatan Penggunaan AI |
|---|---|---|---|---|
| **Header (Tanggal & ID Pesanan)** | `right` | **467.05 pt** | ±0.10 pt | Teks header selalu rata kanan di sumbu ini |
| **Greeting ('Hai...', 'Makasih...')** | `left` | **127.88 pt** | ±0.05 pt | Margin kiri area greeting |
| **Label Rincian Pembayaran** | `left` | **135.66 pt** | ±0.05 pt | Kolom item rincian bayar, biaya perjalanan, dll. |
| **Nominal Rincian Pembayaran** | `right` | **459.16 pt** | ±0.15 pt | Nominal uang rata kanan (Rp...) |
| **Detail Perjalanan & Driver** | `left` | **135.66 pt** | ±0.05 pt | Nama driver, plat kendaraan, rute jemput/tujuan |
| **Footer / Bantuan Link** | `left` | **135.66 pt** | ±0.05 pt | Tautan bantuan, asuransi, alamat GoTo |

### Halaman 2 (Faktur Pajak)
| Fungsi Elemen | Tipe Anchor | Koordinat X (pt) | Toleransi | Catatan Penggunaan AI |
|---|---|---|---|---|
| **Header Faktur (Tanggal & ID)** | `right` | **467.05 pt** | ±0.10 pt | Konsisten dengan Halaman 1 |
| **Judul 'Faktur' & Subtitle PPN** | `left` | **127.88 pt** | ±0.05 pt | Judul besar faktur di kiri atas |
| **Label Item Faktur** | `left` | **135.66 pt** | ±0.05 pt | 'Biaya jasa aplikasi', 'Diskon', dsb. |
| **Nominal Item Faktur** | `right` | **459.16 pt** | ±0.15 pt | Nilai uang jasa aplikasi rata kanan |
| **Legal Entitas & NPWP** | `left` | **127.88 pt** | ±0.05 pt | 'PT GoTo Gojek Tokopedia Tbk', NPWP, Alamat |

---

## 3. Zona Pembagian Horizontal Sumbu Y (Page Bands)

```
0 pt ─────── [HEADER ZONE: y = 15 ~ 50 pt] ─── (Tanggal & ID Pesanan @ x=467)
            
60 pt ────── [GREETING ZONE: y = 80 ~ 125 pt] ─── ('Hai...', 'Makasih...')
            
135 pt ───── [TOTAL AMOUNT BOX: y = 140 ~ 175 pt] ─── ('Total dibayar', 'Rp...')
            
180 pt ───── [PAYMENT BREAKDOWN: y = 180 ~ 315 pt] ─── (Label @ 135.66, Rp @ 459.16)
            
320 pt ───── [TRIP DETAIL: y = 320 ~ 570 pt] ─── (Driver, Plat, Rute Jemput & Tiba)
            
580 pt ───── [FOOTER & LEGAL: y = 580 ~ 750 pt] ─── (Asuransi, Kontak, Pasaraya)
842 pt ────────────────────────────────────────────────────────────────────────
```

---

## 4. Tipografi & Kamus Warna (Design Tokens)

### Hierarki Ukuran Font (Font Sizes)
- **Judul Layanan ('Makasih udah pesan...')**: `12.58 pt` (Bold / Semi-bold)
- **Label Utama / Header Nama**: `9.60 pt` (Medium / Regular)
- **Teks Standar Dokumen (Body)**: `8.83 pt` (Ukuran paling dominan, 80%+ teks)
- **Nominal Total Pembayaran**: `10.37 pt` (Bold)
- **Teks Sekunder / Legal / Tanggal Kecil**: `7.00 pt` ~ `7.50 pt`

### Palet Warna (Color Palette)
- **Teks Primer (Hitam)**: `#000000` (atau `#262626` tergantung varian render)
- **Teks Sekunder / Abu-abu**: `#4a4a4a` / `#717171` (untuk alamat detail dan label tanggal)
- **Tautan / Link Bantuan**: `#0000ee` (atau hijau `#00aa13` pada beberapa elemen tombol)
- **Diskon / Pengurangan**: `#000000` dengan awalan minus `-Rp...`

---

## 5. Instruksi AI untuk Penempatan Teks (Anchor Rules)

1. **Aturan Kolom Pembayaran**:
   - Jika teks adalah **nama biaya** (kiri), gunakan `align: left` dengan `anchor: 135.66 pt`.
   - Jika teks adalah **nominal harga** (kanan), gunakan `align: right` dengan `anchor: 459.16 pt`.
2. **Aturan ID Pesanan & Tanggal**:
   - Format tanggal header dan ID pesanan (`ID pesanan: RB-XXXXXXX-XXXXXXXX`) **wajib** menggunakan `align: right` dengan `anchor: 467.05 pt`.
3. **Aturan Detail Driver & Kendaraan**:
   - Nama driver, plat kendaraan (misal `B1141ZOF`), dan tipe kendaraan diletakkan di `x = 135.66 pt`.
4. **Aturan Halaman 2 (Faktur)**:
   - Lebar tabel faktur persis sama dengan tabel pembayaran Halaman 1 (x_left = 135.66 pt, x_right = 459.16 pt).

---
*Panduan ini dihasilkan secara otomatis oleh `aset/py_scripts/analyze_gojek_anchors.py`.*
