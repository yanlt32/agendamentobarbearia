(function () {
  // Navbar background on scroll
  const navbar = document.getElementById('siteNavbar');
  if (navbar) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 40) navbar.classList.add('scrolled');
      else navbar.classList.remove('scrolled');
    });
  }

  // Auto-dismiss toasts
  document.querySelectorAll('.toast-msg').forEach(function (el) {
    setTimeout(function () { el.remove(); }, 4500);
  });

  // Phone mask helper (used by any input.phone-mask)
  function maskPhone(value) {
    let v = value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 6) v = v.replace(/(\d{2})(\d{4,5})(\d{0,4})/, '($1) $2-$3');
    else if (v.length > 2) v = v.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    else if (v.length > 0) v = v.replace(/(\d{0,2})/, '($1');
    return v.trim();
  }
  document.querySelectorAll('input[name="phone"], .phone-mask').forEach(function (input) {
    input.addEventListener('input', function () {
      input.value = maskPhone(input.value);
    });
  });

  window.maskPhone = maskPhone;
})();
