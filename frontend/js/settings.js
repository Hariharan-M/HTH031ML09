/**
 * Settings Controller - Risk Thresholds, Model Config & API Settings
 * Aegis Risk Intelligence
 */
const SettingsController = {
  init() {
    this.loadSettings();
    this.attachEventListeners();
  },

  loadSettings() {
    // API URL
    const apiUrl =
      localStorage.getItem(APP_CONFIG.STORAGE_KEYS.API_URL) ||
      APP_CONFIG.API_BASE_URL;
    const urlInput = document.getElementById("settingApiUrl");
    if (urlInput) urlInput.value = apiUrl;

    // Thresholds
    const savedThresholds =
      JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.THRESHOLDS)) ||
      APP_CONFIG.DEFAULT_THRESHOLDS;
    const criticalInput = document.getElementById("threshCritical");
    const highInput = document.getElementById("threshHigh");
    const medInput = document.getElementById("threshMed");

    if (criticalInput) criticalInput.value = savedThresholds.critical;
    if (highInput) highInput.value = savedThresholds.high;
    if (medInput) medInput.value = savedThresholds.medium || 0.4;

    this.updateThresholdDisplay();
  },

  updateThresholdDisplay() {
    const critVal = document.getElementById("threshCritical")?.value;
    const highVal = document.getElementById("threshHigh")?.value;
    const medVal = document.getElementById("threshMed")?.value;

    const critDisplay = document.getElementById("threshCriticalVal");
    const highDisplay = document.getElementById("threshHighVal");
    const medDisplay = document.getElementById("threshMedVal");

    if (critDisplay)
      critDisplay.textContent = formatPercent(parseFloat(critVal) || 0.85);
    if (highDisplay)
      highDisplay.textContent = formatPercent(parseFloat(highVal) || 0.7);
    if (medDisplay)
      medDisplay.textContent = formatPercent(parseFloat(medVal) || 0.4);
  },

  async testConnection() {
    const btn = document.getElementById("testApiBtn");
    const statusText = document.getElementById("apiTestStatus");
    const urlInput = document.getElementById("settingApiUrl");

    if (btn) btn.classList.add("disabled");
    if (statusText)
      statusText.innerHTML = `<span style="color: var(--text-secondary); font-family: var(--font-mono);"><i class="bi bi-arrow-repeat"></i> Testing connectivity...</span>`;

    const targetUrl = urlInput.value.trim() || "http://127.0.0.1:8000";
    const startTime = performance.now();

    try {
      const res = await fetch(`${targetUrl}${APP_CONFIG.ENDPOINTS.HEALTH}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(3000),
      });

      const latency = Math.round(performance.now() - startTime);

      if (res.ok) {
        const data = await res.json();
        if (statusText) {
          statusText.innerHTML = `<span style="color: var(--color-success); font-weight: 600;"><i class="bi bi-check-circle-fill"></i> Connected (${latency}ms)</span> - ${data.message || "API Online"}`;
        }
        Toast.success(
          "API Connected",
          `FastAPI backend is responsive (${latency}ms).`,
        );
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      if (statusText) {
        statusText.innerHTML = `<span style="color: var(--color-danger); font-weight: 600;"><i class="bi bi-x-circle-fill"></i> Unreachable</span> (${err.message}). Using intelligent offline fallback mode.`;
      }
      Toast.warning(
        "Backend Offline",
        "Could not reach server at that address. Demo live stream is active.",
      );
    }

    if (btn) btn.classList.remove("disabled");
  },

  saveSettings() {
    const url = document.getElementById("settingApiUrl").value.trim();
    const critical = parseFloat(
      document.getElementById("threshCritical").value,
    );
    const high = parseFloat(document.getElementById("threshHigh").value);
    const medium = parseFloat(
      document.getElementById("threshMed")?.value || 0.4,
    );

    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.API_URL, url);
    localStorage.setItem(
      APP_CONFIG.STORAGE_KEYS.THRESHOLDS,
      JSON.stringify({
        critical,
        high,
        medium,
        low: 0.2,
        minExpectedLossFlag: 10000,
      }),
    );

    APP_CONFIG.API_BASE_URL = url;
    Toast.success(
      "Settings Saved",
      "Risk thresholds and connection configurations updated.",
    );
  },

  attachEventListeners() {
    // Sliders
    ["threshCritical", "threshHigh", "threshMed"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("input", () => this.updateThresholdDisplay());
      }
    });

    // Test API Button
    const testBtn = document.getElementById("testApiBtn");
    if (testBtn) {
      testBtn.addEventListener("click", () => this.testConnection());
    }

    // Save Settings Button
    const saveBtn = document.getElementById("saveSettingsBtn");
    if (saveBtn) {
      saveBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.saveSettings();
      });
    }
  },
};

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("settingApiUrl")) {
    SettingsController.init();
  }
});
