/**
 * Theme Enforcer - Single Dark Theme Architecture
 * Enforces the dark theme across all views with no light mode or toggling.
 */
const ThemeManager = {
  init() {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
});
