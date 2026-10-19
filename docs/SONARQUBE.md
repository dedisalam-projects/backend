# Panduan SonarQube Local Development

Dokumentasi penggunaan dan integrasi SonarQube Community Edition di lingkungan lokal menggunakan Docker.

---

## 1. Arsitektur & Akses Dashboard

SonarQube dijalankan menggunakan Docker Compose mandiri di [`infrastructure/docker-compose.sonarqube.yml`](file:///d:/dedisalam/fullstack/infrastructure/docker-compose.sonarqube.yml) dengan database PostgreSQL persisten agar data analisis tidak hilang saat container restart.

* **Dashboard URL**: [http://localhost:9000](http://localhost:9000)
* **Default Username**: `admin`
* **Default Password**: `admin` (akan diminta ganti password pada login pertama kali)
* **Scanner Token**: Token otomatis `squ_e77c87b99eb839a383fbe0a9cb5660052451dadc` telah terkonfigurasi di properti proyek.

---

## 2. Perintah Docker Lifecycle (via npm di backend)

Dari direktori `backend/`:

| Perintah | Deskripsi |
|---|---|
| `npm run sonar:up` | Menjalankan container SonarQube & PostgreSQL di latar belakang |
| `npm run sonar:down` | Menghentikan container SonarQube & PostgreSQL |
| `npm run sonar:logs` | Melihat live log output SonarQube |
| `npm run sonar:scan` | Menjalankan scan SonarQube untuk backend microservices |
| `npm run sonar:scan:root` | Menjalankan scan SonarQube untuk seluruh monorepo fullstack |

---

## 3. Menjalankan Scan via Script

### PowerShell (Windows)
```powershell
# Scan backend
.\scripts\sonar-scan.ps1

# Scan seluruh workspace root
.\scripts\sonar-scan.ps1 -Scope root
```

### Bash / Linux / WSL / Git Bash
```bash
# Scan backend
./scripts/sonar-scan.sh

# Scan seluruh workspace root
./scripts/sonar-scan.sh root
```

---

## 4. File Konfigurasi

* Root: [`sonar-project.properties`](file:///d:/dedisalam/fullstack/sonar-project.properties)
* Backend: [`backend/sonar-project.properties`](file:///d:/dedisalam/fullstack/backend/sonar-project.properties)
* Docker Compose: [`infrastructure/docker-compose.sonarqube.yml`](file:///d:/dedisalam/fullstack/infrastructure/docker-compose.sonarqube.yml)

### Metrik Clean Code yang Dianalisis:
1. **Maintainability & Technical Debt**: Menghitung estimasi waktu refactor kode bermasalah.
2. **Duplikasi Kode**: Persentase baris kode yang terduplikasi di berbagai service/module.
3. **Cognitive Complexity**: Kompleksitas alur fungsi yang terlalu bercabang (`if`, `switch`, loop bertingkat).
4. **Reliability & Bugs**: Potensi null pointer exception, unhandled promise rejection, async leak.
5. **Security Hotspots**: Celah keamanan injection, credential exposure, dan konfigurasi rawan.
6. **Code Coverage**: Mengintegrasikan laporan coverage LCOV Jest (`coverage/lcov.info`).
