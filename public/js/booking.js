(function () {
  const form = document.getElementById('bookingForm');
  if (!form) return;

  const panes = document.querySelectorAll('.booking-pane');
  const steps = document.querySelectorAll('.booking-steps .step');
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  const btnSubmit = document.getElementById('btnSubmit');

  // Pane order is derived from whichever panes actually exist in the DOM,
  // so the single-barber shop (no "choose barber" pane) skips step 2 automatically.
  const sequence = Array.from(panes).map((p) => Number(p.dataset.pane)).sort((a, b) => a - b);

  const singleBarberId = form.dataset.singleBarberId || '';
  const singleBarberName = form.dataset.singleBarberName || '';

  const state = {
    step: sequence[0],
    serviceId: null, serviceName: '', servicePrice: 0,
    barberId: singleBarberId || null,
    barberName: singleBarberName || '',
    date: '', time: '',
  };

  function showStep(n) {
    state.step = n;
    panes.forEach((p) => p.classList.toggle('d-none', Number(p.dataset.pane) !== n));
    steps.forEach((s) => {
      const v = Number(s.dataset.step);
      s.classList.toggle('active', v === n);
      s.classList.toggle('done', v < n);
    });
    btnPrev.disabled = n === sequence[0];
    const isLast = n === sequence[sequence.length - 1];
    btnNext.classList.toggle('d-none', isLast);
    btnSubmit.classList.toggle('d-none', !isLast);
    if (isLast) buildSummary();

    // Steps vary a lot in height (a long service grid vs. a short "pick a
    // time" list). Without this, the page keeps whatever scroll position it
    // had, which after a shorter step swaps in can land the user near the
    // bottom of the page -- looking like the wizard broke instead of just
    // moved to the next step. Pin the top of the wizard back into view.
    const stepsEl = document.getElementById('bookingSteps');
    if (stepsEl) stepsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function formatDateBR(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  function buildSummary() {
    document.getElementById('summaryText').innerHTML =
      `<strong>${state.serviceName}</strong> com <strong>${state.barberName}</strong><br>` +
      `${formatDateBR(state.date)} as ${state.time} - R$ ${state.servicePrice.toFixed(2).replace('.', ',')}`;
  }

  function canAdvance() {
    switch (state.step) {
      case 1: return !!state.serviceId;
      case 2: return !!state.barberId;
      case 3: return !!state.date;
      case 4: return !!state.time;
      default: return true;
    }
  }

  // STEP 1: service selection
  document.querySelectorAll('[data-select="service"]').forEach((card) => {
    card.addEventListener('click', function () {
      document.querySelectorAll('[data-select="service"]').forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
      state.serviceId = card.dataset.id;
      state.serviceName = card.dataset.name;
      state.servicePrice = parseFloat(card.querySelector('.gold-text').textContent.replace('R$', '').replace(',', '.').trim());
      document.getElementById('service_id').value = state.serviceId;
    });
  });

  async function loadBarbers() {
    const list = document.getElementById('barberList');
    list.innerHTML = '<p class="text-secondary small">Carregando...</p>';
    const res = await fetch(`/api/barbers-by-service/${state.serviceId}`);
    const barbers = await res.json();
    list.innerHTML = '';
    if (barbers.length === 0) {
      list.innerHTML = '<p class="text-secondary small">Nenhum barbeiro disponivel para este servico.</p>';
      return;
    }
    barbers.forEach((b) => {
      const col = document.createElement('div');
      col.className = 'col-md-6';
      col.innerHTML = `<div class="choice-card" data-select="barber" data-id="${b.id}" data-name="${b.name}">
        <strong>${b.name}</strong><br><small class="text-secondary">${b.specialty || 'Barbeiro profissional'}</small>
      </div>`;
      list.appendChild(col);
    });
    list.querySelectorAll('[data-select="barber"]').forEach((card) => {
      card.addEventListener('click', function () {
        list.querySelectorAll('[data-select="barber"]').forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        state.barberId = card.dataset.id;
        state.barberName = card.dataset.name;
        document.getElementById('barber_id').value = state.barberId;
      });
    });
  }

  // STEP 3: inline calendar (kept always open so people don't miss a collapsed date picker)
  const calendarEl = document.getElementById('inlineCalendar');
  if (calendarEl) {
    const dateInput = document.getElementById('date_input');
    const calLabel = document.getElementById('calLabel');
    const calGrid = document.getElementById('calGrid');
    const calPrev = document.getElementById('calPrev');
    const calNext = document.getElementById('calNext');

    const minDate = calendarEl.dataset.min;
    const maxDate = calendarEl.dataset.max;
    const [minYear, minMonth] = minDate.split('-').map(Number);
    const [maxYear, maxMonth] = maxDate.split('-').map(Number);
    let viewYear = minYear;
    let viewMonth = minMonth - 1;

    const monthNames = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    function pad(n) { return String(n).padStart(2, '0'); }
    function toISO(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }

    function renderCalendar() {
      calLabel.textContent = `${monthNames[viewMonth]} ${viewYear}`;
      calGrid.innerHTML = '';

      const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      const todayIso = new Date().toISOString().slice(0, 10);

      for (let i = 0; i < firstWeekday; i++) {
        const empty = document.createElement('div');
        empty.className = 'cal-day empty';
        calGrid.appendChild(empty);
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const iso = toISO(viewYear, viewMonth, d);
        const cell = document.createElement('div');
        cell.className = 'cal-day';
        cell.textContent = d;
        const disabled = iso < minDate || iso > maxDate;
        if (disabled) cell.classList.add('disabled');
        if (iso === todayIso) cell.classList.add('today');
        if (iso === dateInput.value) cell.classList.add('selected');
        if (!disabled) {
          cell.addEventListener('click', function () {
            calGrid.querySelectorAll('.cal-day').forEach((c) => c.classList.remove('selected'));
            cell.classList.add('selected');
            dateInput.value = iso;
            state.date = iso;
          });
        }
        calGrid.appendChild(cell);
      }

      calPrev.disabled = viewYear === minYear && viewMonth === minMonth - 1;
      calNext.disabled = viewYear === maxYear && viewMonth === maxMonth - 1;
    }

    calPrev.addEventListener('click', function () {
      viewMonth -= 1;
      if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
      renderCalendar();
    });
    calNext.addEventListener('click', function () {
      viewMonth += 1;
      if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
      renderCalendar();
    });

    renderCalendar();
  }

  // Mobile nudge: the service list can run longer than one screen, so point
  // people at the options below the fold instead of letting them miss them.
  const btnMoreServices = document.getElementById('btnMoreServices');
  if (btnMoreServices) {
    btnMoreServices.addEventListener('click', function () {
      document.getElementById('serviceListRow').scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }

  async function loadTimes() {
    const container = document.getElementById('timeSlots');
    container.innerHTML = '<p class="text-secondary small">Carregando horarios...</p>';
    const res = await fetch(`/api/available-times?barberId=${state.barberId}&serviceId=${state.serviceId}&date=${state.date}`);
    const slots = await res.json();
    container.innerHTML = '';
    if (slots.length === 0) {
      container.innerHTML = '<p class="text-secondary small">Nenhum horario disponivel nesta data. Escolha outra data.</p>';
      return;
    }
    slots.forEach((s) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `time-slot-btn ${s.available ? '' : 'unavailable'}`;
      btn.textContent = s.time;
      btn.disabled = !s.available;
      btn.addEventListener('click', function () {
        container.querySelectorAll('.time-slot-btn').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.time = s.time;
        document.getElementById('time_input').value = s.time;
      });
      container.appendChild(btn);
    });
  }

  btnNext.addEventListener('click', async function () {
    if (!canAdvance()) {
      alert('Selecione uma opcao para continuar.');
      return;
    }
    if (state.step === 1 && !singleBarberId) await loadBarbers();
    if (state.step === 3) await loadTimes();
    const idx = sequence.indexOf(state.step);
    if (idx < sequence.length - 1) showStep(sequence[idx + 1]);
  });

  btnPrev.addEventListener('click', function () {
    const idx = sequence.indexOf(state.step);
    if (idx > 0) showStep(sequence[idx - 1]);
  });

  form.addEventListener('submit', function (e) {
    if (!state.serviceId || !state.barberId || !state.date || !state.time) {
      e.preventDefault();
      alert('Complete todas as etapas antes de confirmar.');
    }
  });

  showStep(sequence[0]);

  // Coming from "Meus Agendamentos > Remarcar": the old appointment was
  // already cancelled server-side, and the link carries the service (and
  // barber, for future multi-barber shops) so the client doesn't have to
  // pick the same service again -- just jump them straight past step 1.
  const preselect = new URLSearchParams(window.location.search);
  const preServiceId = preselect.get('service_id');
  if (preServiceId) {
    const serviceCard = document.querySelector(`[data-select="service"][data-id="${preServiceId}"]`);
    if (serviceCard) {
      serviceCard.click();
      btnNext.click();
    }
  }
})();
