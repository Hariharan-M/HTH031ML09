/**
 * React Bits - LineSidebar Vanilla JavaScript Controller
 * High-performance rAF-based proximity physics for sidebar navigation.
 */

(function () {
  'use strict';

  const FALLOFF_CURVES = {
    linear: (p) => p,
    smooth: (p) => p * p * (3 - 2 * p),
    sharp: (p) => p * p * p
  };

  class LineSidebar {
    constructor(element, options = {}) {
      this.element = element;
      this.list = element.querySelector('.line-sidebar__list') || element;
      this.items = Array.from(this.list.querySelectorAll('.line-sidebar__item'));

      // Config options
      this.proximityRadius = options.proximityRadius ?? 100;
      this.falloff = options.falloff ?? 'smooth';
      this.smoothing = options.smoothing ?? 100;
      this.maxShift = options.maxShift ?? 16;

      // Physics State
      this.targets = new Array(this.items.length).fill(0);
      this.current = new Array(this.items.length).fill(0);
      this.rafId = null;
      this.lastTime = performance.now();
      this.activeIndex = null;

      this.init();
    }

    init() {
      // Determine active item from aria-current or URL
      const currentPath = window.location.pathname.split('/').pop() || 'index.html';
      
      this.items.forEach((item, index) => {
        const link = item.querySelector('a');
        if (item.getAttribute('aria-current') === 'true') {
          this.activeIndex = index;
        } else if (link) {
          const href = link.getAttribute('href');
          if (href && (href === currentPath || (currentPath === '' && href === 'index.html') || href.startsWith(currentPath.split('?')[0]))) {
            if (this.activeIndex === null) {
              item.setAttribute('aria-current', 'true');
              this.activeIndex = index;
            }
          }
        }
      });

      // Bind event handlers
      this.handlePointerMove = this.onPointerMove.bind(this);
      this.handlePointerLeave = this.onPointerLeave.bind(this);
      this.runFrame = this.frame.bind(this);

      this.list.addEventListener('pointermove', this.handlePointerMove);
      this.list.addEventListener('pointerleave', this.handlePointerLeave);

      // Start initial loop to ease active item into position
      this.startLoop();
    }

    startLoop() {
      if (this.rafId != null) {
        cancelAnimationFrame(this.rafId);
      }
      this.lastTime = performance.now();
      this.rafId = requestAnimationFrame(this.runFrame);
    }

    frame(now) {
      const dt = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;
      const tau = Math.max(this.smoothing, 1) / 1000;
      const k = 1 - Math.exp(-dt / tau);

      let moving = false;
      for (let i = 0; i < this.items.length; i++) {
        const el = this.items[i];
        if (!el) continue;

        const target = Math.max(this.targets[i] || 0, this.activeIndex === i ? 1 : 0);
        const cur = this.current[i] || 0;
        const next = cur + (target - cur) * k;
        const settled = Math.abs(target - next) < 0.0015;
        const value = settled ? target : next;

        this.current[i] = value;
        el.style.setProperty('--effect', value.toFixed(4));

        if (!settled) {
          moving = true;
        }
      }

      this.rafId = moving ? requestAnimationFrame(this.runFrame) : null;
    }

    onPointerMove(e) {
      if (!this.list) return;
      const rect = this.list.getBoundingClientRect();
      const pointerY = e.clientY - rect.top;
      const ease = FALLOFF_CURVES[this.falloff] || FALLOFF_CURVES.smooth;

      for (let i = 0; i < this.items.length; i++) {
        const el = this.items[i];
        if (!el) continue;
        const center = el.offsetTop + el.offsetHeight / 2;
        const distance = Math.abs(pointerY - center);
        this.targets[i] = ease(Math.max(0, 1 - distance / this.proximityRadius));
      }

      this.startLoop();
    }

    onPointerLeave() {
      this.targets = this.targets.map(() => 0);
      this.startLoop();
    }

    setActive(index) {
      this.items.forEach((item, i) => {
        if (i === index) {
          item.setAttribute('aria-current', 'true');
        } else {
          item.removeAttribute('aria-current');
        }
      });
      this.activeIndex = index;
      this.startLoop();
    }

    destroy() {
      if (this.rafId != null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      this.list.removeEventListener('pointermove', this.handlePointerMove);
      this.list.removeEventListener('pointerleave', this.handlePointerLeave);
    }
  }

  // Auto-initialize LineSidebar instances
  document.addEventListener('DOMContentLoaded', () => {
    const sidebars = document.querySelectorAll('.line-sidebar');
    sidebars.forEach((el) => {
      new LineSidebar(el, {
        proximityRadius: 100,
        falloff: 'smooth',
        smoothing: 100,
        maxShift: 16
      });
    });
  });

  window.LineSidebar = LineSidebar;
})();
