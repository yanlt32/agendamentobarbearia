(function () {
  // Sidebar toggle (mobile)
  const sidebar = document.getElementById('adminSidebar');
  const btnToggle = document.getElementById('btnToggleSidebar');
  if (btnToggle) {
    btnToggle.addEventListener('click', function () {
      sidebar.classList.toggle('show');
    });
  }

  // Theme toggle (dark/light), persisted client-side
  const btnTheme = document.getElementById('btnThemeToggle');
  const html = document.documentElement;
  const savedTheme = localStorage.getItem('admin-theme');
  if (savedTheme) html.setAttribute('data-bs-theme', savedTheme);
  if (btnTheme) {
    btnTheme.addEventListener('click', function () {
      const next = html.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-bs-theme', next);
      localStorage.setItem('admin-theme', next);
    });
  }

  // Auto-dismiss toasts
  document.querySelectorAll('.toast-msg').forEach(function (el) {
    setTimeout(function () { el.remove(); }, 4500);
  });

  // Phone mask
  function maskPhone(value) {
    let v = value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 6) v = v.replace(/(\d{2})(\d{4,5})(\d{0,4})/, '($1) $2-$3');
    else if (v.length > 2) v = v.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    else if (v.length > 0) v = v.replace(/(\d{0,2})/, '($1');
    return v.trim();
  }
  document.querySelectorAll('input[name="phone"], .phone-mask').forEach(function (input) {
    input.addEventListener('input', function () { input.value = maskPhone(input.value); });
  });

  // Dropdowns inside .table-responsive get visually clipped by the
  // container's scroll box. Forcing Popper's "fixed" positioning strategy
  // renders the menu relative to the viewport instead, escaping the clip.
  if (window.bootstrap) {
    document.querySelectorAll('[data-bs-toggle="dropdown"]').forEach(function (el) {
      new bootstrap.Dropdown(el, {
        popperConfig: function (defaultConfig) {
          return Object.assign({}, defaultConfig, { strategy: 'fixed' });
        },
      });
    });
  }

  // Confirm modal for destructive forms
  const confirmModalEl = document.getElementById('confirmModal');
  let pendingForm = null;
  if (confirmModalEl && window.bootstrap) {
    const confirmModal = new bootstrap.Modal(confirmModalEl);
    const confirmBtn = document.getElementById('confirmModalBtn');
    const confirmText = document.getElementById('confirmModalText');

    document.querySelectorAll('.confirm-form').forEach(function (formEl) {
      formEl.addEventListener('submit', function (e) {
        if (formEl.dataset.confirmed === 'true') return;
        e.preventDefault();
        pendingForm = formEl;
        confirmText.textContent = formEl.dataset.confirm || 'Tem certeza que deseja realizar esta acao?';
        confirmModal.show();
      });
    });

    confirmBtn.addEventListener('click', function () {
      if (pendingForm) {
        pendingForm.dataset.confirmed = 'true';
        pendingForm.submit();
      }
      confirmModal.hide();
    });
  }
})();
