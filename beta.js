// Beta request form on /beta/. The site's Worker (/api/beta) checks Cloudflare Turnstile, saves the request
// on Cloudflare (one per email) and emails a copy to support@viewography.app.
const betaForm = document.querySelector('#beta-form');
const betaStatus = document.querySelector('#beta-status');

betaForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!betaForm.reportValidity()) return;
  const submit = betaForm.querySelector('[type="submit"]');
  const label = submit.textContent;
  submit.disabled = true;
  submit.textContent = 'Sending…';
  betaStatus.textContent = '';
  try {
    const response = await fetch('/api/beta', { method: 'POST', body: new FormData(betaForm), headers: { Accept: 'application/json' } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true) throw new Error(result.error || 'Submission failed');
    betaStatus.textContent = 'Request sent. Thank you for helping make Viewography better! We’ll email your TestFlight invitation.';
    betaForm.reset();
  } catch (error) {
    betaStatus.textContent = error.message === 'check'
      ? 'We couldn’t confirm you’re a person. Please wait a moment and try again, or email support@viewography.app.'
      : 'Your request could not be sent. Please try again or email support@viewography.app. Your details are still in the form.';
  } finally {
    if (window.turnstile) window.turnstile.reset();
    submit.disabled = false;
    submit.textContent = label;
  }
});
