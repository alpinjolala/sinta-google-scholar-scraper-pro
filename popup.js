// SINTA & Scholar Scraper Pro - Popup Controller
let currentTab = null;
let pageInfo = null;
let isScraping = false;
let isPaused = false;

// DOM Elements
const targetDot = document.getElementById("targetDot");
const targetTitle = document.getElementById("targetTitle");
const targetHelp = document.getElementById("targetHelp");
const authorInfo = document.getElementById("authorInfo");
const authorName = document.getElementById("authorName");
const authorMeta = document.getElementById("authorMeta");
const quickLinks = document.getElementById("quickLinks");

const configSection = document.getElementById("configSection");
const rangeInputs = document.getElementById("rangeInputs");
const scholarOptions = document.getElementById("scholarOptions");
const sintaOptions = document.getElementById("sintaOptions");

const btnStartScrape = document.getElementById("btnStartScrape");
const progressContainer = document.getElementById("progressContainer");
const progressBar = document.getElementById("progressBar");
const progressPercent = document.getElementById("progressPercent");
const progressStatusText = document.getElementById("progressStatusText");
const btnPauseScrape = document.getElementById("btnPauseScrape");
const btnStopScrape = document.getElementById("btnStopScrape");

const btnCopyClipboard = document.getElementById("btnCopyClipboard");
const btnPreviewData = document.getElementById("btnPreviewData");
const btnOpenSinta = document.getElementById("btnOpenSinta");
const btnOpenScholar = document.getElementById("btnOpenScholar");
const toast = document.getElementById("toast");

// Initialize on Popup open
document.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  await initTabInfo();
});

// Toast notification helper
function showToast(text, duration = 2500) {
  toast.innerText = text;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), duration);
}

// Setup Event Listeners
function setupEventListeners() {
  // Page Scope radio buttons
  document.querySelectorAll('input[name="pageScope"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      rangeInputs.style.display = e.target.value === "range" ? "flex" : "none";
    });
  });

  // Start Scrape
  btnStartScrape.addEventListener("click", handleStartScrape);

  // Pause / Resume
  btnPauseScrape.addEventListener("click", () => {
    isPaused = !isPaused;
    btnPauseScrape.innerText = isPaused ? "▶️ Lanjutkan" : "⏸️ Jeda";
    sendTabMessage({ action: isPaused ? "pause" : "resume" });
  });

  // Stop & Save
  btnStopScrape.addEventListener("click", () => {
    sendTabMessage({ action: "stop" });
  });

  // Copy last scraped data to clipboard
  btnCopyClipboard.addEventListener("click", async () => {
    sendTabMessage({ action: "copyToClipboard" }, (response) => {
      if (response && response.success) {
        showToast("✅ Berhasil disalin ke Clipboard (TSV)!");
      } else {
        showToast("Belum ada data untuk disalin.");
      }
    });
  });

  // Open Preview Modal on Tab
  btnPreviewData.addEventListener("click", () => {
    sendTabMessage({ action: "openPreviewModal" }, (response) => {
      if (!response || !response.success) {
        showToast("Belum ada data untuk dipratinjau.");
      }
    });
  });

  // Quick Links
  btnOpenSinta.addEventListener("click", () => {
    chrome.tabs.create({ url: "https://sinta.kemdiktisaintek.go.id/authors" });
  });

  btnOpenScholar.addEventListener("click", () => {
    chrome.tabs.create({ url: "https://scholar.google.com" });
  });

  // Listen to messages from content script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "progress") {
      updateProgressUI(message);
    } else if (message.action === "done") {
      handleScrapeComplete(message);
    } else if (message.action === "error") {
      handleScrapeError(message);
    }
  });
}

// Detect Tab and Inject Content Script if needed
async function initTabInfo() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  if (!tab || !tab.url) {
    renderUnsupportedPage("Tab tidak dapat diakses.");
    return;
  }

  const url = tab.url;
  const isScholar = url.includes("scholar.google.");
  const isSinta = url.includes("sinta.kemdiktisaintek.go.id") || url.includes("sinta.kemdikbud.go.id");

  if (!isScholar && !isSinta) {
    renderUnsupportedPage();
    return;
  }

  // Ensure content script is ready
  try {
    const response = await sendTabMessagePromise({ action: "detectPage" });
    if (response) {
      renderPageDetection(response);
      return;
    }
  } catch (err) {
    // If content script not yet injected, inject it now
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });
      const response = await sendTabMessagePromise({ action: "detectPage" });
      if (response) {
        renderPageDetection(response);
        return;
      }
    } catch (e) {
      console.error("Gagal inject content script:", e);
    }
  }

  // Fallback detection from URL
  fallbackDetection(url, isScholar, isSinta);
}

function fallbackDetection(url, isScholar, isSinta) {
  if (isScholar) {
    renderPageDetection({
      platform: "scholar",
      subType: url.includes("/citations") ? "profile" : "search",
      authorName: "Profil Google Scholar",
      meta: "Siap diekstrak",
    });
  } else if (isSinta) {
    renderPageDetection({
      platform: "sinta",
      subType: "author",
      authorName: "Profil SINTA",
      meta: "Siap diekstrak",
    });
  }
}

