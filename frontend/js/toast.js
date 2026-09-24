/**
 * Toast Notification System - Minimalist Dark Architecture
 * Aegis Risk Intelligence
 */
const Toast = {
  container: null,

  init() {
    if (!this.container) {
      let el = document.getElementById('toast-container');
      if (!el) {
        el = document.createElement('div');
        el.id = 'toast-container';
        el.className = 'toast-container-custom';
        document.body.appendChild(el);
      }
      this.container = el;
    }
  },

  show({ title = 'Notification', message = '', type = 'info', duration = 4000 }) {
    this.init();

    const toast = document.createElement('div');
    toast.className = `toast-custom toast-${type}`;

    let iconClass = 'bi-info-circle-fill text-accent';
    if (type === 'success') iconClass = 'bi-check-circle-fill text-success';
    if (type === 'danger') iconClass = 'bi-exclamation-triangle-fill text-danger';
    if (type === 'warning') iconClass = 'bi-exclamation-circle-fill text-warning';

    toast.innerHTML = `
      <i class="bi ${iconClass}" style="font-size: 1.1rem; flex-shrink: 0;"></i>
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 600; font-size: 0.75rem; color: var(--text-primary);">${title}</div>
        <div style="font-size: 0.6875rem; color: var(--text-secondary); margin-top: 1px;">${message}</div>
      </div>
      <button type="button" class="toast-close-btn" style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 2px 4px; font-size: 0.75rem;" aria-label="Close">
        <i class="bi bi-x-lg"></i>
      </button>
    `;

    // Close button event
    const closeBtn = toast.querySelector('.toast-close-btn');
    closeBtn.addEventListener('click', () => {
      this.dismiss(toast);
    });

    this.container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(toast);
      }, duration);
    }
  },

  dismiss(toast) {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.2s ease';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 200);
  },

  success(title, message) {
    this.show({ title, message, type: 'success' });
  },

  danger(title, message) {
    this.show({ title, message, type: 'danger' });
  },

  warning(title, message) {
    this.show({ title, message, type: 'warning' });
  },

  info(title, message) {
    this.show({ title, message, type: 'info' });
  }
};
