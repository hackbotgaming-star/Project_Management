// ProjectHub Global Theme Manager (Dark & Light Mode)
(function() {
  const THEME_KEY = 'projecthub_theme';

  function getStoredTheme() {
    return localStorage.getItem(THEME_KEY) || 'dark';
  }

  function applyTheme(theme) {
    const html = document.documentElement;
    if (theme === 'light') {
      html.classList.remove('dark');
      html.classList.add('light');
    } else {
      html.classList.remove('light');
      html.classList.add('dark');
    }
    localStorage.setItem(THEME_KEY, theme);

    // Update any theme toggle radio or indicator on page
    const radios = document.querySelectorAll('input[name="themeChoice"]');
    radios.forEach(radio => {
      radio.checked = (radio.value === theme);
    });

    const activeThemeLabel = document.getElementById('currentThemeDisplay');
    if (activeThemeLabel) {
      activeThemeLabel.textContent = theme.charAt(0).toUpperCase() + theme.slice(1) + ' Mode';
    }
  }

  window.setTheme = function(theme) {
    applyTheme(theme);
    if (window.showToast) {
      window.showToast(`Switched to ${theme.toUpperCase()} theme`, 'success', 'Theme Updated');
    }
  };

  // Immediate execution before DOM finishes rendering to prevent flash of wrong theme
  applyTheme(getStoredTheme());

  // Listen when DOM is ready to sync setting controls
  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(getStoredTheme());
  });
})();
