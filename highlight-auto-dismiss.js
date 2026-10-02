// Dismiss the text-selection toolbar without changing highlighted text.
(() => {
  const popup = document.getElementById('highlightPopup');
  if (!popup) return;

  const dismiss = () => popup.classList.remove('visible');

  document.addEventListener('pointerdown', (event) => {
    if (!popup.contains(event.target)) dismiss();
  }, true);

  document.documentElement.addEventListener('mouseleave', (event) => {
    if (!event.relatedTarget) dismiss();
  });

  window.addEventListener('blur', dismiss);
})();
