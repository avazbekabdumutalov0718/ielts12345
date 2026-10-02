(() => {
  'use strict';
  const button = document.getElementById('pwaInstall');
  let promptEvent = null;
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  function syncButton() {
    if (!button) return;
    button.hidden = standalone() || !promptEvent;
  }
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    promptEvent = event;
    syncButton();
  });
  window.addEventListener('appinstalled', () => {
    promptEvent = null;
    syncButton();
  });
  button?.addEventListener('click', async () => {
    if (!promptEvent) return;
    button.disabled = true;
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
      promptEvent = null;
    } finally {
      button.disabled = false;
      syncButton();
    }
  });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js').catch(() => {}));
  }
  syncButton();
})();
