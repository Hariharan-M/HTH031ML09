const ThemeManager = {
  storageKey:
    window.APP_CONFIG && window.APP_CONFIG.STORAGE_KEYS
      ? window.APP_CONFIG.STORAGE_KEYS.THEME
      : "fraud_triage_theme",

  getTheme() {
    const savedTheme = localStorage.getItem(this.storageKey);
    return savedTheme === "light" || savedTheme === "dark"
      ? savedTheme
      : "dark";
  },

  apply(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    this.updateToggle(theme);
  },

  updateToggle(theme) {
    const toggle = document.getElementById("themeToggle");
    if (!toggle) return;

    const lightMode = theme === "light";
    toggle.setAttribute("aria-pressed", String(lightMode));
    toggle.setAttribute(
      "aria-label",
      lightMode ? "Switch to dark mode" : "Switch to light mode",
    );
    toggle.setAttribute(
      "title",
      lightMode ? "Switch to dark mode" : "Switch to light mode",
    );
    toggle.innerHTML = lightMode
      ? '<i class="bi bi-moon-stars" aria-hidden="true"></i><span>Dark mode</span>'
      : '<i class="bi bi-sun" aria-hidden="true"></i><span>Light mode</span>';
  },

  init() {
    const theme = this.getTheme();
    this.apply(theme);

    const toggle = document.getElementById("themeToggle");
    if (toggle) {
      toggle.addEventListener("click", () => {
        const nextTheme = this.getTheme() === "dark" ? "light" : "dark";
        localStorage.setItem(this.storageKey, nextTheme);
        this.apply(nextTheme);
        window.location.reload();
      });
    }
  },
};

document.addEventListener("DOMContentLoaded", () => {
  ThemeManager.init();
});
