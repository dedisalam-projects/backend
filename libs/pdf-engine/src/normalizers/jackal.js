/**
 * src/normalizers/jackal.js - Schema Sanitization & Defaults for Jackal Holidays E-Tickets
 *
 * Normalizes input JSON data for Jackal Holidays Shuttle tickets,
 * pre-populating multi-page terms and conditions, price calculations, and passenger lists.
 */

/**
 * Check if the given payload belongs to Jackal Holidays schema
 * @param {Object} data
 * @returns {boolean}
 */
function isJackalPayload(data) {
    if (!data || typeof data !== 'object') return false;
    const s = (data.service || '').toLowerCase();
    if (s.includes('jackal')) return true;
    if (typeof data.booking_code === 'string' && /^BJKL/i.test(data.booking_code)) return true;
    if (Array.isArray(data.tickets) && data.tickets.some(t => t && /^TJKL/i.test(t.ticket_no || ''))) return true;
    if (data.departure && data.destination && (data.passengers || data.customer)) return true;
    return false;
}

/**
 * Format currency amount to Indonesian Rupiah standard with dot separator (e.g. "Rp 155.000")
 * @param {number|string} amount
 * @returns {string}
 */
function formatJackalCurrency(amount) {
    if (typeof amount === 'string' && amount.startsWith('Rp')) {
        return amount;
    }
    const num = Math.round(Number.parseFloat(amount) || 0);
    return `Rp ${num.toLocaleString('id-ID')}`;
}

const DEFAULT_TERMS_PAGE2 = [
    {
        title: 'RESERVASI & CHECK IN',
        points: [
            'Anak-anak 2 tahun ke atas akan dikenakan biaya tiket secara penuh.',
            'Setiap pemesan/penumpang yang telah memiliki tiket diwajibkan untuk berada di Point keberangkatan paling lambat 30 menit sebelum keberangkatan untuk melakukan proses check-in dengan menunjukan E-ticket & kode OTP dan melakukan boarding sebelum keberangkatan.',
            'Jackal Holidays tidak berkewajiban untuk melakukan konfirmasi kepada penumpang yang belum datang pada saat jam keberangkatan.',
            'Keberangkatan sesuai dengan data valid yang tertera pada tiket (nama, jadwal, point keberangkatan, dan Rute).',
            'Penumpang diharuskan check-in & berangkat di Cabang atau titik Point sesuai dengan tiket pemesanan. Pihak Jackal Holidays berhak menolak penumpang apabila penumpang check-in dan berangkat pada titik Cabang point keberangkatan yang tidak sesuai dengan yang dipesan pada saat reservasi serta yang tercantum pada E-Ticket pemesanan.',
            'Jackal Holidays shuttle berhak menolak penumpang/pemesan jika tidak dapat menunjukan E-Ticket dan kode OTP, atau yang dianggap mengganggu kenyamanan atau melanggar aturan.'
        ]
    },
    {
        title: 'TECHNICAL ISSUES & FORCE MAJEURE ISSUES',
        points: [
            'Pengurus/Crew/Pegawai/Petugas dan Jackal Holidays Shuttle berhak untuk memindahkan tempat duduk bila keadaan memaksa.',
            'Jadwal keberangkatan, tipe kendaraan, point dan rute, dapat berubah sewaktu-waktu karena alasan operasional dan external force tanpa ada pemberitahuan terlebih dahulu.',
            'Jika keberangkatan terlambat atau dibatalkan karena adanya kerusakan mesin atau teknis lainnya, maka penumpang akan mendapat pengembalian dana dalam bentuk voucher.',
            'Apabila terjadi kerusakan mesin/gangguan teknis pada armada selama perjalanan yang mengakibatkan keterlambatan, maka pihak Jackal Holidays Shuttle akan mengakomodir penumpang dengan armada yang tersedia.',
            'Jackal Holidays tidak bertanggung jawab atas kerugian apapun (material dan non-material) yang dialami oleh penumpang, jika waktu perjalanan terlambat atau tertunda karena faktor operasional atau keadaan eksternal (force majeure).',
            'Estimasi waktu perjalanan hanya merupakan perkiraan dan tidak dapat dijadikan acuan pasti untuk waktu tiba di tujuan. Faktor eksternal seperti kondisi lalu lintas, cuaca, dan faktor lainnya dapat mempengaruhi waktu tempuh perjalanan.'
        ]
    },
    {
        title: 'INFORMASI BARANG BAWAAN',
        points: [
            'Setiap penumpang mendapat fasilitas bagasi berupa: 1 buah Travel Bag dengan dimensi maksimal (55cm x 40cm x 24cm) dan 1 buah handbag (Harus bisa disimpan di bawah kursi penumpang). Jika lebih akan dikenakan biaya tambahan (charge bagasi).',
            'Jackal Holidays Shuttle tidak bertanggung jawab atas barang penumpang yang hilang, rusak, atau tertukar.',
            'Penumpang dilarang membawa barang ilegal, senjata, dan barang-barang lainnya yang dapat mengganggu kenyamanan dan keselamatan penumpang lain (mis. barang dengan bau menyengat, hewan).'
        ]
    },
    {
        title: 'ASURANSI PERJALANAN',
        points: [
            'Harga tiket yang tertera sudah termasuk Asuransi Jasa Raharja.',
            'Pastikan anda memakai Sabuk Pengaman (Seat belt) selama perjalanan.',
            'Pastikan anda menerima ticket yang valid (berisi data diri sesuai dengan KTP serta informasi Jadwal, Point Keberangkatan, dan Rute sesuai dengan pemesanan).'
        ]
    }
];