function renderUnsupportedPage(customMsg) {
  targetDot.className = "status-dot dot-warning";
  targetTitle.innerText = "Bukan Halaman SINTA / Scholar";
  targetHelp.innerText = customMsg || "Silakan buka halaman profil Google Scholar atau SINTA terlebih dahulu.";
  targetHelp.style.display = "block";
  authorInfo.style.display = "none";
  quickLinks.style.display = "flex";
  btnStartScrape.disabled = true;
  scholarOptions.style.display = "none";
  sintaOptions.style.display = "none";
}

function renderPageDetection(info) {
  pageInfo = info;
  targetDot.className = "status-dot dot-active";
  btnStartScrape.disabled = false;
  targetHelp.style.display = "none";
  quickLinks.style.display = "none";

  if (info.platform === "scholar") {
    targetTitle.innerText = info.subType === "search" 
      ? "Google Scholar (Hasil Pencarian)" 
      : "Google Scholar (Profil Peneliti)";
    scholarOptions.style.display = info.subType === "profile" ? "block" : "none";
    sintaOptions.style.display = "none";

    if (info.authorName) {
      authorInfo.style.display = "flex";
      authorName.innerText = info.authorName;
      authorMeta.innerText = info.meta || "Profil Peneliti Google Scholar";
    }
  } else if (info.platform === "sinta") {
    const tabName = (info.activeTab || "Scopus").toUpperCase();
    targetTitle.innerText = `SINTA (${tabName} Tab)`;
    scholarOptions.style.display = "none";
    sintaOptions.style.display = "block";

    if (info.authorName) {
      authorInfo.style.display = "flex";
      authorName.innerText = info.authorName;
      authorMeta.innerText = info.meta || `SINTA Kemdiktisaintek • Tab: ${tabName}`;
    }
  }

  // Check if there is an active scraping session on page
  if (info.isScraping) {
    isScraping = true;
    progressContainer.style.display = "block";
    btnStartScrape.disabled = true;
    updateProgressUI(info.progressState);
  }
}

// Start Scrape button handler
async function handleStartScrape() {
  if (!currentTab) return;

  const pageScope = document.querySelector('input[name="pageScope"]:checked').value;
  const startPage = parseInt(document.getElementById("startPage").value) || 1;
  const endPage = parseInt(document.getElementById("endPage").value) || 1;

  if (pageScope === "range" && startPage > endPage) {
    showToast("⚠️ Halaman awal tidak boleh lebih besar dari akhir!");
    return;
  }

  const scholarMode = document.querySelector('input[name="scholarMode"]:checked')?.value || "fast";
  const sintaAllTabs = document.getElementById("sintaAllTabs")?.checked || false;
  const filterYearMin = parseInt(document.getElementById("filterYearMin").value) || null;
  const csvSeparator = document.getElementById("csvSeparator").value || ",";
  const delayMode = document.getElementById("delayMode").value || "normal";

  const config = {
    pageScope,
    startPage,
    endPage,
    scholarMode,
    sintaAllTabs,
    filterYearMin,
    csvSeparator,
    delayMode,
  };

  isScraping = true;
  progressContainer.style.display = "block";
  btnStartScrape.disabled = true;
  progressBar.style.width = "5%";
  progressPercent.innerText = "5%";
  progressStatusText.innerText = "Memulai proses ekstraksi...";

  try {
    await sendTabMessagePromise({ action: "startScrape", config });
  } catch (err) {
    // If not injected, inject and start
    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      files: ["content.js"],
    });
    sendTabMessage({ action: "startScrape", config });
  }
}

function updateProgressUI(data) {
  if (!data) return;
  progressContainer.style.display = "block";
  btnStartScrape.disabled = true;

  if (data.percent !== undefined) {
    const pct = Math.min(100, Math.max(0, Math.round(data.percent)));
    progressBar.style.width = `${pct}%`;
    progressPercent.innerText = `${pct}%`;
  }
  if (data.status) {
    progressStatusText.innerText = data.status;
  }
  if (data.isPaused !== undefined) {
    isPaused = data.isPaused;
    btnPauseScrape.innerText = isPaused ? "▶️ Lanjutkan" : "⏸️ Jeda";
  }
}

function handleScrapeComplete(data) {
  isScraping = false;
  progressBar.style.width = "100%";
  progressPercent.innerText = "100%";
  progressStatusText.innerText = `Selesai! Berhasil mengambil ${data.total || 0} publikasi.`;
  btnStartScrape.disabled = false;
  showToast(`🎉 Berhasil mengekstrak ${data.total || 0} publikasi!`, 3500);

  setTimeout(() => {
    progressContainer.style.display = "none";
  }, 4000);
}

function handleScrapeError(data) {
  isScraping = false;
  btnStartScrape.disabled = false;
  progressStatusText.innerText = `Terhenti: ${data.message || "Terjadi kesalahan"}`;
  showToast("❌ " + (data.message || "Gagal mengambil data"));
}

// Messaging helper
function sendTabMessage(msg, callback) {
  if (!currentTab || !currentTab.id) return;
  chrome.tabs.sendMessage(currentTab.id, msg, (response) => {
    if (chrome.runtime.lastError) {
      console.warn("Message error:", chrome.runtime.lastError.message);
    }
    if (callback) callback(response);
  });
}

function sendTabMessagePromise(msg) {
  return new Promise((resolve, reject) => {
    if (!currentTab || !currentTab.id) return reject("No active tab");
    chrome.tabs.sendMessage(currentTab.id, msg, (response) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(response);
    });
  });
}
