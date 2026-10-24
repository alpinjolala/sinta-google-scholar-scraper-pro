# SINTA & Google Scholar Publication Scraper Pro (v2.0)

Ekstensi Google Chrome modern (Manifest V3) yang dirancang khusus untuk akademisi, dosen, tim LP2M, dan peneliti guna mengekstrak (*scraping*) data publikasi secara otomatis, cerdas, dan rapi dari **SINTA (Science and Technology Index Kemdiktisaintek)** serta **Google Scholar**.

Mendukung ekspor multi-format siap pakai: **CSV (Excel Ready UTF-8 BOM)**, **Excel/TSV Clipboard (Tinggal Paste)**, **BibTeX (.bib)** untuk Zotero/Mendeley, dan **JSON**.

---

## ✨ Fitur-Fitur Unggulan Versi 2.0 (Pro Edition)
![tampilan ekstensi](https://github.com/alpinjolala/sinta-google-scholar-scraper-pro/blob/main/tampilan-ekstensi.png)
### 1. 🎨 Antarmuka Modern & Heads-Up Display (HUD) Interaktif
* **Desain Popup Elegan:** Tampilan visual profesional berbasis palet *academic emerald*, responsif, dengan status live deteksi otomatis halaman profil peneliti.
* **In-Page Floating HUD:** Selama proses berjalan, widget melayang muncul di halaman target yang menampilkan indikator persentase *real-time*, jumlah artikel terkumpul, serta tombol kendali langsung: **⏸️ Jeda (Pause)**, **▶️ Lanjut**, dan **⏹️ Selesai & Simpan**.
* **Pratinjau Data Interaktif (Data Preview Modal):** Sebelum mengunduh, Anda dapat membuka tabel pratinjau langsung di dalam browser lengkap dengan fitur pencarian instan (*live search filter*).
* **1-Click Salin ke Excel (Clipboard TSV):** Cukup klik *"Salin Hasil Terakhir"*, lalu buka Microsoft Excel atau Google Sheets dan tekan `Ctrl + V` — data langsung tertempel rapi terbagi kolom demi kolom tanpa perlu membuka file.

---

### 2. ⚡ Mode Kecepatan Google Scholar
* **⚡ Mode Cepat (Fast Mode):** Mengekstrak metadata esensial (Judul, Penulis, Publikasi/Jurnal, Tahun, Jumlah Sitasi, Tautan) langsung dari ringkasan profil. Mampu menarik ratusan publikasi hanya dalam beberapa detik!
* **🔍 Mode Mendalam (Deep Mode):** Mengunjungi tiap detail artikel di latar belakang dengan jeda waktu adaptif (*anti-bot protection*) untuk mengumpulkan Abstrak lengkap, Penerbit, Volume, Issue, dan Halaman.
* **🔎 Scholar Search Scraper:** Mendukung ekstraksi hasil pencarian literatur Google Scholar (`/scholar?q=...`) untuk kebutuhan studi pustaka dan *systematic literature review*.

---

### 3. 🏛️ Ekstraksi SINTA Lengkap (Multi-Tab & Batch)
![Proses ekstraksi](https://github.com/alpinjolala/sinta-google-scholar-scraper-pro/blob/main/proses-ekstraksi.png)
* **Dukungan Seluruh Tab SINTA:**
  * **Scopus:** Ranking Quartile (Q1–Q4), Nama Jurnal, Penulis, Jumlah Sitasi, dan Link SINTA.
  * **Garuda:** Akreditasi Jurnal (SINTA 1 – SINTA 6), Link Tautan DOI asli, Penulis, dan Jumlah Sitasi.
  * **Google Scholar:** Pemisahan baris cerdas (*smart text-line parsing*) untuk memisahkan Nama Penulis dan Nama Jurnal secara presisi.
  * **Web of Science (WoS):** Metadata artikel internasional terindeks Clarivate WoS.
  * **Buku:** Ekstraksi judul buku ilmiah, ISBN, dan Penerbit.
  * **Paten & HKI:** Ekstraksi nomor permohonan dan jenis kekayaan intelektual.
* **Opsi Batch Tab Sekaligus:** Cukup centang *"Ekstrak Semua Tab Sekaligus"*, ekstensi akan memindai Scopus, Garuda, Scholar, WoS, Buku, dan HKI dalam satu klik!

---

### 4. 🎯 Filter & Kustomisasi Lanjutan
* **Filter Minimal Tahun:** Ekstrak khusus publikasi di rentang tahun tertentu (misal: `>= 2020` untuk laporan BKD atau akreditasi 5 tahun terakhir).
* **Format Pemisah CSV:** Pilihan koma (`,`) untuk standar internasional atau titik koma (`;`) yang langsung cocok dengan regional setting Windows/Excel di Indonesia tanpa formatting ulang.
* **Format BibTeX (.bib):** Siap diimpor langsung ke manajer referensi seperti **Mendeley**, **Zotero**, **JabRef**, atau **LaTeX Overleaf**.
* **Anti-Duplikasi Cerdas:** Sistem otomatis mendeteksi dan membersihkan publikasi ganda (*deduplication*).
* **Pengaturan Kecepatan / Jeda:** Pilihan mode Cepat (1s), Normal (2s), dan Aman/Anti-Bot (3.5s) dengan *random jitter* agar aman dari pemblokiran IP.

---

## 📂 Struktur Berkas Ekstensi

```text
├── manifest.json       # Konfigurasi Chrome Manifest V3 & Hak Akses
├── popup.html          # Antarmuka panel kontrol popup
├── popup.css           # Styling modern & desain komponen UI
├── popup.js            # Logika interaksi popup & controller
├── content.js          # Mesin ekstraktor (DOM parser, SINTA & Scholar engine, HUD)
└── icons/              # Ikon ekstensi beresolusi tinggi (16, 32, 48, 128 px)
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

---

## 🚀 Cara Memasang / Memperbarui di Google Chrome

1. Buka browser **Google Chrome**.
2. Masuk ke halaman ekstensi dengan mengetikkan `chrome://extensions/` pada bilah alamat URL.
3. Pastikan tombol sakelar **Developer mode** (Mode Pengembang) di kanan atas telah aktif.
4. Jika sebelumnya sudah terpasang versi lama:
   * Klik ikon **Refresh / Putar** 🔄 pada kartu ekstensi *"SINTA & Scholar Scraper Pro"*.
5. Jika memasang untuk pertama kali:
   * Klik tombol **Load unpacked** (Muat yang belum dikemas) di pojok kiri atas.
   * Pilih folder tempat berkas ini berada (`Sinta-Scholar-Scraper`).
6. Pasang pin pada ekstensi melalui ikon Puzzle 🧩 di pojok kanan atas browser agar mudah diakses sewaktu-waktu.

---

## 💡 Panduan Penggunaan Singkat

1. Buka salah satu halaman sasaran:
   * **Profil SINTA Peneliti:** Contoh `https://sinta.kemdiktisaintek.go.id/authors/profile/xxxx`
   * **Profil Google Scholar:** Contoh `https://scholar.google.com/citations?user=xxxx`
2. Klik ikon ekstensi di pojok kanan atas.
3. Ekstensi akan otomatis mendeteksi nama peneliti dan tab aktif.
4. Pilih jangkauan halaman (**Semua Halaman**, **Halaman Aktif**, atau **Rentang Halaman**).
5. Atur opsi tambahan bila diperlukan (misal: *Mode Cepat* vs *Mode Mendalam* atau filter minimal tahun).
6. Klik tombol **🚀 Mulai Ekstraksi Data**.
7. Saksikan proses pada *Floating HUD* di layar. Anda dapat menjeda atau menghentikan proses kapan saja.
8. Setelah selesai, file CSV akan otomatis terunduh, atau Anda dapat memilih format lain (**BibTeX**, **JSON**, atau **Salin ke Excel**).

---
![Ekstraksi selesai](https://github.com/alpinjolala/sinta-google-scholar-scraper-pro/blob/main/ekstraksi-selesai.png)
![Preview result](https://github.com/alpinjolala/sinta-google-scholar-scraper-pro/blob/main/preview-result.png)

## 🛡️ Lisensi & Etika Penggunaan

* **Lisensi:** Didistribusikan di bawah [MIT License](LICENSE). Bebas digunakan untuk keperluan penelitian pribadi, akademik institusi, maupun pengembangan lanjutan.
* **Etika:** Gunakan jeda waktu wajar saat mengekstrak ratusan data agar tidak membebani server target dan menjaga kesinambungan akses bagi sesama civitas akademika.
