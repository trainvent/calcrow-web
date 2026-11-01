(() => {
  const german = (navigator.language || '').toLowerCase().startsWith('de');
  document.documentElement.lang = german ? 'de' : 'en';
  if (german) {
    document.querySelector('meta[name="description"]').content =
      'Tabellendateien mit Calcrow öffnen, bearbeiten, ansehen und exportieren.';
    document.getElementById('app-manifest').href = 'manifest-de.json';
  }

  const url = new URL(window.location.href);
  const wantsApp = url.searchParams.get('app') === '1' ||
    url.hash === '#/app' || /^\/app\/?$/.test(url.pathname);
  // Runs in <head>, before either surface can paint.
  document.documentElement.className = wantsApp ? 'app-mode' : 'marketing-mode';
  if (!wantsApp) return;

  window.addEventListener('flutter-first-frame', () => {
    document.getElementById('app-loading')?.remove();
  }, {once: true});
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.marketing-only').forEach(element => element.remove());
    const retry = document.getElementById('app-retry');
    retry.addEventListener('click', () => window.location.reload());
    for (const source of ['google_drive_picker.js', 'flutter_bootstrap.js']) {
      const script = document.createElement('script');
      script.src = source;
      script.async = false;
      if (source === 'flutter_bootstrap.js') {
        script.addEventListener('error', () => {
          document.getElementById('app-loading-message').textContent = german
            ? 'Calcrow konnte nicht geladen werden. Bitte prüfe deine Verbindung und versuche es erneut.'
            : 'Calcrow could not load. Check your connection and try again.';
          retry.hidden = false;
        });
      }
      document.body.append(script);
    }
  }, {once: true});
})();
