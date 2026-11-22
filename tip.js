// Tip jar: the Stripe Payment Link lives here and nowhere else. Every element marked data-tip-jar ships hidden
// and appears only once TIP_URL is a real Stripe link, so a placeholder can never go live. Without JavaScript it stays hidden.
(() => {
  const TIP_URL = 'https://buy.stripe.com/cNiaEZevT7lt27FenM4sE02';
  if (!/^https:\/\/buy\.stripe\.com\/[A-Za-z0-9]+$/.test(TIP_URL)) return;
  document.querySelectorAll('[data-tip-jar]').forEach((block) => {
    const links = block.matches('a') ? [block] : [...block.querySelectorAll('a[data-tip-link]')];
    links.forEach((link) => { link.href = TIP_URL; link.target = '_blank'; link.rel = 'noopener'; });
    block.hidden = false;
  });
})();
