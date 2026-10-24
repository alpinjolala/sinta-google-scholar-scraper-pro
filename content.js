// SINTA & Scholar Scraper Pro - Core Content Engine v2.0
// Designed for Google Scholar & SINTA Kemdiktisaintek

(function () {
  // Prevent duplicate script execution
  if (window.__sintaScholarScraperLoaded) {
    return;
  }
  window.__sintaScholarScraperLoaded = true;

  // State Management
  const state = {
    isScraping: false,
    isPaused: false,
    isStopped: false,
    lastScrapedData: [],
    authorProfile: null,
    progressState: {
      percent: 0,
      status: "Menunggu",
      total: 0,
    },
  };

  // Helper: Async Delay with jitter for natural pacing
  const delay = (ms) => {
    const jitter = Math.floor(Math.random() * 300);
    return new Promise((resolve) => setTimeout(resolve, ms + jitter));
  };

  // Helper: Get delay milliseconds from mode
  function getDelayMs(mode) {
    if (mode === "fast") return 1000;
    if (mode === "safe") return 3500;
    return 2000; // normal
  }

  // ----------------------------------------------------
  // 1. PAGE DETECTION
  // ----------------------------------------------------
  function detectCurrentPage() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    const search = window.location.search;
    const urlObj = new URL(window.location.href);

    if (hostname.includes("scholar.google.")) {
      if (pathname.includes("/citations")) {
        // Author profile page
        const nameEl = document.querySelector("#gsc_prf_in");
        const affilEl = document.querySelector(".gsc_prf_il");
        const citationsEl = document.querySelector("#gsc_rsb_st tbody tr td.gsc_rsb_std");

        return {
          platform: "scholar",
          subType: "profile",
          authorName: nameEl?.innerText?.trim() || "Profil Google Scholar",
          meta: (affilEl?.innerText?.trim() || "Afiliasi tidak diketahui") + 
                (citationsEl ? ` • Sitasi: ${citationsEl.innerText.trim()}` : ""),
          isScraping: state.isScraping,
          progressState: state.progressState,
        };
      } else if (pathname.includes("/scholar")) {
        // Scholar search results
        const query = urlObj.searchParams.get("q") || "";
        return {
          platform: "scholar",
          subType: "search",
          authorName: query ? `Pencarian: "${query}"` : "Hasil Pencarian Scholar",
          meta: "Google Scholar Search Results",
          isScraping: state.isScraping,
          progressState: state.progressState,
        };
      }
    } else if (hostname.includes("sinta.kemdiktisaintek.go.id") || hostname.includes("sinta.kemdikbud.go.id")) {
      const activeTab = urlObj.searchParams.get("view") || "scopus";
      
      // Author info
      let authorName = "";
      const h3 = document.querySelector(".meta-profile h3, .author-profile h3, h3.meta-profile");
      if (h3) authorName = h3.innerText.trim();

      let meta = "";
      const affilEl = document.querySelector(".meta-profile .affil, .author-profile .affil");
      if (affilEl) meta = affilEl.innerText.trim();

      // Look for SINTA ID
      const sintaIdEl = Array.from(document.querySelectorAll("div, span, p")).find(el => 
        el.innerText && el.innerText.includes("SINTA ID :") && el.children.length === 0
      );
      if (sintaIdEl) {
        meta += (meta ? " • " : "") + sintaIdEl.innerText.trim();
      }

      return {
        platform: "sinta",
        subType: "author",
        activeTab: activeTab,
        authorName: authorName || "Profil Peneliti SINTA",
        meta: meta || `Tab Aktif: ${activeTab.toUpperCase()}`,
        isScraping: state.isScraping,
        progressState: state.progressState,
      };
    }

    return null;
  }

  // ----------------------------------------------------
  // 2. IN-PAGE FLOATING HUD & NOTIFICATIONS
  // ----------------------------------------------------
  function createOrGetHUD() {
    let hud = document.getElementById("scraper-pro-hud");
    if (!hud) {
      hud = document.createElement("div");
      hud.id = "scraper-pro-hud";
      hud.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9999999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        color: #1e293b;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.18), 0 8px 10px -6px rgba(0,0,0,0.1);
        width: 320px;
        overflow: hidden;
        transition: all 0.25s ease;
      `;
      document.body.appendChild(hud);
    }
    return hud;
  }

  function updateHUDProgress(percent, statusText, total = 0) {
    const hud = createOrGetHUD();
    state.progressState = { percent, status: statusText, total };

    // Also broadcast to popup
    chrome.runtime.sendMessage({
      action: "progress",
      percent,
      status: statusText,
      total,
      isPaused: state.isPaused,
    }).catch(() => {});

    hud.innerHTML = `
      <div style="background: linear-gradient(135deg, #065f46, #047857); color: white; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#10b981; box-shadow:0 0 6px #10b981;"></span>
          <strong style="font-size:12px; letter-spacing:0.3px;">SINTA & Scholar Scraper</strong>
        </div>
        <span style="font-size:11px; font-weight:700; background:rgba(255,255,255,0.2); padding:2px 6px; border-radius:10px;">${Math.round(percent)}%</span>
      </div>
      <div style="padding: 12px 14px;">
        <div style="height: 6px; background: #e2e8f0; border-radius: 999px; overflow: hidden; margin-bottom: 8px;">
          <div style="width: ${percent}%; height: 100%; background: #10b981; transition: width 0.3s ease;"></div>
        </div>
        <div style="font-size: 11.5px; color: #475569; margin-bottom: 10px; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${statusText}">
          ${statusText}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b; margin-bottom: 10px;">
          <span>Terkumpul: <b style="color:#0f172a;">${total} publikasi</b></span>
        </div>
        <div style="display: flex; gap: 6px;">
          <button id="hud-btn-pause" style="flex:1; padding:6px 8px; font-size:11px; font-weight:600; border-radius:6px; cursor:pointer; background:#f1f5f9; border:1px solid #cbd5e1; color:#334155;">
            ${state.isPaused ? "▶️ Lanjut" : "⏸️ Jeda"}
          </button>
          <button id="hud-btn-stop" style="flex:1; padding:6px 8px; font-size:11px; font-weight:600; border-radius:6px; cursor:pointer; background:#fef2f2; border:1px solid #fecaca; color:#dc2626;">
            ⏹️ Selesai
          </button>
        </div>
      </div>
    `;

    document.getElementById("hud-btn-pause")?.addEventListener("click", () => {
      state.isPaused = !state.isPaused;
      updateHUDProgress(percent, state.isPaused ? "Scraping Dijeda" : statusText, total);
    });

    document.getElementById("hud-btn-stop")?.addEventListener("click", () => {
      state.isStopped = true;
      updateHUDProgress(percent, "Menghentikan & Menyimpan Data...", total);
    });
  }

  function showHUDCompletion(total, data, config) {
    const hud = createOrGetHUD();
    chrome.runtime.sendMessage({ action: "done", total }).catch(() => {});

    hud.innerHTML = `
      <div style="background: linear-gradient(135deg, #059669, #047857); color: white; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size:16px;">🎉</span>
          <strong style="font-size:12px;">Ekstraksi Selesai!</strong>
        </div>
        <button id="hud-close-btn" style="background:none; border:none; color:white; font-size:16px; cursor:pointer;">&times;</button>
      </div>
      <div style="padding: 14px;">
        <p style="margin:0 0 10px; font-size:12px; color:#334155;">
          Berhasil mengumpulkan <b>${total} data publikasi</b> yang siap diekspor.
        </p>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; margin-bottom:8px;">
          <button id="hud-dl-csv" style="padding:7px; font-size:11px; font-weight:700; border-radius:6px; background:#059669; color:white; border:none; cursor:pointer;">
            📊 Unduh CSV
          </button>
          <button id="hud-dl-bib" style="padding:7px; font-size:11px; font-weight:700; border-radius:6px; background:#0284c7; color:white; border:none; cursor:pointer;">
            📑 Unduh BibTeX
          </button>
          <button id="hud-dl-json" style="padding:7px; font-size:11px; font-weight:700; border-radius:6px; background:#475569; color:white; border:none; cursor:pointer;">
            🗂️ Unduh JSON
          </button>
          <button id="hud-copy-tsv" style="padding:7px; font-size:11px; font-weight:700; border-radius:6px; background:#f1f5f9; color:#0f766e; border:1px solid #cbd5e1; cursor:pointer;">
            📋 Salin Excel
          </button>
        </div>
        <button id="hud-preview-btn" style="width:100%; padding:8px; font-size:11.5px; font-weight:600; border-radius:6px; background:#f8fafc; border:1px dashed #059669; color:#047857; cursor:pointer;">
          🔍 Lihat Pratinjau Tabel Lengkap
        </button>
      </div>
    `;

    document.getElementById("hud-close-btn")?.addEventListener("click", () => hud.remove());

    document.getElementById("hud-dl-csv")?.addEventListener("click", () => {
      exportCSV(data, config?.csvSeparator || ",");
    });

    document.getElementById("hud-dl-bib")?.addEventListener("click", () => {
      exportBibTeX(data);
    });

    document.getElementById("hud-dl-json")?.addEventListener("click", () => {
      exportJSON(data);
    });

    document.getElementById("hud-copy-tsv")?.addEventListener("click", () => {
      copyToClipboardTSV(data);
    });

    document.getElementById("hud-preview-btn")?.addEventListener("click", () => {
      openPreviewModal(data);
    });
  }

  function hideHUD() {
    const hud = document.getElementById("scraper-pro-hud");
    if (hud) hud.remove();
  }

  // Floating Toast in-page
  function showPageToast(message) {
    let toast = document.getElementById("scraper-page-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "scraper-page-toast";
      toast.style.cssText = `
        position: fixed;
        top: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: #1e293b;
        color: white;
        padding: 9px 18px;
        border-radius: 30px;
        font-family: sans-serif;
        font-size: 12px;
        z-index: 10000000;
        box-shadow: 0 4px 14px rgba(0,0,0,0.25);
        pointer-events: none;
        transition: opacity 0.3s;
      `;
      document.body.appendChild(toast);
    }
    toast.innerText = message;
    toast.style.opacity = "1";
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 400);
    }, 2500);
  }

  // ----------------------------------------------------
  // 3. DATA EXPORT HELPERS (CSV, TSV, BibTeX, JSON)
  // ----------------------------------------------------
  function convertToCSVString(objArray, separator = ",") {
    if (!objArray || objArray.length === 0) return "";
    const headers = Array.from(new Set(objArray.flatMap(Object.keys)));
    let csv = headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(separator) + "\r\n";

    objArray.forEach((row) => {
      let rowData = headers.map((header) => {
        let cellData = row[header] === null || row[header] === undefined ? "" : String(row[header]);
        cellData = cellData.replace(/"/g, '""');
        return `"${cellData}"`;
      });
      csv += rowData.join(separator) + "\r\n";
    });
    return csv;
  }

  function exportCSV(data, separator = ",") {
    const csvContent = convertToCSVString(data, separator);
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, `Publikasi_${getDownloadPrefix()}_${Date.now()}.csv`);
  }

  function exportJSON(data) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
    downloadBlob(blob, `Publikasi_${getDownloadPrefix()}_${Date.now()}.json`);
  }

  function exportBibTeX(data) {
    let bib = "";
    data.forEach((item, index) => {
      const type = item["Tipe"] === "Buku" ? "book" : "article";
      const authorFirst = (item["Penulis"] || item["Creator/Penulis"] || "Author").split(/[, ]+/)[0].replace(/[^a-zA-Z]/g, "") || "Ref";
      const year = item["Tahun Terbit"] || item["Tahun"] || new Date().getFullYear();
      const citeKey = `${authorFirst}${year}_${index + 1}`;

      bib += `@${type}{${citeKey},\n`;
      if (item["Judul"]) bib += `  title = {${item["Judul"].replace(/[{}]/g, "")}},\n`;
      if (item["Penulis"] || item["Creator/Penulis"]) bib += `  author = {${(item["Penulis"] || item["Creator/Penulis"]).replace(/[{}]/g, "")}},\n`;
      if (item["Jurnal"] || item["Nama Jurnal"]) bib += `  journal = {${(item["Jurnal"] || item["Nama Jurnal"]).replace(/[{}]/g, "")}},\n`;
      if (item["Penerbit"]) bib += `  publisher = {${item["Penerbit"]}},\n`;
      if (year) bib += `  year = {${year}},\n`;
      if (item["Tautan DOI"] && item["Tautan DOI"] !== "-") bib += `  doi = {${item["Tautan DOI"].replace("https://doi.org/", "")}},\n`;
      if (item["Abstrak"]) bib += `  abstract = {${item["Abstrak"].replace(/[{}]/g, "")}},\n`;
      if (item["Link"] || item["Link Artikel (SINTA)"] || item["Link Jurnal"]) {
        bib += `  url = {${item["Link"] || item["Link Artikel (SINTA)"] || item["Link Jurnal"]}},\n`;
      }
      bib += `}\n\n`;
    });

    const blob = new Blob([bib], { type: "text/plain;charset=utf-8;" });
    downloadBlob(blob, `Publikasi_${getDownloadPrefix()}_${Date.now()}.bib`);
  }

  function copyToClipboardTSV(data) {
    if (!data || data.length === 0) return false;
    const headers = Array.from(new Set(data.flatMap(Object.keys)));
    let tsv = headers.join("\t") + "\r\n";

    data.forEach((row) => {
      let rowData = headers.map((header) => {
        let cellData = row[header] === null || row[header] === undefined ? "" : String(row[header]);
        return cellData.replace(/[\r\n\t]+/g, " ");
      });
      tsv += rowData.join("\t") + "\r\n";
    });

    navigator.clipboard.writeText(tsv).then(() => {
      showPageToast("✅ Berhasil disalin ke Clipboard (Format Excel/TSV)!");
    }).catch(() => {
      showPageToast("⚠️ Gagal menyalin ke clipboard.");
    });
    return true;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showPageToast(`📥 File ${filename} berhasil diunduh!`);
  }

  function getDownloadPrefix() {
    return window.location.hostname.includes("sinta") ? "SINTA" : "SCHOLAR";
  }

  // ----------------------------------------------------
  // 4. IN-PAGE INTERACTIVE PREVIEW MODAL
  // ----------------------------------------------------
  function openPreviewModal(data) {
    if (!data || data.length === 0) {
      showPageToast("Tidak ada data untuk dipratinjau.");
      return;
    }

    const existingModal = document.getElementById("scraper-preview-modal");
    if (existingModal) existingModal.remove();

    const modal = document.createElement("div");
    modal.id = "scraper-preview-modal";
    modal.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px);
      z-index: 10000000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    const headers = Array.from(new Set(data.flatMap(Object.keys))).filter(
      (h) => h !== "Abstrak" && h !== "Link"
    );

    let tableRows = data.map((row, idx) => `
      <tr style="border-bottom: 1px solid #f1f5f9; ${idx % 2 === 1 ? "background:#f8fafc;" : ""}">
        <td style="padding:8px 10px; font-size:11px; color:#64748b;">${idx + 1}</td>
        ${headers.map((h) => `<td style="padding:8px 10px; font-size:11.5px; color:#334155; max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${row[h] || ''}">${row[h] || '-'}</td>`).join("")}
      </tr>
    `).join("");

    modal.innerHTML = `
      <div style="background: white; width: 90%; max-width: 980px; max-height: 85vh; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
        <!-- Modal Header -->
        <div style="padding: 14px 20px; background: linear-gradient(135deg, #065f46, #047857); color: white; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <h3 style="margin: 0; font-size: 15px; font-weight: 700;">Pratinjau Data Publikasi (${data.length} Item)</h3>
            <p style="margin: 2px 0 0; font-size: 11px; color: #a7f3d0;">Periksa dan unduh data hasil ekstraksi</p>
          </div>
          <button id="preview-modal-close" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer;">&times;</button>
        </div>

        <!-- Toolbar -->
        <div style="padding: 10px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
          <input type="text" id="preview-search" placeholder="Cari judul, penulis, jurnal..." style="padding: 6px 12px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 6px; width: 280px;">
          <div style="display: flex; gap: 8px;">
            <button id="modal-export-csv" style="padding: 6px 12px; font-size: 11.5px; font-weight: 600; background: #059669; color: white; border: none; border-radius: 6px; cursor: pointer;">Unduh CSV</button>
            <button id="modal-export-bib" style="padding: 6px 12px; font-size: 11.5px; font-weight: 600; background: #0284c7; color: white; border: none; border-radius: 6px; cursor: pointer;">Unduh BibTeX</button>
            <button id="modal-copy-tsv" style="padding: 6px 12px; font-size: 11.5px; font-weight: 600; background: #ffffff; color: #0f766e; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer;">Salin ke Clipboard</button>
          </div>
        </div>

        <!-- Table Viewport -->
        <div style="flex: 1; overflow: auto; padding: 0;">
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1; position: sticky; top: 0; z-index: 10;">
                <th style="padding: 10px; font-size: 11px; font-weight: 700; color: #475569;">#</th>
                ${headers.map((h) => `<th style="padding: 10px; font-size: 11px; font-weight: 700; color: #475569;">${h}</th>`).join("")}
              </tr>
            </thead>
            <tbody id="preview-table-body">
              ${tableRows}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("preview-modal-close")?.addEventListener("click", () => modal.remove());
    document.getElementById("modal-export-csv")?.addEventListener("click", () => exportCSV(data));
    document.getElementById("modal-export-bib")?.addEventListener("click", () => exportBibTeX(data));
    document.getElementById("modal-copy-tsv")?.addEventListener("click", () => copyToClipboardTSV(data));

    // Search filter in modal
    const searchInput = document.getElementById("preview-search");
    searchInput?.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase();
      const rows = document.querySelectorAll("#preview-table-body tr");
      rows.forEach((r) => {
        const text = r.innerText.toLowerCase();
        r.style.display = text.includes(q) ? "" : "none";
      });
    });
  }

  // ----------------------------------------------------
  // 5. GOOGLE SCHOLAR ENGINE (Fast & Deep Scraper)
  // ----------------------------------------------------
  async function scrapeScholarProfile(config) {
    const delayMs = getDelayMs(config.delayMode);
    updateHUDProgress(5, "Mempersiapkan profil Google Scholar...", 0);

    let loadMoreBtn = document.getElementById("gsc_bpf_more");
    let clickCount = 1;

    // Load more articles
    const maxPages = config.pageScope === "single" ? 1 : config.pageScope === "range" ? config.endPage : 9999;

    while (loadMoreBtn && !loadMoreBtn.disabled && clickCount < maxPages) {
      if (state.isStopped) break;
      while (state.isPaused) await delay(500);

      updateHUDProgress(
        Math.min(30, 5 + clickCount * 4),
        `Memuat artikel Scholar (Halaman ${clickCount + 1})...`,
        document.querySelectorAll(".gsc_a_tr").length
      );

      loadMoreBtn.click();
      clickCount++;
      await delay(Math.max(1200, delayMs));
      loadMoreBtn = document.getElementById("gsc_bpf_more");
    }

    const allRows = Array.from(document.querySelectorAll(".gsc_a_tr"));
    let targetRows = allRows;

    // Range slicing
    if (config.pageScope === "single") {
      targetRows = allRows.slice(0, 20);
    } else if (config.pageScope === "range") {
      const startIdx = (config.startPage - 1) * 20;
      const endIdx = config.endPage * 20;
      targetRows = allRows.slice(startIdx, endIdx);
    }

    let results = [];
    const totalItems = targetRows.length;

    for (let i = 0; i < totalItems; i++) {
      if (state.isStopped) break;
      while (state.isPaused) await delay(500);

      const row = targetRows[i];
      const titleLinkEl = row.querySelector(".gsc_a_at");
      const title = titleLinkEl?.innerText?.trim() || "";
      const articleUrl = titleLinkEl?.href || "";

      // Author & Venue
      const grayDivs = row.querySelectorAll(".gs_gray");
      const authors = grayDivs[0]?.innerText?.trim() || "-";
      const venue = grayDivs[1]?.innerText?.trim() || "-";

      // Year & Citations
      const yearEl = row.querySelector(".gsc_a_y .gsc_a_hc, .gsc_a_h");
      const year = yearEl?.innerText?.trim() || "";

      const citeEl = row.querySelector(".gsc_a_c .gsc_a_ac");
      const citations = citeEl?.innerText?.trim() || "0";

      // Year filter check
      if (config.filterYearMin && year && parseInt(year) < config.filterYearMin) {
        continue;
      }

      let itemData = {
        Sumber: "Google Scholar",
        Judul: title,
        Penulis: authors,
        "Jurnal / Publikasi": venue,
        "Tahun Terbit": year,
        "Jumlah Sitasi": citations,
        Link: articleUrl,
      };

      // DEEP MODE: Visit article link for Abstract, Publisher, etc.
      if (config.scholarMode === "deep" && articleUrl) {
        const pct = 30 + Math.round(((i + 1) / totalItems) * 65);
        updateHUDProgress(pct, `Mengambil detail (${i + 1}/${totalItems}): ${title.substring(0, 30)}...`, results.length);

        try {
          const resp = await fetch(articleUrl);
          const html = await resp.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");

          const fields = doc.querySelectorAll(".gsc_oci_field");
          const values = doc.querySelectorAll(".gsc_oci_value");

          fields.forEach((field, fIdx) => {
            const fName = field.innerText.trim();
            const val = values[fIdx]?.innerText?.trim() || "";

            if (/penulis|authors/i.test(fName)) itemData["Penulis"] = val;
            if (/tanggal terbit|publication date/i.test(fName)) itemData["Tanggal Terbit Lengkap"] = val;
            if (/jurnal|journal/i.test(fName)) itemData["Jurnal"] = val;
            if (/penerbit|publisher/i.test(fName)) itemData["Penerbit"] = val;
            if (/deskripsi|description/i.test(fName)) itemData["Abstrak"] = val;
            if (/volume/i.test(fName)) itemData["Volume"] = val;
            if (/terbitan|issue/i.test(fName)) itemData["Issue"] = val;
            if (/halaman|pages/i.test(fName)) itemData["Halaman"] = val;
          });

          await delay(delayMs);
        } catch (e) {
          console.warn("Gagal fetch detail artikel:", e);
        }
      } else {
        // Fast mode
        const pct = 30 + Math.round(((i + 1) / totalItems) * 65);
        updateHUDProgress(pct, `Mengekstrak data (${i + 1}/${totalItems})...`, results.length + 1);
      }

      results.push(itemData);
    }

    return results;
  }

  // Google Scholar Search Results Scraper
  async function scrapeScholarSearch(config) {
    const delayMs = getDelayMs(config.delayMode);
    let results = [];
    let currentPage = 1;
    const maxPages = config.pageScope === "single" ? 1 : config.pageScope === "range" ? config.endPage : 5;

    let nextUrl = window.location.href;

    while (nextUrl && currentPage <= maxPages) {
      if (state.isStopped) break;
      while (state.isPaused) await delay(500);

      updateHUDProgress(
        Math.round((currentPage / maxPages) * 90),
        `Mengekstrak hasil pencarian Halaman ${currentPage}...`,
        results.length
      );

      let doc = document;
      if (currentPage > 1) {
        try {
          const resp = await fetch(nextUrl);
          const html = await resp.text();
          const parser = new DOMParser();
          doc = parser.parseFromString(html, "text/html");
        } catch (err) {
          break;
        }
      }

      const items = doc.querySelectorAll(".gs_r.gs_or.gs_scl");
      items.forEach((item) => {
        const titleEl = item.querySelector(".gs_rt a, .gs_rt");
        const title = titleEl?.innerText?.trim() || "";
        const link = item.querySelector(".gs_rt a")?.href || "";
        const authorLine = item.querySelector(".gs_a")?.innerText?.trim() || "";
        const snippet = item.querySelector(".gs_rs")?.innerText?.trim() || "";
        const pdfLink = item.querySelector(".gs_or_ggsm a")?.href || "";

        let yearMatch = authorLine.match(/\b(19|20)\d{2}\b/);
        let year = yearMatch ? yearMatch[0] : "";

        let citeEl = Array.from(item.querySelectorAll(".gs_fl a")).find((a) =>
          /dirujuk|cited by/i.test(a.innerText)
        );
        let citations = citeEl ? citeEl.innerText.replace(/[^0-9]/g, "") : "0";

        if (config.filterYearMin && year && parseInt(year) < config.filterYearMin) {
          return;
        }

        if (title) {
          results.push({
            Sumber: "Scholar Search",
            Judul: title,
            "Penulis & Sumber": authorLine,
            Tahun: year,
            "Jumlah Sitasi": citations,
            Snippet: snippet,
            Link: link,
            "Link PDF/Fulltext": pdfLink || "-",
          });
        }
      });

      // Find next pagination link
      const nextBtn = Array.from(doc.querySelectorAll("#gs_n a")).find(
        (a) => a.innerText.includes("Berikutnya") || a.innerText.includes("Next")
      );
      if (nextBtn && nextBtn.href) {
        nextUrl = nextBtn.href;
        currentPage++;
        await delay(delayMs);
      } else {
        break;
      }
    }

    return results;
  }

  // ----------------------------------------------------
  // 6. SINTA ENGINE (Scopus, Garuda, Scholar, WoS, Buku, HKI)
  // ----------------------------------------------------
  function parseSintaArticles(doc, currentView) {
    const articles = doc.querySelectorAll(".ar-item, .ar-list-item");
    let items = [];

    articles.forEach((article) => {
      const titleEl = article.querySelector(".ar-title a, .title a");
      const title = titleEl?.innerText?.trim() || "";
      const sintaLink = titleEl?.href || "";

      let year = "";
      const textEls = article.querySelectorAll("*");
      textEls.forEach((el) => {
        const txt = el.innerText?.trim();
        if (txt && /^(19|20)\d{2}$/.test(txt) && el.children.length === 0) {
          year = txt;
        }
      });
      if (!year) year = article.querySelector(".ar-year")?.innerText?.trim() || "";

      if (!title) return;

      let authors = "-";
      let journalName = "-";
      let journalLink = "-";
      let citation = "0";
      let ranking = "-";
      let akreditasi = "-";
      let doiLink = "-";
      let extraField1 = "";
      let extraField2 = "";

      // 1. Scan metadata spans and links
      article.querySelectorAll("a, span, div").forEach((el) => {
        const text = el.innerText.trim();
        const lower = text.toLowerCase();
        const href = el.href || "";

        if (/^q[1-4]\b/i.test(lower)) {
          ranking = text;
        } else if (lower.includes("accred")) {
          akreditasi = text.replace(/accred\s*:/i, "").trim();
        } else if (lower.includes("cited") || lower.includes("citation")) {
          citation = text.replace(/[^0-9]/g, "");
        } else if (lower.includes("doi:")) {
          let cleanDoi = text.replace(/doi\s*:/i, "").trim().replace(/https?:\/\/doi\.org\//i, "");
          doiLink = cleanDoi ? `https://doi.org/${cleanDoi}` : "-";
        } else if (el.tagName === "A" && href && href !== sintaLink && text.length > 3 && !lower.includes("creator")) {
          if (!lower.includes("doi:") && !lower.includes("accred") && !/^(19|20)\d{2}$/.test(text)) {
            if (currentView !== "googlescholar" && currentView !== "wos") {
              if (journalName === "-" || href.includes("garuda") || href.includes("journal")) {
                journalName = text;
                journalLink = href;
              }
            }
          }
        }
      });

      // 2. Creator extraction
      article.querySelectorAll("div, span").forEach((div) => {
        const txt = div.innerText.trim();
        if (txt.includes("Creator :") && txt.length < 250) {
          authors = txt.split("Creator :")[1].trim();
        } else if (txt.includes("Creator:") && txt.length < 250) {
          authors = txt.split("Creator:")[1].trim();
        }
      });

      // 3. Google Scholar / WoS tab smart text line parsing
      if (currentView === "googlescholar" || currentView === "wos") {
        let lines = article.innerText
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        if (lines.length > 0 && (lines[0] === title || title.includes(lines[0]))) {
          lines.shift();
        }

        let filtered = lines.filter((l) => {
          let isPureYear = /^(19|20)\d{2}$/.test(l);
          let isCite = /\b\d+\s*cited\b/i.test(l) || /\b\d+\s*citation/i.test(l);
          return !isPureYear && !isCite;
        });

        if (filtered.length > 0) authors = filtered[0];
        if (filtered.length > 1) journalName = filtered[1];
      }

      // 4. Books and IPR/HKI special handling
      if (currentView === "buku" || currentView === "book") {
        article.querySelectorAll("div, span").forEach((el) => {
          const txt = el.innerText.trim();
          if (txt.includes("ISBN :") || txt.includes("ISBN:")) {
            extraField1 = txt.split(/ISBN\s*:/i)[1].trim();
          }
          if (txt.includes("Penerbit :") || txt.includes("Publisher :")) {
            extraField2 = txt.split(/(?:Penerbit|Publisher)\s*:/i)[1].trim();
          }
        });
      }

      // Build unified data object
      let item = {
        Sumber: `SINTA (${currentView.toUpperCase()})`,
        Judul: title,
        Tahun: year,
        Penulis: authors,
        "Nama Jurnal / Penerbit": journalName,
        "Jumlah Sitasi": citation,
      };

      if (currentView === "scopus") {
        item["Quartile (Ranking)"] = ranking;
        item["Link Artikel (SINTA)"] = sintaLink;
      } else if (currentView === "garuda") {
        item["Akreditasi SINTA"] = akreditasi;
        item["Tautan DOI"] = doiLink;
        item["Link Garuda"] = journalLink || sintaLink;
      } else if (currentView === "buku" || currentView === "book") {
        item["Tipe"] = "Buku";
        item["ISBN"] = extraField1 || "-";
        item["Penerbit"] = extraField2 || journalName;
      } else if (currentView === "ipr" || currentView === "hki") {
        item["Tipe"] = "Paten / HKI";
        item["Nomor Permohonan"] = extraField1 || "-";
      }

      items.push(item);
    });

    return items;
  }

  async function scrapeSintaTab(targetView, config, tabIndex = 1, totalTabs = 1) {
    const delayMs = getDelayMs(config.delayMode);
    let allData = [];
    let urlObj = new URL(window.location.href);
    urlObj.searchParams.set("view", targetView);
    urlObj.searchParams.delete("page");

    const startPage = config.pageScope === "range" ? config.startPage : 1;
    let pageNum = startPage;
    let hasMore = true;

    while (hasMore) {
      if (state.isStopped) break;
      while (state.isPaused) await delay(500);

      if (config.pageScope === "single" && pageNum > 1) break;
      if (config.pageScope === "range" && pageNum > config.endPage) break;

      const basePct = ((tabIndex - 1) / totalTabs) * 100;
      const tabProgress = (pageNum / 5) * (100 / totalTabs);
      const currentPct = Math.min(95, basePct + tabProgress);

      updateHUDProgress(
        currentPct,
        `SINTA [${targetView.toUpperCase()}] Halaman ${pageNum}...`,
        allData.length
      );

      try {
        urlObj.searchParams.set("page", pageNum);
        const resp = await fetch(urlObj.toString());
        const html = await resp.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        const pageArticles = parseSintaArticles(doc, targetView);

        if (pageArticles.length > 0) {
          // Filter by year if configured
          const filtered = config.filterYearMin
            ? pageArticles.filter((a) => !a.Tahun || parseInt(a.Tahun) >= config.filterYearMin)
            : pageArticles;

          allData.push(...filtered);
          pageNum++;
          await delay(delayMs);
        } else {
          hasMore = false;
        }
      } catch (err) {
        console.warn("Gagal fetch halaman SINTA:", err);
        hasMore = false;
      }
    }

    return allData;
  }

  async function scrapeAllSintaPipeline(config) {
    let tabsToScrape = [];
    const currentView = new URL(window.location.href).searchParams.get("view") || "scopus";

    if (config.sintaAllTabs) {
      tabsToScrape = ["scopus", "garuda", "googlescholar", "wos", "book", "ipr"];
    } else {
      tabsToScrape = [currentView];
    }

    let combinedResults = [];

    for (let i = 0; i < tabsToScrape.length; i++) {
      if (state.isStopped) break;
      const tabView = tabsToScrape[i];
      const tabResults = await scrapeSintaTab(tabView, config, i + 1, tabsToScrape.length);
      combinedResults.push(...tabResults);
    }

    // Deduplicate by Title
    const seen = new Set();
    const unique = combinedResults.filter((item) => {
      const norm = (item.Judul || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!norm || seen.has(norm)) return false;
      seen.add(norm);
      return true;
    });

    return unique;
  }

  // ----------------------------------------------------
  // 7. MAIN ENGINE DISPATCHER
  // ----------------------------------------------------
  async function runScraper(config) {
    state.isScraping = true;
    state.isPaused = false;
    state.isStopped = false;
    state.lastScrapedData = [];

    createOrGetHUD();
    updateHUDProgress(2, "Inisialisasi ekstraktor...", 0);

    let results = [];
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;

    try {
      if (hostname.includes("scholar.google.")) {
        if (pathname.includes("/citations")) {
          results = await scrapeScholarProfile(config);
        } else {
          results = await scrapeScholarSearch(config);
        }
      } else if (hostname.includes("sinta.")) {
        results = await scrapeAllSintaPipeline(config);
      } else {
        alert("Harap buka profil Google Scholar atau SINTA.");
        hideHUD();
        state.isScraping = false;
        return;
      }

      state.lastScrapedData = results;
      state.isScraping = false;

      // Save to chrome.storage.local for persistence
      try {
        chrome.storage.local.set({
          lastScrapedData: results,
          lastScrapedTime: Date.now(),
        });
      } catch (e) {}

      if (results.length > 0) {
        showHUDCompletion(results.length, results, config);
        // Automatic initial CSV download
        exportCSV(results, config.csvSeparator || ",");
      } else {
        updateHUDProgress(100, "Tidak ada artikel ditemukan pada kriteria tersebut.", 0);
        setTimeout(hideHUD, 3000);
      }
    } catch (err) {
      console.error("Kesalahan Scraping:", err);
      state.isScraping = false;
      chrome.runtime.sendMessage({ action: "error", message: err.message }).catch(() => {});
      updateHUDProgress(100, `Kesalahan: ${err.message}`, 0);
    }
  }

  // ----------------------------------------------------
  // 8. CHROME RUNTIME MESSAGE LISTENER
  // ----------------------------------------------------
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "detectPage") {
      const pageInfo = detectCurrentPage();
      sendResponse(pageInfo);
    } else if (request.action === "startScrape") {
      runScraper(request.config);
      sendResponse({ success: true });
    } else if (request.action === "pause") {
      state.isPaused = true;
      sendResponse({ success: true, isPaused: true });
    } else if (request.action === "resume") {
      state.isPaused = false;
      sendResponse({ success: true, isPaused: false });
    } else if (request.action === "stop") {
      state.isStopped = true;
      sendResponse({ success: true });
    } else if (request.action === "copyToClipboard") {
      if (state.lastScrapedData && state.lastScrapedData.length > 0) {
        const ok = copyToClipboardTSV(state.lastScrapedData);
        sendResponse({ success: ok });
      } else {
        // Try getting from storage
        chrome.storage.local.get(["lastScrapedData"], (res) => {
          if (res && res.lastScrapedData && res.lastScrapedData.length > 0) {
            copyToClipboardTSV(res.lastScrapedData);
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false });
          }
        });
        return true; // async
      }
    } else if (request.action === "openPreviewModal") {
      if (state.lastScrapedData && state.lastScrapedData.length > 0) {
        openPreviewModal(state.lastScrapedData);
        sendResponse({ success: true });
      } else {
        chrome.storage.local.get(["lastScrapedData"], (res) => {
          if (res && res.lastScrapedData && res.lastScrapedData.length > 0) {
            openPreviewModal(res.lastScrapedData);
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false });
          }
        });
        return true;
      }
    }
    return true;
  });

  // ----------------------------------------------------
  // 9. IN-PAGE QUICK TRIGGER BADGE (Unobtrusive)
  // ----------------------------------------------------
  function insertQuickBadge() {
    if (document.getElementById("scraper-quick-badge")) return;
    const badge = document.createElement("div");
    badge.id = "scraper-quick-badge";
    badge.style.cssText = `
      position: fixed;
      bottom: 18px;
      left: 18px;
      z-index: 999998;
      background: linear-gradient(135deg, #065f46, #047857);
      color: white;
      padding: 6px 12px;
      border-radius: 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(4, 120, 87, 0.35);
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
      opacity: 0.85;
    `;
    badge.innerHTML = `
      <span style="font-size:13px;">🎓</span>
      <span>Scraper Pro</span>
    `;

    badge.addEventListener("mouseenter", () => {
      badge.style.opacity = "1";
      badge.style.transform = "scale(1.05)";
    });
    badge.addEventListener("mouseleave", () => {
      badge.style.opacity = "0.85";
      badge.style.transform = "scale(1)";
    });

    badge.addEventListener("click", () => {
      // Trigger default scrape
      runScraper({
        pageScope: "all",
        startPage: 1,
        endPage: 5,
        scholarMode: "fast",
        sintaAllTabs: false,
        filterYearMin: null,
        csvSeparator: ",",
        delayMode: "normal",
      });
    });

    document.body.appendChild(badge);
  }

  // Insert badge if target page
  if (
    window.location.hostname.includes("scholar.google.") ||
    window.location.hostname.includes("sinta.")
  ) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", insertQuickBadge);
    } else {
      insertQuickBadge();
    }
  }
})();
