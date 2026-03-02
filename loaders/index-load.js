  function removeOverlays() {
    const overlays = ['power-off-overlay']; //, 'power-on-overlay'];
    overlays.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  // Handles bfcache return (back/forward)
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      // Page was loaded from bfcache (back navigation)
      removeOverlays();
    }
  });

  // Also handle normal load, just in case
  window.addEventListener('load', () => {
    removeOverlays();
  });


window.addEventListener('DOMContentLoaded', () => {
  // Same logic as your previous turnon.js
  const overlay = document.createElement('div');
  overlay.id = 'power-on-overlay';
  document.body.appendChild(overlay);

  overlay.addEventListener('animationend', () => {
    overlay.remove();
  });

  document.querySelectorAll('[data-theme]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();

      const theme = el.dataset.theme;
      const paths = {
        'EXPRESSIVE': './pages/index.html',
        'MINIMAL': './minimal/index.html'
      };

      const onOverlay = document.createElement('div');
      onOverlay.id = 'power-off-overlay';
      document.body.appendChild(onOverlay);

      onOverlay.addEventListener('animationend', () => {
        window.location.href = paths[theme];
      });
    });
  });
});
