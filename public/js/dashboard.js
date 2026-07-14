(function () {
  const gold = '#d4af37';
  Chart.defaults.color = '#9a9a9a';
  Chart.defaults.borderColor = 'rgba(154,154,154,0.15)';

  const revCtx = document.getElementById('chartRevenue');
  if (revCtx) {
    new Chart(revCtx, {
      type: 'line',
      data: {
        labels: revenueLabels,
        datasets: [{
          label: 'Faturamento (R$)',
          data: revenueData,
          borderColor: gold,
          backgroundColor: 'rgba(212,175,55,0.15)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
        }],
      },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
    });
  }

  const svcCtx = document.getElementById('chartServices');
  if (svcCtx) {
    new Chart(svcCtx, {
      type: 'doughnut',
      data: {
        labels: serviceLabels.length ? serviceLabels : ['Sem dados'],
        datasets: [{
          data: serviceData.length ? serviceData : [1],
          backgroundColor: ['#d4af37', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#f59e0b'],
          borderWidth: 0,
        }],
      },
      options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } } } },
    });
  }

  const apptCtx = document.getElementById('chartAppointments');
  if (apptCtx) {
    new Chart(apptCtx, {
      type: 'bar',
      data: {
        labels: monthLabels,
        datasets: [{ label: 'Agendamentos', data: monthData, backgroundColor: 'rgba(212,175,55,0.6)', borderRadius: 6 }],
      },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
    });
  }
})();
