(function () {
  var form = document.getElementById('quote-form');
  if (!form) return;

  var GOOGLE_FORM_ACTION =
    'https://docs.google.com/forms/d/e/1FAIpQLSfbohu3Os0cJg2Ak8BN3WEZYPhd_psg2Htioec89DOtkMZx6w/formResponse';

  // Same Mailchimp audience as the site-wide newsletter form (JSONP endpoint)
  var MAILCHIMP_JSONP =
    'https://daynamic.us8.list-manage.com/subscribe/post-json?u=bad5db0b7ec71651cc7e83bd5&id=5be5b89518&f_id=00c902e0f0';

  // Google Form question IDs. Answers to choice questions must match the
  // Google Form options exactly, otherwise they go in "<id>.other_option_response".
  var ENTRY = {
    size: 'entry.321025305',
    contractor: 'entry.2068040619',
    satisfaction: 'entry.1794910299',
    frequency: 'entry.1410455332',
    time: 'entry.830103564',
    details: 'entry.1626353113', // "Organisation" paragraph question
    postcode: 'entry.1100649475',
    firstName: 'entry.1578862867',
    lastName: 'entry.1087260842',
    phone: 'entry.968009634',
    phoneDuplicate: 'entry.1144709086',
  };

  var SERVICE_PRESETS = {
    office: 'Office & Commercial Cleaning',
    strata: 'Strata & Owner Corporation Cleaning',
    hotel: 'Hotel & Serviced Apartment Cleaning',
    other: 'Other',
  };

  var steps = form.querySelectorAll('.quote-step');
  var indicators = document.querySelectorAll('[data-step-indicator]');
  var statusEl = form.querySelector('.quote-form-status');
  var submitBtn = form.querySelector('button[type="submit"]');
  var successEl = document.querySelector('.quote-success');
  var current = 1;

  function value(name) {
    var field = form.elements[name];
    if (!field) return '';
    if (field.type === 'checkbox') return field.checked ? field.value : '';
    return (field.value || '').trim();
  }

  function isHidden(el) {
    return !!el.closest('[hidden]');
  }

  // ---------- Conditional fields ----------
  function updateConditionals() {
    form.querySelectorAll('[data-show-if]').forEach(function (el) {
      var rule = el.getAttribute('data-show-if');
      var negate = rule.indexOf('!=') !== -1;
      var parts = rule.split(negate ? '!=' : '=');
      var matches = value(parts[0]) === parts[1];
      el.hidden = negate ? matches : !matches;
    });
    form.querySelectorAll('[data-other-for]').forEach(function (input) {
      var select = document.getElementById(input.getAttribute('data-other-for'));
      var isOther = select.value === '__other_option__';
      input.hidden = !isOther;
      if (!isOther) input.value = '';
    });
  }
  form.addEventListener('change', updateConditionals);

  // ---------- Validation ----------
  var VALIDATORS = {
    email: function (v) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    },
    'phone-au': function (v) {
      var digits = v.replace(/[^\d+]/g, '').replace(/^\+61/, '0');
      return /^0[2-478]\d{8}$/.test(digits) || /^1[38]00\d{6}$/.test(digits);
    },
    'postcode-au': function (v) {
      return /^\d{4}$/.test(v);
    },
    'future-date': function (v) {
      return !!v && v >= tomorrow();
    },
  };

  function tomorrow() {
    var d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  function validateStep(step) {
    var valid = true;
    var firstInvalid = null;
    step.querySelectorAll('.quote-field.has-error').forEach(function (f) {
      f.classList.remove('has-error');
    });
    step.querySelectorAll('[data-required]').forEach(function (field) {
      if (isHidden(field)) return;
      var wrap = field.closest('.quote-field');
      var ok;
      if (field.type === 'radio') {
        ok = !!form.querySelector('[name="' + field.name + '"]:checked');
      } else if (field.type === 'checkbox') {
        ok = field.checked;
      } else {
        var v = (field.value || '').trim();
        var rule = field.getAttribute('data-validate');
        ok = !!v && (!rule || VALIDATORS[rule](v));
      }
      if (!ok) {
        wrap.classList.add('has-error');
        valid = false;
        if (!firstInvalid) firstInvalid = wrap;
      }
    });
    step.querySelectorAll('[data-other-input], [data-other-for]').forEach(function (input) {
      if (!input.hidden && !input.value.trim()) {
        input.closest('.quote-field').classList.add('has-error');
        valid = false;
        if (!firstInvalid) firstInvalid = input.closest('.quote-field');
      }
    });
    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      var focusable = firstInvalid.querySelector('input, select, textarea');
      if (focusable) focusable.focus({ preventScroll: true });
    }
    return valid;
  }

  // ---------- Steps ----------
  function showStep(n) {
    current = n;
    steps.forEach(function (step) {
      step.hidden = Number(step.getAttribute('data-step')) !== n;
    });
    indicators.forEach(function (li) {
      var i = Number(li.getAttribute('data-step-indicator'));
      li.classList.toggle('is-active', i === n);
      li.classList.toggle('is-done', i < n);
    });
    setStatus('', '');
    form.closest('.quote-page-wrapper').scrollIntoView({ behavior: 'smooth', block: 'start' });
    track('quote_step', { step: n });
  }

  form.querySelectorAll('[data-next]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (validateStep(steps[current - 1])) showStep(current + 1);
    });
  });
  form.querySelectorAll('[data-back]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      showStep(current - 1);
    });
  });

  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = 'quote-form-status' + (message ? ' is-visible' : '') + (type ? ' is-' + type : '');
  }

  // ---------- Analytics (GA4 / GTM if present) ----------
  function track(event, params) {
    window.dataLayer = window.dataLayer || [];
    var payload = { event: event };
    for (var k in params) payload[k] = params[k];
    window.dataLayer.push(payload);
    if (typeof window.gtag === 'function') window.gtag('event', event, params);
  }

  // ---------- Lead source ----------
  function leadSource() {
    var params = new URLSearchParams(window.location.search);
    var parts = [];
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'].forEach(function (k) {
      if (params.get(k)) parts.push(k + '=' + params.get(k));
    });
    if (document.referrer && document.referrer.indexOf(window.location.origin) !== 0) {
      parts.push('referrer=' + document.referrer);
    }
    return parts.join(' | ') || 'direct';
  }

  // ---------- Submission ----------
  function choice(data, entry, answer, otherText) {
    if (answer === '__other_option__') {
      data.append(entry, '__other_option__');
      data.append(entry + '.other_option_response', otherText);
    } else {
      data.append(entry, answer);
    }
  }

  function buildDetails() {
    var lines = [
      'Organisation: ' + (value('organisation') || '-'),
      'Email: ' + value('email'),
      'Service: ' + value('service'),
      'Preferred contact: ' + value('contact_method'),
      'Next step: ' + value('next_step'),
    ];
    if (value('next_step') !== 'Just send me a proposal') {
      lines.push('Preferred date: ' + value('preferred_date') + ' ' + value('preferred_slot'));
    }
    if (value('notes')) lines.push('Notes: ' + value('notes'));
    lines.push('Newsletter opt-in: ' + (value('newsletter') ? 'yes' : 'no'));
    lines.push('Source: ' + value('source'));
    return lines.join('\n');
  }

  function buildGoogleFormData() {
    var data = new FormData();
    var hasContractor = value('contractor') === 'Yes';
    choice(data, ENTRY.size, value('size'), value('size_other'));
    data.append(ENTRY.contractor, value('contractor'));
    // Required in the Google Form even when there is no current contractor
    choice(data, ENTRY.satisfaction, hasContractor ? value('satisfaction') : '__other_option__', 'N/A - no current contractor');
    choice(data, ENTRY.frequency, value('frequency'), value('frequency_other'));
    data.append(ENTRY.time, value('time'));
    // The Google Form has no email/service/booking questions yet, so these
    // travel in the free-text "Organisation" answer.
    data.append(ENTRY.details, buildDetails());
    data.append(ENTRY.postcode, value('postcode'));
    data.append(ENTRY.firstName, value('first_name'));
    data.append(ENTRY.lastName, value('last_name'));
    data.append(ENTRY.phone, value('phone'));
    data.append(ENTRY.phoneDuplicate, value('phone'));
    return data;
  }

  function subscribeNewsletter() {
    var cb = 'dnMailchimp' + Date.now();
    var script = document.createElement('script');
    window[cb] = function () {
      delete window[cb];
      script.remove();
    };
    script.src =
      MAILCHIMP_JSONP +
      '&EMAIL=' + encodeURIComponent(value('email')) +
      '&FNAME=' + encodeURIComponent(value('first_name')) +
      '&LNAME=' + encodeURIComponent(value('last_name')) +
      '&c=' + cb;
    document.body.appendChild(script);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateStep(steps[current - 1])) {
      setStatus('Please check the highlighted fields.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    setStatus('', '');

    // no-cors: the response is opaque, so only network failures are detectable
    fetch(GOOGLE_FORM_ACTION, { method: 'POST', mode: 'no-cors', body: buildGoogleFormData() })
      .then(function () {
        if (value('newsletter')) subscribeNewsletter();
        track('generate_lead', { service: value('service'), next_step: value('next_step') });
        form.hidden = true;
        document.querySelector('.quote-steps').hidden = true;
        successEl.hidden = false;
        successEl.focus();
      })
      .catch(function () {
        setStatus('Something went wrong. Please call us at +61 450 126 979 or try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send request';
      });
  });

  // ---------- Init ----------
  var preset = SERVICE_PRESETS[new URLSearchParams(window.location.search).get('service')];
  if (preset) {
    var radio = form.querySelector('[name="service"][value="' + preset + '"]');
    if (radio) radio.checked = true;
  }
  form.elements.source.value = leadSource();
  document.getElementById('quote-date').min = tomorrow();
  updateConditionals();
})();
