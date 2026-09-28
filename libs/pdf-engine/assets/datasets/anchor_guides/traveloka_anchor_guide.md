# Panduan Desain & Anchor Point AI: Dokumen Traveloka (Resmi)

Panduan ini diekstrak secara matematis dari analisis **18 file PDF original Traveloka** (`OpenPDF 1.3.30`) yang mencakup voucher **Tiket Bus & Shuttle** (13 file) dan **Hotel / Akomodasi** (5 file). Digunakan sebagai acuan baku bagi AI (LLM / Agent) untuk penempatan teks, tabel presisi, dan styling.

---

## 1. Spesifikasi Kanvas Dokumen
- **Ukuran Kanvas**: Format A4 Traveloka (`595.28 pt x 827.70 pt`)
- **Total Halaman Baku**: 1 Halaman (Single-page Bukti Pembelian / Receipt)
- **Engine Render Asli**: `OpenPDF 1.3.30`
- **Toleransi Baku**:
  - Posisi Teks / Anchor: `<= 0.35 pt`
  - Bounding Box / Kotak Garis: `<= 0.50 pt`

---

## 2. Koordinat Anchor Sumbu X Master (Master Alignment Grid)

### A. Header & Metadata Pembayaran (Top Section)
| Elemen | Tipe | Koordinat X | Keterangan |
|---|---|---|---|
| **Receipt Title & Meta** | `left` | **37.30 pt** | 'BUKTI PEMBELIAN (RECEIPT)', 'Nomor : #...', 'Tanggal : ...' |
| **Payment Bar - PO Number** | `left` | **34.30 pt** | 'P.O. NUMBER: XXXXXXXXXX' |
| **Payment Bar - Pembelian Melalui** | `left` | **169.00 pt** | 'PEMBELIAN MELALUI: Virtual Account / GoPay' |
| **Payment Bar - Status Transaksi** | `left` | **411.40 pt** | 'DETAIL TRANSAKSI: Lunas' |

### B. Dua Kolom Informasi: Pemesan vs Perusahaan (2-Column Info)
| Kolom Kiri: DATA PEMESAN | X (pt) | Kolom Kanan: DETAIL PERUSAHAAN | X (pt) |
|---|---|---|---|
| **Header Section** | `34.30 pt` | **Header Section** | `303.60 pt` |
| **Label** (Nama, Email, Kontak) | `34.30 pt` | **Label** (Nama, NPWP, Alamat) | `303.60 pt` |
| **Tanda Titik Dua (:) & Nilai** | `94.30 pt` | **Tanda Titik Dua (:) & Nilai** | `363.60 pt` |
| - | - | **Alamat Multiline Indent** | `367.40 pt` |

---

## 3. Spesifikasi Presisi Anchor Tabel (DETAIL PEMBELIAN)

Semua dokumen Traveloka (baik Bus maupun Hotel) menggunakan grid 6 kolom yang **100% konsisten**:

| No | Nama Kolom Tabel | Tipe Anchor | Koordinat X (pt) | Keterangan Alignment |
|---|---|---|---|---|
| 1 | **No.** | `left` | **32.50 pt** | Nomor urut item tabel |
| 2 | **Jenis Barang** | `left` | **52.40 pt** | 'Akomodasi' atau 'Tiket Bus' |
| 3 | **Deskripsi** | `left` | **133.20 pt** | Nama hotel/rute perjalanan dan jadwal |
| 4 | **Jml.** | `center` | **370.10 pt** | Kuantitas tiket / jumlah kamar |
| 5 | **Harga satuan Rp** | `right` | **482.00 pt** | Nilai nominal rata kanan |
| 6 | **Total Rp** | `right` | **562.80 pt** | Nilai nominal rata kanan |

### Rangkuman Pembayaran (Footer Table Summary):
- **Label** (`TOTAL`, `Dibayar dengan ...`, `JUMLAH PEMBAYARAN`): Rata kiri pada **X = 382.60 pt**.
- **Nilai Angka / Nominal**: Rata kanan pada **X = 562.80 pt** (sejajar tegak lurus dengan kolom Total Rp).

---

## 4. Tipografi & Kamus Warna (Design Tokens)

### Hierarki Font:
- **Font Utama**: `ArialUnicodeMS` (dengan simbol 'Rp' menggunakan `Overpass-Regular`)
- **Ukuran Judul Bagian**: `9.00 pt` (`DETAIL PEMBAYARAN`, `DATA PEMESAN`, `DETAIL HOTEL`, `DETAIL PEMBELIAN`)
- **Ukuran Teks Isi Dokumen**: `7.50 pt` (Dipakai pada 85%+ teks dokumen)
- **Ukuran Teks Bantuan / Legal**: `6.80 pt` ~ `7.50 pt`

### Palet Warna:
- **Teks Hitam Utama**: `#000000`
- **Link Biru Traveloka**: `#0770cd` (pada link www.traveloka.com/help)
- **Banner Biru Bawah**: `#0194f3` (kotak footer penuh di bagian bawah `y = 802.9 pt ~ 827.6 pt`)
- **Teks Banner Footer**: `#ffffff` (Putih di atas background biru)
- **Abu-abu Bar Judul**: `#f2f3f3` (Background strip di `DETAIL PEMBAYARAN` & `DETAIL PEMBELIAN`)
- **Garis Border Tabel**: `#cdcdcd` (Border pembatas abu-abu tipis)

---

## 5. Instruksi AI untuk Penempatan Teks (Anchor Rules)

1. **Aturan Nilai Uang (Harga Satuan & Total)**:
   - Gunakan format angka desimal Indonesia dengan titik (`244.821`, `120.000`).
   - Jangan pernah meletakkan angka total dengan `align: left`. **Wajib** `align: right` dengan anchor `562.80 pt`.
2. **Aturan Pemisah Kolom Informasi**:
   - Kolom Pemesan dan Kolom Perusahaan dipisahkan secara simetris: Pemesan mulai di `x = 34.30 pt`, Perusahaan mulai di `x = 303.60 pt` (tepat di tengah kanvas $595.28 / 2 pprox 297.64$ pt).
3. **Aturan Banner Footer**:
   - Teks *'Syarat dan Ketentuan berlaku...'* berada di dalam banner biru bawah dengan warna teks putih `#ffffff` pada `y = 812.20 pt`.

---
*Panduan ini dihasilkan secara otomatis oleh `aset/py_scripts/analyze_traveloka_anchors.py`.*
