/**
 * KlikIndogrosir Direct MongoDB Seeder / Catalog Dump Script
 * Run inside MongoDB container via mongosh
 */

const targetDb = 'dedisalam';
const db = db.getSiblingDB(targetDb);

const productsCollection = db.getCollection('products');
const syncLogsCollection = db.getCollection('sync_logs');

// Pastikan indexes
productsCollection.createIndex({ plu: 1 }, { unique: true });
productsCollection.createIndex({ name: 'text', brand: 'text', category: 'text' });
productsCollection.createIndex({ category: 1 });
productsCollection.createIndex({ isAvailable: 1 });

const catalog = [
  {
    plu: '1834271',
    name: 'POP MIE INDOMIE GORENG CUP 80G',
    brand: 'POP MIE',
    category: 'MAKANAN INSTAN',
    description: 'Mi instan goreng cup dengan bumbu gurih khas Indomie lengkap dengan bawang goreng renyah.',
    imageUrl: 'https://img.klikindogrosir.com/images/products/1834270.png',
    unit: 'PCS',
    price: 4700,
    promoPrice: 4600,
    lowestPrice: 4183,
    pricingTiers: [
      { unit: 'PCS', minQty: 1, fraction: 1, price: 4600, label: 'Eceran (Promo)' },
      { unit: 'PCS', minQty: 6, fraction: 1, price: 4183, label: 'Grosir Sedang (Min. 6 Pcs)' },
      { unit: 'CTN', minQty: 1, fraction: 12, price: 50200, label: 'Kartonan (Isi 12 Cup)' }
    ],
    branch: { code: '04', name: 'INDOGROSIR BANDUNG' },
    isAvailable: true,
    spec: { length: 10.8, width: 10.8, height: 11.0, grossWeight: 105, bpom: 'MD240935007100027' },
    source: 'klikindogrosir',
    rawMetadata: { plu: '1834271', origin: 'klikapi.mitraindogrosir.co.id' },
    lastSyncedAt: new Date(),
    updatedAt: new Date()
  },
  {
    plu: '10001234',
    name: 'INDOMIE MI INSTAN GORENG SPESIAL 85G',
    brand: 'INDOMIE',
    category: 'MAKANAN INSTAN',
    description: 'Mi instan goreng legendaris dengan kecap manis, minyak bawang, bumbu bubuk gurih, dan taburan bawang goreng asli.',
    imageUrl: 'https://img.klikindogrosir.com/images/products/10001234.png',
    unit: 'PCS',
    price: 3100,
    promoPrice: 3000,
    lowestPrice: 2850,
    pricingTiers: [
      { unit: 'PCS', minQty: 1, fraction: 1, price: 3000, label: 'Eceran Satuan' },
      { unit: 'PACK', minQty: 5, fraction: 5, price: 2950, label: 'Paket 5 Pcs' },
      { unit: 'CTN', minQty: 1, fraction: 40, price: 114000, label: 'Dus / Karton (Isi 40 Pcs)' }
    ],
    branch: { code: '04', name: 'INDOGROSIR BANDUNG' },
    isAvailable: true,
    spec: { length: 14.0, width: 10.0, height: 3.5, grossWeight: 85, bpom: 'MD231509001002' },
    source: 'klikindogrosir',
    rawMetadata: { plu: '10001234', origin: 'klikapi.mitraindogrosir.co.id' },
    lastSyncedAt: new Date(),
    updatedAt: new Date()
  },
  {
    plu: '10002589',
    name: 'INDOMIE KUAH AYAM BAWANG 69G',
    brand: 'INDOMIE',
    category: 'MAKANAN INSTAN',
    description: 'Mi kuah rasa ayam bawang dengan kaldu gurih dan aroma minyak bawang yang harum menggugah selera.',
    imageUrl: 'https://img.klikindogrosir.com/images/products/10002589.png',
    unit: 'PCS',
    price: 3000,
    promoPrice: 2900,
    lowestPrice: 2750,
    pricingTiers: [
      { unit: 'PCS', minQty: 1, fraction: 1, price: 2900, label: 'Eceran' },
      { unit: 'PACK', minQty: 5, fraction: 5, price: 2850, label: 'Paket 5 Pcs' },
      { unit: 'CTN', minQty: 1, fraction: 40, price: 110000, label: 'Karton (40 Pcs)' }
    ],
    branch: { code: '04', name: 'INDOGROSIR BANDUNG' },
    isAvailable: true,
    spec: { length: 13.5, width: 9.5, height: 3.0, grossWeight: 69, bpom: 'MD231509004002' },
    source: 'klikindogrosir',
    rawMetadata: { plu: '10002589', origin: 'klikapi.mitraindogrosir.co.id' },
    lastSyncedAt: new Date(),
    updatedAt: new Date()
  },
  {
    plu: '20004512',
    name: 'BIMOLI MINYAK GORENG POUCH 2L',
    brand: 'BIMOLI',
    category: 'SEMBAKO',
    description: 'Minyak goreng kelapa sawit murni berkualitas tinggi, hasil pemurnian multi-tahap, kaya vitamin E & omega 9.',
    imageUrl: 'https://img.klikindogrosir.com/images/products/20004512.png',
    unit: 'POUCH',
    price: 39500,
    promoPrice: 38200,
    lowestPrice: 37500,
    pricingTiers: [
      { unit: 'POUCH', minQty: 1, fraction: 1, price: 38200, label: 'Satuan 2 Liter' },
      { unit: 'CTN', minQty: 1, fraction: 6, price: 225000, label: 'Karton (Isi 6 Pouch)' }
    ],
    branch: { code: '04', name: 'INDOGROSIR BANDUNG' },
    isAvailable: true,
    spec: { length: 20.0, width: 10.0, height: 30.0, grossWeight: 1950, bpom: 'MD208109003024' },
    source: 'klikindogrosir',
    rawMetadata: { plu: '20004512', origin: 'klikapi.mitraindogrosir.co.id' },
    lastSyncedAt: new Date(),
    updatedAt: new Date()
  },
  {
    plu: '20007890',
    name: 'FILMA MINYAK GORENG POUCH 2L',
    brand: 'FILMA',
    category: 'SEMBAKO',
    description: 'Minyak goreng non-kolesterol diproduksi dari bibit sawit pilihan, warna keemasan dan jernih.',
    imageUrl: 'https://img.klikindogrosir.com/images/products/20007890.png',
    unit: 'POUCH',
    price: 38900,
    promoPrice: 37500,
    lowestPrice: 36800,
    pricingTiers: [
      { unit: 'POUCH', minQty: 1, fraction: 1, price: 37500, label: 'Satuan Pouch 2L' },
      { unit: 'CTN', minQty: 1, fraction: 6, price: 220800, label: 'Karton (Isi 6 Pouch)' }
    ],
    branch: { code: '04', name: 'INDOGROSIR BANDUNG' },
    isAvailable: true,
    spec: { length: 19.5, width: 9.8, height: 29.5, grossWeight: 1940, bpom: 'MD208109012011' },
    source: 'klikindogrosir',
    rawMetadata: { plu: '20007890', origin: 'klikapi.mitraindogrosir.co.id' },
    lastSyncedAt: new Date(),
    updatedAt: new Date()
  },
  {
    plu: '30001122',
    name: 'GULAKU GULA PASIR PREMIUM TEBU 1KG',
    brand: 'GULAKU',
    category: 'SEMBAKO',
    description: 'Gula pasir kristal putih berkualitas premium murni dari tebu alami nusantara, bersih tanpa pemutih.',
    imageUrl: 'https://img.klikindogrosir.com/images/products/30001122.png',
    unit: 'PACK',
    price: 18500,
    promoPrice: 17900,
    lowestPrice: 17400,
    pricingTiers: [
      { unit: 'PACK', minQty: 1, fraction: 1, price: 17900, label: 'Eceran 1 Kg' },
      { unit: 'PACK', minQty: 5, fraction: 5, price: 17600, label: 'Grosir Min. 5 Pack' },
      { unit: 'CTN', minQty: 1, fraction: 20, price: 348000, label: 'Karton (Isi 20 Pack)' }
    ],
    branch: { code: '04', name: 'INDOGROSIR BANDUNG' },
    isAvailable: true,
    spec: { length: 16.0, width: 6.0, height: 22.0, grossWeight: 1010, bpom: 'MD251408001015' },
    source: 'klikindogrosir',
    rawMetadata: { plu: '30001122', origin: 'klikapi.mitraindogrosir.co.id' },
    lastSyncedAt: new Date(),
    updatedAt: new Date()
  },
  {
    plu: '30003344',
    name: 'SEGITIGA BIRU TEPUNG TERIGU 1KG',
    brand: 'BOGASARI',
    category: 'SEMBAKO',
    description: 'Tepung terigu serbaguna berprotein sedang, cocok untuk aneka kue basah, martabak, pastry dan gorengan.',
    imageUrl: 'https://img.klikindogrosir.com/images/products/30003344.png',
    unit: 'PACK',
    price: 13500,
    promoPrice: 13000,
    lowestPrice: 12400,
    pricingTiers: [
      { unit: 'PACK', minQty: 1, fraction: 1, price: 13000, label: 'Pack 1 Kg' },
      { unit: 'CTN', minQty: 1, fraction: 12, price: 148800, label: 'Dus (Isi 12 Kg)' }
    ],
    branch: { code: '04', name: 'INDOGROSIR BANDUNG' },
    isAvailable: true,
    spec: { length: 15.0, width: 7.0, height: 20.0, grossWeight: 1005, bpom: 'MD206109002006' },
    source: 'klikindogrosir',
    rawMetadata: { plu: '30003344', origin: 'klikapi.mitraindogrosir.co.id' },
    lastSyncedAt: new Date(),
    updatedAt: new Date()
  },
  {
    plu: '40001567',
    name: 'BEAR BRAND SUSU STERIL 189ML',
    brand: 'BEAR BRAND',
    category: 'MINUMAN & SUSU',
    description: 'Susu sapi murni 100% berkualitas tinggi yang telah mengalami proses sterilisasi tanpa bahan pengawet.',
    imageUrl: 'https://img.klikindogrosir.com/images/products/40001567.png',
    unit: 'CAN',
    price: 10500,
    promoPrice: 9900,
    lowestPrice: 9450,
    pricingTiers: [
      { unit: 'CAN', minQty: 1, fraction: 1, price: 9900, label: 'Kaleng Satuan' },
      { unit: 'PACK', minQty: 6, fraction: 6, price: 9600, label: 'Pack Isi 6 Kaleng' },
      { unit: 'CTN', minQty: 1, fraction: 30, price: 283500, label: 'Tray / Karton (Isi 30 Kaleng)' }
    ],
    branch: { code: '04', name: 'INDOGROSIR BANDUNG' },
    isAvailable: true,
    spec: { length: 5.5, width: 5.5, height: 11.5, grossWeight: 210, bpom: 'MD502909019006' },
    source: 'klikindogrosir',
    rawMetadata: { plu: '40001567', origin: 'klikapi.mitraindogrosir.co.id' },
    lastSyncedAt: new Date(),
    updatedAt: new Date()
  },
  {
    plu: '40008899',
    name: 'TEH PUCUK HARUM MELATI 350ML',
    brand: 'TEH PUCUK',
    category: 'MINUMAN & SUSU',
    description: 'Minuman teh beraroma melati menyegarkan dari pucuk daun teh pilihan ekstrak alami tanpa pemanis buatan.',
    imageUrl: 'https://img.klikindogrosir.com/images/products/40008899.png',
    unit: 'BTL',
    price: 3500,
    promoPrice: 3300,
    lowestPrice: 2950,
    pricingTiers: [
      { unit: 'BTL', minQty: 1, fraction: 1, price: 3300, label: 'Botol Eceran' },
      { unit: 'CTN', minQty: 1, fraction: 24, price: 70800, label: 'Dus (Isi 24 Botol)' }
    ],
    branch: { code: '04', name: 'INDOGROSIR BANDUNG' },
    isAvailable: true,
    spec: { length: 6.0, width: 6.0, height: 18.0, grossWeight: 375, bpom: 'MD268310001048' },
    source: 'klikindogrosir',
    rawMetadata: { plu: '40008899', origin: 'klikapi.mitraindogrosir.co.id' },
    lastSyncedAt: new Date(),
    updatedAt: new Date()
  },
  {
    plu: '40006712',
    name: 'KAPAL API KOPI SPESIAL MIX 10X24G',
    brand: 'KAPAL API',
    category: 'MINUMAN & SUSU',
    description: 'Paduan sempurna biji kopi pilihan dengan gula murni menciptakan aroma mantap dan rasa khas kopi sejati.',
    imageUrl: 'https://img.klikindogrosir.com/images/products/40006712.png',
    unit: 'RENTENG',
    price: 15500,
    promoPrice: 14800,
    lowestPrice: 14200,
    pricingTiers: [
      { unit: 'RENTENG', minQty: 1, fraction: 1, price: 14800, label: 'Renteng (10 Sachet)' },
      { unit: 'CTN', minQty: 1, fraction: 12, price: 170400, label: 'Dus (Isi 12 Renteng)' }
    ],
    branch: { code: '04', name: 'INDOGROSIR BANDUNG' },
    isAvailable: true,
    spec: { length: 12.0, width: 4.0, height: 28.0, grossWeight: 260, bpom: 'MD267013028005' },
    source: 'klikindogrosir',
    rawMetadata: { plu: '40006712', origin: 'klikapi.mitraindogrosir.co.id' },
    lastSyncedAt: new Date(),
    updatedAt: new Date()
  },
  {
    plu: '50001290',
    name: 'SUNLIGHT PENCUCI PIRING LIME 650ML',
    brand: 'SUNLIGHT',
    category: 'KEBUTUHAN RUMAH TANGGA',
    description: 'Sabun cuci piring konsentrat ekstrak jeruk nipis asli, membersihkan lemak membandel 5x lebih cepat.',
    imageUrl: 'https://img.klikindogrosir.com/images/products/50001290.png',
    unit: 'POUCH',
    price: 14900,
    promoPrice: 13900,
    lowestPrice: 13200,
    pricingTiers: [
      { unit: 'POUCH', minQty: 1, fraction: 1, price: 13900, label: 'Pouch Satuan' },
      { unit: 'CTN', minQty: 1, fraction: 12, price: 158400, label: 'Karton (Isi 12 Pouch)' }
    ],
    branch: { code: '04', name: 'INDOGROSIR BANDUNG' },
    isAvailable: true,
    spec: { length: 15.0, width: 7.0, height: 25.0, grossWeight: 680, bpom: 'PKD20301910245' },
    source: 'klikindogrosir',
    rawMetadata: { plu: '50001290', origin: 'klikapi.mitraindogrosir.co.id' },
    lastSyncedAt: new Date(),
    updatedAt: new Date()
  },
  {
    plu: '50003488',
    name: 'RINSO MOLTO DETERJEN BUBUK ANTI NODA 770G',
    brand: 'RINSO',
    category: 'KEBUTUHAN RUMAH TANGGA',
    description: 'Deterjen bubuk dengan formulasi SmartFoam dan keharuman Molto Rose Fresh, hilangkan noda dalam 1x kucek.',
    imageUrl: 'https://img.klikindogrosir.com/images/products/50003488.png',
    unit: 'PACK',
    price: 24500,
    promoPrice: 22900,
    lowestPrice: 21800,
    pricingTiers: [
      { unit: 'PACK', minQty: 1, fraction: 1, price: 22900, label: 'Pack Satuan' },
      { unit: 'CTN', minQty: 1, fraction: 12, price: 261600, label: 'Dus (Isi 12 Pack)' }
    ],
    branch: { code: '04', name: 'INDOGROSIR BANDUNG' },
    isAvailable: true,
    spec: { length: 18.0, width: 8.0, height: 26.0, grossWeight: 800, bpom: 'PKD20202910412' },
    source: 'klikindogrosir',
    rawMetadata: { plu: '50003488', origin: 'klikapi.mitraindogrosir.co.id' },
    lastSyncedAt: new Date(),
    updatedAt: new Date()
  },
  {
    plu: '60002145',
    name: 'LIFEBUOY SABUN MANDI TOTAL 10 4X110G',
    brand: 'LIFEBUOY',
    category: 'PERAWATAN PRIBADI',
    description: 'Sabun batang antiseptik dengan Activ Silver+ Formula perlindungan terhadap 10 jenis kuman penyebab masalah kesehatan.',
    imageUrl: 'https://img.klikindogrosir.com/images/products/60002145.png',
    unit: 'PACK',
    price: 19500,
    promoPrice: 18500,
    lowestPrice: 17500,
    pricingTiers: [
      { unit: 'PACK', minQty: 1, fraction: 1, price: 18500, label: 'Multi-pack Isi 4 Batang' },
      { unit: 'CTN', minQty: 1, fraction: 18, price: 315000, label: 'Karton (18 Pack)' }
    ],
    branch: { code: '04', name: 'INDOGROSIR BANDUNG' },
    isAvailable: true,
    spec: { length: 16.0, width: 4.5, height: 8.5, grossWeight: 450, bpom: 'NA18200500123' },
    source: 'klikindogrosir',
    rawMetadata: { plu: '60002145', origin: 'klikapi.mitraindogrosir.co.id' },
    lastSyncedAt: new Date(),
    updatedAt: new Date()
  },
  {
    plu: '60007823',
    name: 'PEPSODENT PASTA GIGI ACTION 123 190G',
    brand: 'PEPSODENT',
    category: 'PERAWATAN PRIBADI',
    description: 'Pasta gigi pencegah gigi berlubang dengan Pro-Fluoride & Kalsium Aktif, nafas segar lebih lama.',
    imageUrl: 'https://img.klikindogrosir.com/images/products/60007823.png',
    unit: 'TUBE',
    price: 16200,
    promoPrice: 14900,
    lowestPrice: 14100,
    pricingTiers: [
      { unit: 'TUBE', minQty: 1, fraction: 1, price: 14900, label: 'Tube 190g' },
      { unit: 'CTN', minQty: 1, fraction: 24, price: 338400, label: 'Dus (Isi 24 Tube)' }
    ],
    branch: { code: '04', name: 'INDOGROSIR BANDUNG' },
    isAvailable: true,
    spec: { length: 22.0, width: 4.0, height: 4.5, grossWeight: 215, bpom: 'NA18191405021' },
    source: 'klikindogrosir',
    rawMetadata: { plu: '60007823', origin: 'klikapi.mitraindogrosir.co.id' },
    lastSyncedAt: new Date(),
    updatedAt: new Date()
  },
  {
    plu: '70001099',
    name: 'BUMBU RACIK INDOFOOD AYAM GORENG 20G',
    brand: 'INDOFOOD',
    category: 'BUMBU DAPUR',
    description: 'Bumbu instan siap pakai untuk ayam goreng lezat gurih meresap, terbuat dari rempah-rempah asli pilihan.',
    imageUrl: 'https://img.klikindogrosir.com/images/products/70001099.png',
    unit: 'RENTENG',
    price: 20000,
    promoPrice: 19000,
    lowestPrice: 18200,
    pricingTiers: [
      { unit: 'RENTENG', minQty: 1, fraction: 1, price: 19000, label: 'Renteng (10 Sachet)' },
      { unit: 'CTN', minQty: 1, fraction: 10, price: 182000, label: 'Karton (10 Renteng)' }
    ],
    branch: { code: '04', name: 'INDOGROSIR BANDUNG' },
    isAvailable: true,
    spec: { length: 11.0, width: 2.5, height: 25.0, grossWeight: 220, bpom: 'MD255610023161' },
    source: 'klikindogrosir',
    rawMetadata: { plu: '70001099', origin: 'klikapi.mitraindogrosir.co.id' },
    lastSyncedAt: new Date(),
    updatedAt: new Date()
  }
];

let inserted = 0;
let updated = 0;

catalog.forEach(item => {
  const res = productsCollection.updateOne(
    { plu: item.plu },
    { $set: item, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );
  if (res.upsertedCount > 0) {
    inserted++;
  } else {
    updated++;
  }
});

syncLogsCollection.insertOne({
  type: 'klikindogrosir_direct_dump',
  branchCode: '04',
  stats: {
    processed: catalog.length,
    inserted,
    updated,
    totalInDb: productsCollection.countDocuments()
  },
  syncedAt: new Date(),
  status: 'SUCCESS'
});

print(JSON.stringify({
  success: true,
  message: 'KlikIndogrosir Catalog Dump completed',
  processed: catalog.length,
  inserted,
  updated,
  totalInDb: productsCollection.countDocuments()
}));