const DEFAULT_TERMS_PAGE3 = [
    {
        title: 'INFORMASI PENGEMBALIAN DANA',
        points: [
            'Tiket yang sudah dibeli tidak dapat dilakukan pengembalian dana (Non-Refundable).',
            'Tidak ada pengembalian dana, voucher, atau kompensasi dalam bentuk apapun terhadap penumpang yang terlambat atau tidak berada di titik keberangkatan pada jam keberangkatan (tiket dinyatakan hangus, dan tidak dapat digunakan kembali).'
        ]
    },
    {
        title: 'INFORMASI PERUBAHAN JADWAL',
        points: [
            'Informasi Perubahan Jadwal / Reschedule dapat diakses di Aplikasi Jackal Holidays dan Website https://shuttle.jackalholidays.com/syaratketentuan.'
        ]
    },
    {
        title: 'CALL CENTER',
        points: [
            'Call Center dan Whatsapp Jackal Holidays: 021-50600678'
        ]
    }
];

/**
 * Sanitize and normalize Jackal Holidays data payload
 * @param {Object} rawData
 * @returns {Object}
 */
function normalizeJackalData(rawData) {
    if (!rawData) return {};
    const data = { ...rawData };

    data.service = data.service || 'jackal-shuttle';
    data.booking_code = data.booking_code || 'BJKL0000000000';
    data.booking_date = data.booking_date || '-';

    const cust = data.customer || {};
    data.customer = {
        name: cust.name || data.customer_name || 'DEDI SALAM PERMANA',
        address: cust.address || '-',
        phone: cust.phone || data.customer_phone || '-',
        email: cust.email || data.customer_email || '-',
        otp: cust.otp || '000000'
    };

    const dep = data.departure || {};
    data.departure = {
        point: dep.point || '-',
        address: dep.address || '-',
        maps_url: dep.maps_url || 'https://maps.google.com/',
        date: dep.date || data.departure_date || '-',
        time: dep.time || data.departure_time || '-'
    };

    const dest = data.destination || {};
    data.destination = {
        point: dest.point || '-',
        address: dest.address || '-',
        maps_url: dest.maps_url || 'https://maps.google.com/'
    };

    data.fleet = data.fleet || null;
    data.vehicle_code = data.vehicle_code || null;
    data.vehicle_plate = data.vehicle_plate || null;

    // Normalizing passengers
    if (Array.isArray(data.passengers) && data.passengers.length > 0) {
        data.passengers = data.passengers.map(p => ({
            qr_code: p.qr_code || data.booking_code,
            name: p.name || data.customer.name,
            seat: p.seat || '1',
            route: p.route || '-',
            schedule: p.schedule || `${data.departure.date} ${data.departure.time}`
        }));
    } else {
        data.passengers = [
            {
                qr_code: data.booking_code,
                name: data.customer.name,
                seat: '1',
                route: '-',
                schedule: `${data.departure.date} ${data.departure.time}`
            }
        ];
    }

    // Normalizing tickets
    if (Array.isArray(data.tickets) && data.tickets.length > 0) {
        data.tickets = data.tickets.map(t => ({
            ticket_no: t.ticket_no || 'TJKL0000000000',
            seat: t.seat || '1',
            route: t.route || '-',
            schedule: t.schedule || `${data.departure.date} ${data.departure.time}`,
            price: t.price || 0,
            price_formatted: formatJackalCurrency(t.price || 0)
        }));
    } else {
        data.tickets = [
            {
                ticket_no: 'TJKL0000000000',
                seat: data.passengers[0].seat,
                route: data.passengers[0].route,
                schedule: data.passengers[0].schedule,
                price: 155000,
                price_formatted: formatJackalCurrency(155000)
            }
        ];
    }

    // Payment details
    const pay = data.payment || {};
    const totalPrice = pay.total_price || data.tickets.reduce((acc, t) => acc + (t.price || 0), 0);
    const adminFee = pay.admin_fee || 0;
    const discount = pay.discount || 0;
    const totalPaid = pay.total_paid || (totalPrice + adminFee - discount);

    data.payment = {
        total_price: totalPrice,
        total_price_formatted: formatJackalCurrency(totalPrice),
        admin_fee: adminFee,
        admin_fee_formatted: formatJackalCurrency(adminFee),
        discount: discount,
        discount_formatted: formatJackalCurrency(discount),
        total_paid: totalPaid,
        total_paid_formatted: formatJackalCurrency(totalPaid),
        method: pay.method || 'BCA VIRTUAL ACCOUNT',
        time: pay.time || data.booking_date
    };

    data.terms_page2 = data.terms_page2 || DEFAULT_TERMS_PAGE2;
    data.terms_page3 = data.terms_page3 || DEFAULT_TERMS_PAGE3;

    return data;
}

module.exports = {
    isJackalPayload,
    normalizeJackalData,
    formatJackalCurrency,
    DEFAULT_TERMS_PAGE2,
    DEFAULT_TERMS_PAGE3
};
