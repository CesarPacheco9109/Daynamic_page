(function () {
  var form = document.getElementById('quote-form');
  if (!form) return;

  var statusEl = form.querySelector('.quote-form-status');
  var submitBtn = form.querySelector('.quote-submit-button');

  var GOOGLE_FORM_ACTION =
    'https://docs.google.com/forms/d/e/1FAIpQLSfbohu3Os0cJg2Ak8BN3WEZYPhd_psg2Htioec89DOtkMZx6w/formResponse';

  // Toggle "Other, please specify" text inputs for choice fields
  form.querySelectorAll('[data-other-toggle]').forEach(function (control) {
    var wrap = control.closest('.quote-field');
    var otherInput = wrap.querySelector('[data-other-input]');
    if (!otherInput) return;
    var check = function () {
      var isOther = control.value === '__other_option__';
      otherInput.hidden = !isOther;
      if (!isOther) otherInput.value = '';
    };
    control.addEventListener('change', check);
    check();
  });

  function clearErrors() {
    form.querySelectorAll('.quote-field.has-error').forEach(function (f) {
      f.classList.remove('has-error');
    });
  }

  function validate() {
    clearErrors();
    var valid = true;
    var firstInvalid = null;
    form.querySelectorAll('[data-required]').forEach(function (field) {
      var wrap = field.closest('.quote-field');
      var filled;
      if (field.type === 'radio') {
        filled = !!form.querySelector('[name="' + field.name + '"]:checked');
      } else {
        filled = !!(field.value || '').trim();
      }
      if (!filled) {
        wrap.classList.add('has-error');
        valid = false;
        if (!firstInvalid) firstInvalid = wrap;
      }
    });
    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return valid;
  }

  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = 'quote-form-status is-visible' + (type ? ' is-' + type : '');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) {
      setStatus('Please fill in all required fields.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    setStatus('', '');

    // The connected Google Form has two duplicate "Phone number" questions;
    // mirror the single visible phone field into the hidden duplicate entry.
    var phoneField = form.querySelector('[name="entry.968009634"]');
    var phoneMirror = form.querySelector('[name="entry.1144709086"]');
    if (phoneField && phoneMirror) phoneMirror.value = phoneField.value;

    var data = new FormData(form);

    fetch(GOOGLE_FORM_ACTION, {
      method: 'POST',
      mode: 'no-cors',
      body: data,
    })
      .then(function () {
        setStatus('Thank you! We’ve received your request and will be in touch shortly.', 'success');
        form.reset();
        form.querySelectorAll('[data-other-input]').forEach(function (i) {
          i.hidden = true;
        });
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
      })
      .catch(function () {
        setStatus('Something went wrong. Please call us at +61 450 126 979 or try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
      });
  });
})();
