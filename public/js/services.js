(function () {
  document.querySelectorAll('.price-cell').forEach(function (cell) {
    const display = cell.querySelector('.price-display');
    const editBtn = cell.querySelector('.price-edit-btn');
    const form = cell.querySelector('.price-edit-form');
    const cancelBtn = cell.querySelector('.price-cancel-btn');
    const input = cell.querySelector('.price-input');
    if (!display || !form || !input) return;

    function openEdit() {
      display.classList.add('d-none');
      editBtn.classList.add('d-none');
      form.classList.remove('d-none');
      input.focus();
      input.select();
    }

    function closeEdit() {
      form.classList.add('d-none');
      display.classList.remove('d-none');
      editBtn.classList.remove('d-none');
    }

    editBtn.addEventListener('click', openEdit);
    cancelBtn.addEventListener('click', closeEdit);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeEdit();
    });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const price = parseFloat(input.value);
      if (Number.isNaN(price) || price < 0) {
        alert('Informe um preco valido.');
        return;
      }
      const id = form.dataset.id;
      try {
        const res = await fetch(`/admin/services/${id}/price`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ price }),
        });
        if (!res.ok) throw new Error('request failed');
        const data = await res.json();
        display.textContent = 'R$ ' + data.price.toFixed(2).replace('.', ',');
        input.value = data.price;
        closeEdit();
      } catch (err) {
        alert('Nao foi possivel atualizar o preco. Tente novamente.');
      }
    });
  });
})();
