// Beta request form on /beta/. Requests are delivered to support@viewography.app through FormSubmit.
const betaSubmissionEndpoint = 'https://formsubmit.co/ajax/support@viewography.app';
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
  const data = new FormData();
  data.set('name', betaForm.elements.name.value.trim());
  data.set('email', betaForm.elements.email.value.trim());
  data.set('Email for TestFlight', betaForm.elements.email.value.trim());
  data.set('iPhone model', betaForm.elements.model.value.trim());
  data.set('_honey', betaForm.elements._honey.value);
  data.set('_subject', 'Viewography beta access request');
  data.set('_url', location.href);
  data.set('_template', 'table');
  try {
    const response = await fetch(betaSubmissionEndpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
    const result = await response.json();
    if (!response.ok || !(result.success === true || result.success === 'true')) throw new Error('Submission failed');
    betaStatus.textContent = 'Request sent. Thank you for helping make Viewography better! We’ll email your TestFlight invitation.';
    betaForm.reset();
  } catch {
    betaStatus.textContent = 'Your request could not be sent. Please try again or email support@viewography.app. Your details are still in the form.';
  } finally {
    submit.disabled = false;
    submit.textContent = label;
  }
});
