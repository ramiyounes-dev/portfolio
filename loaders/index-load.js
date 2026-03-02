window.addEventListener('DOMContentLoaded', () => {
  // Clean up any lingering overlay if returning via back/forward
  const lingeringOverlay = document.getElementById('power-on-overlay');
  if (lingeringOverlay) {
    lingeringOverlay.remove();
  }

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
