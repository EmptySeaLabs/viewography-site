// Beta request form on /beta/. The site's Worker (/api/beta) checks Cloudflare Turnstile and saves the request
// on Cloudflare (one per email). For a new request this page then emails a copy to support@viewography.app
// through FormSubmit, which turns away requests sent from Cloudflare's servers.
const betaForm = document.querySelector('#beta-form');
const betaStatus = document.querySelector('#beta-status');

function emailCopy(preview) {
  // A plain form post, as the form sent before Nov 14 (no CORS preflight).
  const email = betaForm.elements.email.value.trim();
  const data = new FormData();
  data.set('name', betaForm.elements.name.value.trim());
  data.set('email', email);
  data.set('Email for TestFlight', email);
  data.set('iPhone model', betaForm.elements.model.value.trim());
  data.set('Saved', 'Cloudflare D1 (viewography-site, beta_requests)');
  data.set('_subject', (preview ? '[Preview test] ' : '') + 'Viewography beta access request');
  data.set('_url', location.href);
  data.set('_template', 'table');
  return fetch('https://formsubmit.co/ajax/support@viewography.app', { method: 'POST', body: data, headers: { Accept: 'application/json' } });
}

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
    // Saved. For a new request, email the copy to support@ from this page (as the form did before Nov 14).
    // The request is already saved, so a failed email never shows the visitor an error.
    if (result.notify) await emailCopy(result.preview).catch(() => {});
    betaStatus.textContent = 'Request sent. Thank you for helping make Viewography better! We’ll email your TestFlight invitation.';
    betaForm.reset();
  } catch (error) {
    betaStatus.textContent = error.message === 'check'
      ? 'We couldn’t confirm you’re a person. If you see “Verify you are human” above, tick it and send again, or email support@viewography.app.'
      : 'Your request could not be sent. Please try again or email support@viewography.app. Your details are still in the form.';
  } finally {
    if (window.turnstile) window.turnstile.reset();
    submit.disabled = false;
    submit.textContent = label;
  }
});
