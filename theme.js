(() => {
  const preferenceKey = 'rd-portfolio-theme';
  const root = document.documentElement;
  let preference = 'light';
  try {
    preference = localStorage.getItem(preferenceKey) === 'dark' ? 'dark' : 'light';
  } catch {
    // The toggle still works for this page when storage is unavailable.
  }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    const toggle = document.querySelector('.theme-toggle');
    if (!toggle) return;
    toggle.setAttribute('aria-pressed', String(theme === 'dark'));
    toggle.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
    toggle.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  }

  let themeTransition;
  applyTheme(preference);
  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.querySelector('.theme-toggle');
    applyTheme(root.dataset.theme);
    toggle?.addEventListener('click', event => {
      preference = preference === 'dark' ? 'light' : 'dark';
      const update = () => {
        applyTheme(preference);
        try { localStorage.setItem(preferenceKey, preference); } catch {}
      };
      themeTransition?.skipTransition();
      if (root.dataset.motion === 'on' && document.startViewTransition
          && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const bounds = toggle.getBoundingClientRect();
        const x = event.detail ? event.clientX : bounds.left + bounds.width / 2;
        const y = event.detail ? event.clientY : bounds.top + bounds.height / 2;
        const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        root.style.setProperty('--theme-origin', `${x}px ${y}px`);
        root.style.setProperty('--theme-radius', `${radius}px`);
        const transition = document.startViewTransition(update);
        themeTransition = transition;
        transition.finished.then(clearTransition, clearTransition);

        function clearTransition() {
          if (themeTransition !== transition) return;
          themeTransition = undefined;
          root.style.removeProperty('--theme-origin');
          root.style.removeProperty('--theme-radius');
        }
      } else {
        update();
      }
    });
  });

  window.addEventListener('storage', event => {
    if (event.key === preferenceKey || event.key === null) {
      preference = event.newValue === 'dark' ? 'dark' : 'light';
      applyTheme(preference);
    }
  });
})();
