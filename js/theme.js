// Apstore Dark & Light Mode Theme Controller

(function () {
  // Enforce trailing slash on directory paths to fix relative path resolution on GitHub Pages
  const path = window.location.pathname;
  if (path !== '/' && path !== '') {
    const lastSegment = path.substring(path.lastIndexOf('/') + 1);
    if (lastSegment && !lastSegment.includes('.') && !path.endsWith('/')) {
      window.location.replace(window.location.protocol + '//' + window.location.host + path + '/' + window.location.search + window.location.hash);
      return;
    }
  }

  // Retrieve saved theme preference, defaulting to 'dark'
  const savedTheme = localStorage.getItem('apstore-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Executed on DOM content load
  document.addEventListener('DOMContentLoaded', () => {
    initThemeSwitcher();
  });

  window.initThemeSwitcher = function() {
    const toggleBtns = document.querySelectorAll('#btn-theme-toggle');
    if (toggleBtns.length === 0) return;

    // Synchronize icon matching current theme state
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    updateToggleIcons(currentTheme);

    toggleBtns.forEach(btn => {
      // Clone and replace to prevent duplicate listeners on hot reloading or multiple calls
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);

      newBtn.addEventListener('click', () => {
        const activeTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        
        // Save and apply theme
        document.documentElement.setAttribute('data-theme', activeTheme);
        localStorage.setItem('apstore-theme', activeTheme);
        
        updateToggleIcons(activeTheme);
        
        // Custom event for downstream integrations if needed
        window.dispatchEvent(new CustomEvent('apstore-theme-change', { detail: activeTheme }));
      });
    });
  };

  function updateToggleIcons(theme) {
    const toggleBtns = document.querySelectorAll('#btn-theme-toggle');
    toggleBtns.forEach(btn => {
      if (theme === 'light') {
        btn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        btn.setAttribute('title', 'Switch to Dark Mode');
      } else {
        btn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        btn.setAttribute('title', 'Switch to Light Mode');
      }
    });
  }
})();
