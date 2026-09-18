---
type: guide
tags:
  - guidelines
  - contributing
aliases: ["Contributing","Guide","Setup"]
status: active
---
# Panduan Kontribusi (Contributing)

Dokumen ini berisi informasi mengenai skrip dan alur kerja (workflow) saat berkontribusi pada repositori ini.

## Referensi Skrip (Commands)

<!-- AUTO-GENERATED -->

Tabel berikut diekstrak dari `package.json` dan mencantumkan daftar skrip yang dapat dieksekusi menggunakan `npm run <command>`.

| Command | Description |
|---------|-------------|
| **Persiapan & Setup** | |
| `prepare` | Instalasi hooks Git menggunakan husky. |
| `seed` | Menjalankan skrip seeder database. |
| **Infrastruktur (Docker)** | |
| `infra:up` | Menjalankan container infrastruktur lokal (MongoDB, Redis, RabbitMQ) di background. |
| `infra:down` | Mematikan container infrastruktur. |
| `infra:logs` | Menampilkan log real-time dari container infrastruktur. |
| `docker:build:prod` | Membangun image Docker production untuk [[API_GATEWAY|Gateway]], [[MICROSERVICES|User Service]], dan [[MICROSERVICES|Notification Service]]. |
| `docker:push:prod` | Mengunggah image Docker ke registry. |
| **Pengujian (Testing)** | |
| `test` | Menjalankan semua pengujian (menggunakan nx run-many). |
| `test:coverage` | Menjalankan semua pengujian dengan laporan code coverage. |
| `test:unit` | Menjalankan unit test secara berurutan dengan laporan coverage. |
| `test:pbt` | Menjalankan property-based testing (PBT). |
| `test:contract` | Menjalankan pengujian kontrak event. |
| `test:integration` | Menjalankan pengujian integrasi end-to-end secara real-time. |
| `test:load` | Menjalankan load test untuk Socket.IO. |
| `test:resilience` | Menjalankan pengujian ketahanan/chaos. |
| `test:mutation` | Menjalankan pengujian mutasi kode (Stryker). |
| `test:security` | Menjalankan pengujian keamanan WebSockets. |
| `test:soak` | Menjalankan soak test (uji jangka panjang) memori. |
| `test:matrix:all` | Menjalankan seluruh tipe pengujian secara komprehensif. |

<!-- AUTO-GENERATED -->

## Pengujian
Pastikan infrastruktur (DB, Redis, RabbitMQ) berjalan menggunakan perintah `npm run infra:up` sebelum menjalankan integrasi test atau menjalankan service secara manual menggunakan nx serve.

