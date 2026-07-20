(function () {
  const bulkForm = document.getElementById('bulkCompleteForm');
  if (!bulkForm) return;

  const selectAll = document.getElementById('selectAll');
  const bulkCount = document.getElementById('bulkCount');

  function rowCheckboxes() {
    return Array.from(document.querySelectorAll('.row-select'));
  }

  function updateBar() {
    const checked = rowCheckboxes().filter((c) => c.checked);
    bulkForm.classList.toggle('d-none', checked.length === 0);
    bulkCount.textContent = checked.length;
  }

  document.addEventListener('change', function (e) {
    if (e.target.classList && e.target.classList.contains('row-select')) {
      updateBar();
    }
  });

  if (selectAll) {
    selectAll.addEventListener('change', function () {
      rowCheckboxes().forEach((c) => {
        if (!c.disabled) c.checked = selectAll.checked;
      });
      updateBar();
    });
  }

  bulkForm.addEventListener('submit', function (e) {
    const checked = rowCheckboxes().filter((c) => c.checked);
    if (checked.length === 0) {
      e.preventDefault();
      return;
    }
    if (!window.confirm(`Finalizar ${checked.length} atendimento(s) selecionado(s)? Isso marca como pago e conta a visita do cliente.`)) {
      e.preventDefault();
      return;
    }
    bulkForm.querySelectorAll('input[name="ids"]').forEach((el) => el.remove());
    checked.forEach((c) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'ids';
      input.value = c.value;
      bulkForm.appendChild(input);
    });
  });
})();
