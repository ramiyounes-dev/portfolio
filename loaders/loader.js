// loader.js
window.addEventListener('load', () => {
    const loader = document.getElementById('loading-screen');
    if (loader) {
      loader.style.animation = 'fadeOut 1s ease-out forwards';
      setTimeout(() => loader.remove(), 1000);
    }
  });
  