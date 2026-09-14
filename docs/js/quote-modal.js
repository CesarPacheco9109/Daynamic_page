(function () {
  var modal = document.getElementById('quote-modal');
  if (!modal) return;

  var iframe = modal.querySelector('iframe');
  var iframeSrc = iframe ? iframe.getAttribute('data-src') : null;
  var loaded = false;

  function openModal(e) {
    if (e) e.preventDefault();
    if (!loaded && iframe && iframeSrc) {
      iframe.setAttribute('src', iframeSrc);
      loaded = true;
    }
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('quote-modal-open');
  }

  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('quote-modal-open');
  }

  document.querySelectorAll('[data-quote-open]').forEach(function (el) {
    el.addEventListener('click', openModal);
  });

  modal.querySelectorAll('[data-quote-close]').forEach(function (el) {
    el.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });
})();
