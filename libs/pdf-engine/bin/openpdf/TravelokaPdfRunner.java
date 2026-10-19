package com.blipstudio.pdf;

import com.lowagie.text.Document;
import com.lowagie.text.Image;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfAction;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfWriter;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import org.json.JSONArray;
import org.json.JSONObject;

import java.awt.Color;
import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class TravelokaPdfRunner {

    // Canvas Constants
    public static final float PAGE_WIDTH = 595.28f;
    public static final float PAGE_HEIGHT = 827.70f;
    public static final float MARGIN = 28.35f;
    public static final float CONTENT_WIDTH = 538.58f;

    // Design Tokens (Colors)
    public static final Color COLOR_BLUE_PRIMARY = new Color(1, 148, 243);       // #0194f3
    public static final Color COLOR_LINK_BLUE = new Color(7, 112, 205);          // #0770cd
    public static final Color COLOR_BG_GRAY = new Color(242, 243, 243);         // #f2f3f3
    public static final Color COLOR_BORDER_GRAY = new Color(205, 208, 209);     // #cdcdcd
    public static final Color COLOR_BLACK = new Color(0, 0, 0);
    public static final Color COLOR_WHITE = new Color(255, 255, 255);

    private final String fontsDir;
    private final String imgDir;

    private BaseFont bfArial;
    private BaseFont bfOverpass;

    public TravelokaPdfRunner(String baseDir) {
        File dir = new File(baseDir);
        this.fontsDir = new File(dir, "fonts").getAbsolutePath();
        this.imgDir = new File(dir, "img").getAbsolutePath();
        initFonts();
    }

    private void initFonts() {
        try {
            String arialPath = Paths.get(fontsDir, "ArialUnicodeMS.ttf").toString();
            String overpassPath = Paths.get(fontsDir, "Overpass-Regular.ttf").toString();
            this.bfArial = BaseFont.createFont(arialPath, BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
            this.bfOverpass = BaseFont.createFont(overpassPath, BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
        } catch (Exception e) {
            throw new RuntimeException("Failed to load TrueType fonts: " + e.getMessage(), e);
        }
    }

    public static float toPdfY(float topY) {
        return PAGE_HEIGHT - topY;
    }

    public static float toPdfRectY(float topY, float height) {
        return PAGE_HEIGHT - topY - height;
    }

    public static String formatRupiah(Object val) {
        if (val == null) return "0";
        double num = 0;
        if (val instanceof Number) {
            num = ((Number) val).doubleValue();
        } else {
            String s = val.toString().replaceAll("[^0-9.-]", "");
            if (!s.isEmpty()) {
                try {
                    num = Double.parseDouble(s);
                } catch (Exception ignored) {}
            }
        }
        DecimalFormatSymbols sym = new DecimalFormatSymbols(new Locale("id", "ID"));
        sym.setGroupingSeparator('.');
        sym.setDecimalSeparator(',');
        DecimalFormat df = new DecimalFormat("#,##0", sym);
        return df.format((long) Math.round(num));
    }

    public void render(JSONObject data, OutputStream out) throws Exception {
        Document document = new Document(new Rectangle(PAGE_WIDTH, PAGE_HEIGHT), MARGIN, MARGIN, MARGIN, MARGIN);
        PdfWriter writer = PdfWriter.getInstance(document, out);
        writer.setPdfVersion(PdfWriter.PDF_VERSION_1_5);

        // Ground-Truth Metadata
        document.addTitle("Invoice");
        document.addCreator("");
        document.addAuthor("");
        document.addSubject("");
        document.addKeywords("");

        document.open();
        PdfContentByte cb = writer.getDirectContent();

        boolean isHotel = isHotelDoc(data);

        // 1. Top Header
        drawHeader(cb, data);

        // 2. Payment Details Bar
        drawPaymentBar(cb, data);

        // 3. Two-Column Customer & Company Info
        drawTwoColumnInfo(cb, data);

        // 4. Section specific (Hotel info or Passenger info) & Table
        if (isHotel) {
            renderHotelSectionAndTable(cb, writer, data);
        } else {
            renderBusSectionAndTable(cb, writer, data);
        }

        // 5. Footer Banner & Help Center
        drawFooterBanner(cb, writer, data);

        document.close();
    }

    private boolean isHotelDoc(JSONObject data) {
        String category = data.optString("category", "").toLowerCase();
        String src = data.optString("sourceOriginalPdf", "").toLowerCase();
        if (category.contains("hotel") || src.startsWith("hotel")) return true;
        if (category.contains("bus") || src.startsWith("tiket-bus")) return false;
        return data.has("hotel") && !data.isNull("hotel");
    }

    private void drawHeader(PdfContentByte cb, JSONObject data) throws Exception {
        // Logo at top-right: x=445.28, y=0.0, w=150, h=39
        File logoFile = new File(imgDir, "logo_traveloka.png");
        if (logoFile.exists()) {
            Image logo = Image.getInstance(logoFile.getAbsolutePath());
            logo.setAbsolutePosition(445.28f, toPdfRectY(0.0f, 39.0f));
            logo.scaleAbsolute(150.0f, 39.0f);
            cb.addImage(logo);
        }

        // Blue accent bar: x=28.34, y=22.49, w=3.02, h=37.52
        cb.setColorFill(COLOR_BLUE_PRIMARY);
        cb.rectangle(28.34f, toPdfRectY(22.49f, 37.52f), 3.02f, 37.52f);
        cb.fill();

        // BUKTI PEMBELIAN (RECEIPT)
        showText(cb, bfArial, 8.78f, COLOR_BLACK, 37.35f, 797.06f, "BUKTI PEMBELIAN (RECEIPT)");

        // Nomor
        String receiptNo = data.optString("receiptNo", data.optString("receipt_no", "#1837161707445701177"));
        if (!receiptNo.startsWith("#") && !receiptNo.startsWith("Nomor")) {
            receiptNo = "#" + receiptNo;
        }
        showText(cb, bfArial, 7.5f, COLOR_BLACK, 37.35f, 784.76f, "Nomor : " + receiptNo);

        // Tanggal
        String dateStr = data.optString("transactionDate", data.optString("transaction_date", "09 Jul 2025, 16:47 (Rabu)"));
        showText(cb, bfArial, 7.5f, COLOR_BLACK, 37.35f, 775.01f, "Tanggal : " + dateStr);
    }

    private void drawPaymentBar(PdfContentByte cb, JSONObject data) {
        // Gray background box: x=28.35, y=82.50, w=538.58, h=15.75
        cb.setColorFill(COLOR_BG_GRAY);
        cb.rectangle(28.35f, toPdfRectY(82.50f, 15.75f), CONTENT_WIDTH, 15.75f);
        cb.fill();

        showText(cb, bfArial, 9.0f, COLOR_BLACK, 34.35f, 733.95f, "DETAIL PEMBAYARAN");

        String poNumber = data.optString("poNumber", data.optString("po_number", "1268028452"));
        showText(cb, bfArial, 7.5f, COLOR_BLACK, 34.35f, 718.76f, "P.O. NUMBER: " + poNumber);

        String paymentMethod = data.optString("paymentMethod", data.optString("payment_method", "Virtual Account"));
        String barMethod = data.optString("paymentBarMethod", data.optString("payment_bar_method", ""));
        if (barMethod.isEmpty()) {
            if (paymentMethod.contains("Virtual Account")) {
                barMethod = "Virtual Account";
            } else {
                barMethod = paymentMethod.replace(" /", "/");
            }
        }
        showText(cb, bfArial, 7.5f, COLOR_BLACK, 169.01f, 718.76f, "PEMBELIAN MELALUI: " + barMethod);

        String status = data.optString("paymentStatus", data.optString("status", "Lunas"));
        showText(cb, bfArial, 7.5f, COLOR_BLACK, 411.38f, 718.76f, "DETAIL TRANSAKSI: " + status);
    }

    private void drawTwoColumnInfo(PdfContentByte cb, JSONObject data) {
        // Two Gray header strips: left (x=28.35, w=269.29), right (x=297.64, w=269.28), y=128.55, h=15.75
        cb.setColorFill(COLOR_BG_GRAY);
        cb.rectangle(28.35f, toPdfRectY(128.55f, 15.75f), 269.29f, 15.75f);
        cb.rectangle(297.64f, toPdfRectY(128.55f, 15.75f), 269.28f, 15.75f);
        cb.fill();

        // Headers
        showText(cb, bfArial, 9.0f, COLOR_BLACK, 34.35f, 687.90f, "DATA PEMESAN");
        showText(cb, bfArial, 9.0f, COLOR_BLACK, 303.64f, 687.90f, "DETAIL PERUSAHAAN");

        JSONObject customer = data.optJSONObject("customer");
        String custName = customer != null ? customer.optString("name", customer.optString("nama", "Dedi Salam Permana")) : "Dedi Salam Permana";
        String custEmail = customer != null ? customer.optString("email", "dedispermana20@gmail.com") : "dedispermana20@gmail.com";
        String custPhone = customer != null ? customer.optString("phone", "+6285856416338") : "+6285856416338";

        // Left Column: Customer
        showText(cb, bfArial, 7.5f, COLOR_BLACK, 34.35f, 672.71f, "Nama");
        showText(cb, bfArial, 7.5f, COLOR_BLACK, 94.35f, 672.71f, ":");
        showText(cb, bfArial, 7.5f, COLOR_BLACK, 98.10f, 672.71f, custName);

        showText(cb, bfArial, 7.5f, COLOR_BLACK, 34.35f, 662.96f, "Email");
        showText(cb, bfArial, 7.5f, COLOR_BLACK, 94.35f, 662.96f, ":");
        showText(cb, bfArial, 7.5f, COLOR_BLACK, 98.10f, 662.96f, custEmail);

        showText(cb, bfArial, 7.5f, COLOR_BLACK, 34.35f, 653.21f, "No. Kontak");
        showText(cb, bfArial, 7.5f, COLOR_BLACK, 94.35f, 653.21f, ":");
        showText(cb, bfArial, 7.5f, COLOR_BLACK, 98.10f, 653.21f, custPhone);

        // Right Column: Company
        JSONObject company = data.optJSONObject("company");
        boolean isPanca = "1286541206".equals(data.optString("poNumber", data.optString("po_number", "")))
                || (company != null && company.optString("name", company.optString("nama", "")).contains("Panca"));

        String defaultCompName = isPanca ? "Panca Nusa Travelindo" : "Trinusa Travelindo";
        String defaultNpwp = isPanca ? "0426824488451000" : "0316163203031000";

        String compName = company != null ? company.optString("name", company.optString("nama", defaultCompName)) : defaultCompName;
        String compNpwp = company != null ? company.optString("npwp", defaultNpwp) : defaultNpwp;

        showText(cb, bfArial, 7.5f, COLOR_BLACK, 303.64f, 672.71f, "Nama");
        showText(cb, bfArial, 7.5f, COLOR_BLACK, 363.64f, 672.71f, ":");
        showText(cb, bfArial, 7.5f, COLOR_BLACK, 367.39f, 672.71f, compName);

        showText(cb, bfArial, 7.5f, COLOR_BLACK, 303.64f, 662.96f, "NPWP");
        showText(cb, bfArial, 7.5f, COLOR_BLACK, 363.64f, 662.96f, ":");
        showText(cb, bfArial, 7.5f, COLOR_BLACK, 367.39f, 662.96f, compNpwp);

        showText(cb, bfArial, 7.5f, COLOR_BLACK, 303.64f, 653.21f, "Alamat");
        showText(cb, bfArial, 7.5f, COLOR_BLACK, 363.64f, 653.21f, ":");

        List<String> addrLines = new ArrayList<>();
        if (company != null && company.has("alamatLines")) {
            JSONArray arr = company.getJSONArray("alamatLines");
            for (int i = 0; i < arr.length(); i++) {
                String line = arr.getString(i);
                if (line.startsWith(": ")) line = line.substring(2);
                addrLines.add(line);
            }
        } else if (isPanca) {
            addrLines.add("Green Office Park 1 Jl BSD Office Park, Sampora, Cisauk,");
            addrLines.add("Kab. Tangerang, Banten 15345");
        } else {
            addrLines.add("Traveloka Campus [d/h Green Office Park 1] South Tower");
            addrLines.add("Lantai 2 Zone 10, Jl. Grand Boulevard BSD Green Office");
            addrLines.add("Park, Sampora, Cisauk, Kab Tangerang, Banten 15845");
        }

        for (int i = 0; i < addrLines.size(); i++) {
            float yPos = 653.21f - (i * 9.75f);
            showText(cb, bfArial, 7.5f, COLOR_BLACK, 367.39f, yPos, addrLines.get(i));
        }
    }

    private void renderHotelSectionAndTable(PdfContentByte cb, PdfWriter writer, JSONObject data) {
        JSONObject company = data.optJSONObject("company");
        boolean isPanca = "1286541206".equals(data.optString("poNumber", data.optString("po_number", "")))
                || (company != null && company.optString("name", company.optString("nama", "")).contains("Panca"));
        int addrCount = (company != null && company.has("alamatLines")) ? company.getJSONArray("alamatLines").length() : (isPanca ? 2 : 3);
        float addrOffset = (addrCount - 3) * 9.75f;

        // TAMU Header Box: y = 205.20 + addrOffset, h = 15.75
        float tamuBoxTopY = 205.20f + addrOffset;
        cb.setColorFill(COLOR_BG_GRAY);
        cb.rectangle(28.35f, toPdfRectY(tamuBoxTopY, 15.75f), CONTENT_WIDTH, 15.75f);
        cb.fill();

        showText(cb, bfArial, 9.0f, COLOR_BLACK, 34.35f, toPdfY(tamuBoxTopY + 11.25f), "TAMU");

        String guestName = data.optString("guestName", data.optString("guest_name", data.optString("passengerName", "Dedi Salam Permana")));
        showText(cb, bfArial, 7.5f, COLOR_BLACK, 34.35f, toPdfY(tamuBoxTopY + 26.44f), guestName);

        // DETAIL HOTEL Header Box: y = 251.85 + addrOffset, h = 15.75
        float hotelBoxTopY = 251.85f + addrOffset;
        cb.setColorFill(COLOR_BG_GRAY);
        cb.rectangle(28.35f, toPdfRectY(hotelBoxTopY, 15.75f), CONTENT_WIDTH, 15.75f);
        cb.fill();

        showText(cb, bfArial, 9.0f, COLOR_BLACK, 34.35f, toPdfY(hotelBoxTopY + 11.25f), "DETAIL HOTEL");

        JSONObject hotel = data.optJSONObject("hotel");
        String hotelName = hotel != null ? hotel.optString("hotelName", hotel.optString("nama", "Sans Hotel Roxy Jakarta")) : "Sans Hotel Roxy Jakarta";
        String hotelAddr = hotel != null ? hotel.optString("address", hotel.optString("alamat", "Jalan Biak No.40, RT.2/RW.6, Cideng, Kota Jakarta Pusat, Jakarta, Indonesia, Jakarta Pusat, Indonesia, 10150")) : "";
        String checkIn = hotel != null ? hotel.optString("checkInDate", hotel.optString("check_in", "28-07-2025")) : "28-07-2025";
        String duration = hotel != null ? hotel.optString("duration", hotel.optString("durasi", "1 malam")) : "1 malam";

        float curY = hotelBoxTopY + 26.44f;
        showText(cb, bfArial, 7.5f, COLOR_BLACK, 34.35f, toPdfY(curY), hotelName);
        curY += 9.75f;
        showText(cb, bfArial, 7.5f, COLOR_BLACK, 34.35f, toPdfY(curY), "Alamat: " + hotelAddr);
        curY += 9.75f;
        showText(cb, bfArial, 7.5f, COLOR_BLACK, 34.35f, toPdfY(curY), "Check-in: " + checkIn);
        curY += 9.75f;
        showText(cb, bfArial, 7.5f, COLOR_BLACK, 34.35f, toPdfY(curY), "Durasi: " + duration);

        // Table Header: DETAIL PEMBELIAN
        float tableTopY = 321.60f + addrOffset;
        drawTableAndSummary(cb, tableTopY, data, true);
    }

    private void renderBusSectionAndTable(PdfContentByte cb, PdfWriter writer, JSONObject data) {
        boolean hasDataPenumpang = data.optBoolean("has_data_penumpang", false);
        String pName = data.optString("passengerName", data.optString("passenger", "MR Dedi Salam Permana"));
        if (pName.contains("(Dewasa)")) {
            hasDataPenumpang = true;
        }
        float tableTopY = hasDataPenumpang ? 254.10f : 235.35f;

        if (hasDataPenumpang) {
            float boxTopY = 205.20f;
            cb.setColorFill(COLOR_BG_GRAY);
            cb.rectangle(28.35f, toPdfRectY(boxTopY, 15.75f), CONTENT_WIDTH, 15.75f);
            cb.fill();

            showText(cb, bfArial, 9.0f, COLOR_BLACK, 34.35f, toPdfY(boxTopY + 11.25f), "DATA PENUMPANG");
            showText(cb, bfArial, 7.5f, COLOR_BLACK, 34.35f, toPdfY(boxTopY + 26.44f), pName);
        } else {
            showText(cb, bfArial, 7.5f, COLOR_BLACK, 34.35f, 614.81f, pName);
        }

        drawTableAndSummary(cb, tableTopY, data, false);
    }

    private void drawTableAndSummary(PdfContentByte cb, float tableTopY, JSONObject data, boolean isHotel) {
        // Table Title Box: "DETAIL PEMBELIAN"
        cb.setColorFill(COLOR_BG_GRAY);
        cb.rectangle(28.35f, toPdfRectY(tableTopY, 15.75f), CONTENT_WIDTH, 15.75f);
        cb.fill();

        showText(cb, bfArial, 9.0f, COLOR_BLACK, 34.35f, toPdfY(tableTopY + 11.25f), "DETAIL PEMBELIAN");

        // Column Dividers: [28.35, 48.38, 129.15, 351.15, 378.08, 485.78, 566.17]
        float[] dividers = {28.35f, 48.38f, 129.15f, 351.15f, 378.08f, 485.78f, 566.17f};
        float headerTop = tableTopY + 18.38f;
        float headerBottom = tableTopY + 53.70f;

        // Draw Header Border Box
        drawTableGridRow(cb, 28.35f, headerTop, headerBottom, dividers);

        // Header Column Titles: baseline is toPdfY(tableTopY + 39.19f)
        float hBaseline = toPdfY(tableTopY + 39.19f);
        float jenisX = isHotel ? 52.88f : 52.39f;
        float descX = isHotel ? 133.65f : 133.16f;

        showText(cb, bfArial, 7.5f, COLOR_BLACK, 32.48f, hBaseline, "No.");
        showText(cb, bfArial, 7.5f, COLOR_BLACK, jenisX, hBaseline, "Jenis Barang");
        showText(cb, bfArial, 7.5f, COLOR_BLACK, descX, hBaseline, "Deskripsi");
        showText(cb, bfArial, 7.5f, COLOR_BLACK, 355.65f, hBaseline, "Jml.");

        showText(cb, bfArial, 7.5f, COLOR_BLACK, 382.58f, hBaseline, "Harga satuan ");
        showText(cb, bfOverpass, 7.5f, COLOR_BLACK, 429.68f, hBaseline, "Rp");

        showText(cb, bfArial, 7.5f, COLOR_BLACK, 490.28f, hBaseline, "Total ");
        showText(cb, bfOverpass, 7.5f, COLOR_BLACK, 509.03f, hBaseline, "Rp");

        // Rows
        JSONArray items = data.optJSONArray("items");
        float prevBottom = headerBottom;

        if (items != null && items.length() > 0) {
            for (int i = 0; i < items.length(); i++) {
                JSONObject item = items.getJSONObject(i);
                String noStr = item.has("itemNo") ? String.valueOf(item.get("itemNo")) : String.valueOf(i + 1);
                String itemType = item.optString("itemType", item.optString("jenis", isHotel ? "Akomodasi" : "Tiket Bus"));
                String quantityStr = item.has("quantity") ? String.valueOf(item.get("quantity")) : item.optString("jml", "1");

                String unitPriceStr = formatRupiah(item.opt("unitPrice") != null ? item.opt("unitPrice") : item.opt("harga_satuan"));
                String totalPriceStr = formatRupiah(item.opt("totalPrice") != null ? item.opt("totalPrice") : item.opt("total"));

                List<String> descLines = new ArrayList<>();
                if (item.has("descriptionLines")) {
                    JSONArray dArr = item.getJSONArray("descriptionLines");
                    for (int j = 0; j < dArr.length(); j++) descLines.add(dArr.getString(j));
                } else if (item.has("description")) {
                    for (String s : item.getString("description").split("\n")) descLines.add(s);
                } else if (item.has("deskripsi")) {
                    for (String s : item.getString("deskripsi").split("\n")) descLines.add(s);
                }

                List<String> typeLines = new ArrayList<>();
                for (String s : itemType.split("\n")) typeLines.add(s);

                int maxLines = Math.max(Math.max(typeLines.size(), descLines.size()), 1);
                float rowHeight = item.has("rowHeight") ? (float) item.getDouble("rowHeight") : (maxLines > 1 ? (maxLines * 9.75f + 15.0f) : 24.75f);
                float rowTop = prevBottom;
                float rowBottom = rowTop + rowHeight;

                drawTableGridRow(cb, 28.35f, rowTop, rowBottom, dividers);

                float rBaseline = toPdfY(rowTop + 10.61f);

                // Col 1: No
                if (!noStr.isEmpty()) {
                    showText(cb, bfArial, 7.5f, COLOR_BLACK, 32.48f, rBaseline, noStr);
                }

                // Col 2: Jenis
                for (int t = 0; t < typeLines.size(); t++) {
                    showText(cb, bfArial, 7.5f, COLOR_BLACK, jenisX, rBaseline - (t * 9.75f), typeLines.get(t));
                }

                // Col 3: Deskripsi
                for (int d = 0; d < descLines.size(); d++) {
                    String dLine = descLines.get(d).trim();
                    if (!dLine.isEmpty()) {
                        showText(cb, bfArial, 7.5f, COLOR_BLACK, descX, rBaseline - (d * 9.75f), dLine);
                    }
                }

                // Col 4: Jml
                if (!quantityStr.isEmpty()) {
                    showText(cb, bfArial, 7.5f, COLOR_BLACK, 370.13f, rBaseline, quantityStr);
                }

                // Col 5: Harga Satuan (Right aligned at 482.00)
                if (!unitPriceStr.isEmpty()) {
                    showText(cb, bfArial, 7.5f, COLOR_BLACK, getAmountX(unitPriceStr, 482.00f), rBaseline, unitPriceStr);
                }

                // Col 6: Total (Right aligned at 562.79)
                if (!totalPriceStr.isEmpty()) {
                    showText(cb, bfArial, 7.5f, COLOR_BLACK, getAmountX(totalPriceStr, 562.79f), rBaseline, totalPriceStr);
                }

                prevBottom = rowBottom;
            }
        }

        // Summary Table
        String totalAmountStr = formatRupiah(data.opt("totalAmount") != null ? data.opt("totalAmount") : data.opt("total_amount"));
        String paymentMethod = data.optString("paymentMethod", data.optString("payment_method", "BCA Virtual Account"));

        drawSummarySection(cb, prevBottom, totalAmountStr, paymentMethod, data);
    }

    private void drawTableGridRow(PdfContentByte cb, float left, float topY, float bottomY, float[] dividers) {
        cb.setColorStroke(COLOR_BORDER_GRAY);
        cb.setLineWidth(0.75f);

        // Top line
        cb.moveTo(left, toPdfY(topY));
        cb.lineTo(dividers[dividers.length - 1], toPdfY(topY));
        cb.stroke();

        // Bottom line
        cb.moveTo(left, toPdfY(bottomY));
        cb.lineTo(dividers[dividers.length - 1], toPdfY(bottomY));
        cb.stroke();

        // Vertical dividers
        for (float div : dividers) {
            cb.moveTo(div, toPdfY(topY));
            cb.lineTo(div, toPdfY(bottomY));
            cb.stroke();
        }
    }

    private float getAmountX(String str, float targetRightX) {
        String cleanStr = str != null ? str.trim() : "";
        if (cleanStr.length() == 7) {
            return targetRightX >= 560.0f ? 535.69f : 454.91f;
        }
        if (cleanStr.length() == 6) {
            return targetRightX >= 560.0f ? 539.85f : 459.08f;
        }
        float w = bfArial.getWidthPoint(cleanStr, 7.5f);
        return targetRightX - w;
    }

    private List<String> wrapText(BaseFont bf, String text, float maxWidth, float fontSize) {
        List<String> lines = new ArrayList<>();
        if (text == null || text.isEmpty()) return lines;
        String[] words = text.split(" ");
        StringBuilder currentLine = new StringBuilder();
        for (String w : words) {
            String testLine = currentLine.length() > 0 ? currentLine + " " + w : w;
            if (bf.getWidthPoint(testLine, fontSize) <= maxWidth) {
                currentLine = new StringBuilder(testLine);
            } else {
                if (currentLine.length() > 0) lines.add(currentLine.toString());
                currentLine = new StringBuilder(w);
            }
        }
        if (currentLine.length() > 0) lines.add(currentLine.toString());
        return lines;
    }

    private void drawSummarySection(PdfContentByte cb, float topY, String totalStr, String paymentMethod, JSONObject data) {
        float[] summaryDividers = {378.08f, 485.78f, 566.17f};
        float xAmount = getAmountX(totalStr, 562.79f);

        // 1. TOTAL row: height 15.0f
        float totalTop = topY;
        float totalBottom = totalTop + 15.0f;
        drawSummaryRowGrid(cb, totalTop, totalBottom, summaryDividers);

        float totalBaseline = toPdfY(totalTop + 10.43f);
        showText(cb, bfArial, 7.5f, COLOR_BLACK, 382.58f, totalBaseline, "TOTAL");
        showText(cb, bfArial, 7.5f, COLOR_BLACK, xAmount, totalBaseline, totalStr);

        // 2. Dibayar dengan row
        String payLabel = "Dibayar dengan " + paymentMethod;
        List<String> payLines = wrapText(bfArial, payLabel, 100.0f, 7.5f);
        boolean multiLinePay = payLines.size() > 1;
        float payHeight = multiLinePay ? 24.75f : 15.0f;
        float payTop = totalBottom;
        float payBottom = payTop + payHeight;
        drawSummaryRowGrid(cb, payTop, payBottom, summaryDividers);

        if (!multiLinePay) {
            float payBaseline = toPdfY(payTop + 10.43f);
            showText(cb, bfArial, 7.5f, COLOR_BLACK, 382.58f, payBaseline, payLines.get(0));
            showText(cb, bfArial, 7.5f, COLOR_BLACK, xAmount, payBaseline, totalStr);
        } else {
            showText(cb, bfArial, 7.5f, COLOR_BLACK, 382.58f, toPdfY(payTop + 10.43f), payLines.get(0));
            showText(cb, bfArial, 7.5f, COLOR_BLACK, 382.58f, toPdfY(payTop + 20.18f), payLines.get(1));
            showText(cb, bfArial, 7.5f, COLOR_BLACK, xAmount, toPdfY(payTop + 15.30f), totalStr);
        }

        // 3. JUMLAH PEMBAYARAN row: height 15.0f
        float finalTop = payBottom;
        float finalBottom = finalTop + 15.0f;
        drawSummaryRowGrid(cb, finalTop, finalBottom, summaryDividers);

        float finalBaseline = toPdfY(finalTop + 10.43f);
        boolean showStar = data.optBoolean("summary_vat_star", false) || data.optBoolean("show_vat_footnote", false);
        String finalLabel = showStar ? "JUMLAH PEMBAYARAN *" : "JUMLAH PEMBAYARAN";

        showText(cb, bfArial, 7.5f, COLOR_BLACK, 382.58f, finalBaseline, finalLabel);
        showText(cb, bfArial, 7.5f, COLOR_BLACK, xAmount, finalBaseline, totalStr);
    }

    private void drawSummaryRowGrid(PdfContentByte cb, float topY, float bottomY, float[] dividers) {
        cb.setColorStroke(COLOR_BORDER_GRAY);
        cb.setLineWidth(0.75f);

        // Top line
        cb.moveTo(dividers[0], toPdfY(topY));
        cb.lineTo(dividers[dividers.length - 1], toPdfY(topY));
        cb.stroke();

        // Bottom line
        cb.moveTo(dividers[0], toPdfY(bottomY));
        cb.lineTo(dividers[dividers.length - 1], toPdfY(bottomY));
        cb.stroke();

        // Vertical dividers
        for (float div : dividers) {
            cb.moveTo(div, toPdfY(topY));
            cb.lineTo(div, toPdfY(bottomY));
            cb.stroke();
        }
    }

    private void drawFooterBanner(PdfContentByte cb, PdfWriter writer, JSONObject data) throws Exception {
        // QR Code if applicable: x=28.35, y=603.68, w=126, h=126
        boolean showQr = data.optBoolean("show_qr", !isHotelDoc(data));
        File qrFile = new File(imgDir, "qr_traveloka_sample.png");
        if (showQr && qrFile.exists()) {
            Image qr = Image.getInstance(qrFile.getAbsolutePath());
            qr.setAbsolutePosition(28.35f, toPdfRectY(603.68f, 126.0f));
            qr.scaleAbsolute(126.0f, 126.0f);
            cb.addImage(qr);
        }

        // Help Center: baseline at 37.69 (y=789.70 from top)
        showText(cb, bfArial, 7.5f, COLOR_BLACK, 151.69f, 37.69f, "Untuk pertanyaan apa pun, kunjungi Traveloka Help Center:");

        // Help Web Icon: x=353.36, y=33.79, w=12, h=12
        File helpIconFile = new File(imgDir, "icon_traveloka_help.png");
        if (helpIconFile.exists()) {
            Image icon = Image.getInstance(helpIconFile.getAbsolutePath());
            icon.setAbsolutePosition(353.36f, 33.79f);
            icon.scaleAbsolute(12.0f, 12.0f);
            cb.addImage(icon);
        }

        // Help Link: x=370.46, y=37.69f
        showText(cb, bfArial, 6.75f, COLOR_LINK_BLUE, 370.46f, 37.69f, "www.traveloka.com/help");

        // Underline for link
        cb.setColorFill(COLOR_LINK_BLUE);
        cb.rectangle(370.46f, 35.63f, 73.13f, 0.67f);
        cb.fill();

        // Hyperlink action
        PdfAction action = new PdfAction("https://www.traveloka.com/help");
        cb.setAction(action, 370.46f, 33.0f, 443.59f, 45.0f);

        // Bottom Blue Banner: x=0, y=0 to y=24.83
        cb.setColorFill(COLOR_BLUE_PRIMARY);
        cb.rectangle(0.0f, 0.075f, PAGE_WIDTH, 24.755f);
        cb.fill();

        // Disclaimer white text: y=9.64 baseline
        String footerTerms = data.optString("footer_terms", "Syarat dan Ketentuan berlaku. Silakan lihat http://www.traveloka.com/termsandconditions");
        float footerX = data.has("footer_x") ? (float) data.getDouble("footer_x") : (footerTerms.contains("paylater") ? 101.44f : 149.32f);
        showText(cb, bfArial, 7.5f, COLOR_WHITE, footerX, 9.64f, footerTerms);
    }

    private void showText(PdfContentByte cb, BaseFont bf, float size, Color color, float x, float baselineY, String text) {
        if (text == null || text.isEmpty()) return;
        cb.beginText();
        cb.setFontAndSize(bf, size);
        cb.setColorFill(color);
        cb.setTextMatrix(x, baselineY);
        cb.showText(text);
        cb.endText();
    }

    // =========================================================================
    // Microservice Daemon & CLI Entrypoints
    // =========================================================================

    private static String resolveBaseDir() {
        String env = System.getenv("PDF_ENGINE_DIR");
        if (env != null && new File(env).exists()) return env;

        String[] candidates = {
            ".",
            "..",
            "../..",
            "libs/pdf-engine",
            "backend/libs/pdf-engine",
            "d:/dedisalam/fullstack/backend/libs/pdf-engine"
        };
        for (String cand : candidates) {
            File f = new File(cand, "fonts/ArialUnicodeMS.ttf");
            if (f.exists()) {
                return new File(cand).getAbsolutePath();
            }
        }
        return Paths.get(".").toAbsolutePath().toString();
    }

    public static void main(String[] args) {
        if (args.length == 0) {
            printUsageAndExit();
        }

        String baseDir = resolveBaseDir();
        TravelokaPdfRunner runner = new TravelokaPdfRunner(baseDir);

        if ("--daemon".equalsIgnoreCase(args[0]) || "-d".equalsIgnoreCase(args[0])) {
            int port = 8081;
            if (args.length > 1) {
                try {
                    port = Integer.parseInt(args[1]);
                } catch (Exception ignored) {}
            }
            startDaemon(runner, port);
        } else {
            if (args.length < 2) {
                printUsageAndExit();
            }
            String inputJsonPath = args[0];
            String outputPdfPath = args[1];

            try {
                String jsonStr = new String(Files.readAllBytes(Paths.get(inputJsonPath)), StandardCharsets.UTF_8);
                JSONObject data = new JSONObject(jsonStr);

                File outFile = new File(outputPdfPath);
                if (outFile.getParentFile() != null) {
                    outFile.getParentFile().mkdirs();
                }

                try (FileOutputStream fos = new FileOutputStream(outFile)) {
                    runner.render(data, fos);
                }

                System.out.println("[OpenPDF Success] Successfully generated: " + outFile.getAbsolutePath());
                System.exit(0);
            } catch (Exception e) {
                System.err.println("[OpenPDF Error] " + e.getMessage());
                e.printStackTrace(System.err);
                System.exit(1);
            }
        }
    }

    private static void startDaemon(TravelokaPdfRunner runner, int port) {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
            server.createContext("/health", exchange -> {
                String response = "{\"status\":\"ok\",\"engine\":\"OpenPDF 1.3.30\",\"service\":\"pdf-openpdf\"}";
                byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, bytes.length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(bytes);
                }
            });

            server.createContext("/render", exchange -> {
                if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                    exchange.sendResponseHeaders(405, -1);
                    return;
                }

                try {
                    ByteArrayOutputStream bodyBaos = new ByteArrayOutputStream();
                    try (InputStream is = exchange.getRequestBody()) {
                        byte[] buffer = new byte[8192];
                        int read;
                        while ((read = is.read(buffer)) != -1) {
                            bodyBaos.write(buffer, 0, read);
                        }
                    }

                    String jsonStr = bodyBaos.toString(StandardCharsets.UTF_8);
                    JSONObject data = new JSONObject(jsonStr);

                    ByteArrayOutputStream pdfBaos = new ByteArrayOutputStream();
                    runner.render(data, pdfBaos);

                    byte[] pdfBytes = pdfBaos.toByteArray();
                    exchange.getResponseHeaders().set("Content-Type", "application/pdf");
                    exchange.getResponseHeaders().set("Content-Disposition", "inline; filename=\"invoice.pdf\"");
                    exchange.sendResponseHeaders(200, pdfBytes.length);
                    try (OutputStream os = exchange.getResponseBody()) {
                        os.write(pdfBytes);
                    }
                } catch (Exception e) {
                    String err = "{\"error\":\"" + e.getMessage().replace("\"", "'") + "\"}";
                    byte[] errBytes = err.getBytes(StandardCharsets.UTF_8);
                    exchange.getResponseHeaders().set("Content-Type", "application/json");
                    exchange.sendResponseHeaders(500, errBytes.length);
                    try (OutputStream os = exchange.getResponseBody()) {
                        os.write(errBytes);
                    }
                }
            });

            server.setExecutor(java.util.concurrent.Executors.newFixedThreadPool(8));
            server.start();
            System.out.println("[OpenPDF Microservice] Server listening on port " + port + "...");
        } catch (Exception e) {
            System.err.println("[OpenPDF Microservice Failed] " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }

    private static void printUsageAndExit() {
        System.err.println("Usage:");
        System.err.println("  CLI Mode:    java ... TravelokaPdfRunner <input.json> <output.pdf>");
        System.err.println("  Daemon Mode: java ... TravelokaPdfRunner --daemon [port]");
        System.exit(1);
    }
}
