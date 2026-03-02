// turnon.js
window.addEventListener('DOMContentLoaded', () => {
    // Now use power-on on load
    const overlay = document.createElement('div');
    overlay.id = 'power-on-overlay';
    document.body.appendChild(overlay);
  
    overlay.addEventListener('animationend', () => {
      overlay.remove();
    });
  
    // On click, play power-on instead
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
  