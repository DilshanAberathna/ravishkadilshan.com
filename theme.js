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

  applyTheme(preference);
  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.querySelector('.theme-toggle');
    applyTheme(root.dataset.theme);
    toggle?.addEventListener('click', () => {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem(preferenceKey, next); } catch {}
    });
  });

  window.addEventListener('storage', event => {
    if (event.key === preferenceKey || event.key === null) {
      applyTheme(event.newValue === 'dark' ? 'dark' : 'light');
    }
  });
})();
