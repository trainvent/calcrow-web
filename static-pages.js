(() => {
  const footer = document.querySelector('[data-calcrow-footer]');
  if (!footer) return;

  const isGerman = document.documentElement.lang.toLowerCase().startsWith('de');
  const copy = isGerman
    ? {
        navigationLabel: 'Fußzeilennavigation',
        links: [
          ['privacy-policy', 'Datenschutzrichtlinie'],
          ['terms-of-use', 'Bedingungen'],
          ['privacy-policy-ads', 'Werbedatenschutz'],
          ['support', 'Support'],
          ['delete-account', 'Konto löschen'],
        ],
        attribution: 'Calcrow wird bereitgestellt von ',
      }
    : {
        navigationLabel: 'Footer navigation',
        links: [
          ['privacy-policy', 'Privacy Policy'],
          ['terms-of-use', 'Terms'],
          ['privacy-policy-ads', 'Ads Privacy'],
          ['support', 'Support'],
          ['delete-account', 'Delete Account'],
        ],
        attribution: 'Calcrow is delivered by ',
      };

  const stylesheet = document.querySelector('link[href$="static-pages.css"]');
  const siteRoot = new URL('.', stylesheet?.href || window.location.href);
  const localizedRoot = new URL(isGerman ? 'de/' : '', siteRoot);

  const navigation = document.createElement('nav');
  navigation.className = 'footer-links';
  navigation.setAttribute('aria-label', copy.navigationLabel);

  for (const [path, label] of copy.links) {
    const link = document.createElement('a');
    link.href = new URL(`${path}/index.html`, localizedRoot).href;
    link.textContent = label;
    navigation.append(link);
  }

  const attribution = document.createElement('p');
  attribution.className = 'footer-attribution';
  attribution.append(document.createTextNode(copy.attribution));

  const trainventLink = document.createElement('a');
  trainventLink.href = 'https://next.trainvent.com/';
  trainventLink.rel = 'noopener noreferrer';
  trainventLink.textContent = 'Trainvent';
  attribution.append(trainventLink);

  footer.classList.add('site-footer');
  footer.replaceChildren(navigation, attribution);
})();
