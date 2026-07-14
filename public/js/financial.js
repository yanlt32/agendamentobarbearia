(function () {
  const gold = '#d4af37';
  Chart.defaults.color = '#9a9a9a';
  Chart.defaults.borderColor = 'rgba(154,154,154,0.15)';

  const revCtx = document.getElementById('chartRevenue');
  if (revCtx) {
    new Chart(revCtx, {
      type: 'bar',
      data: {
        labels: revLabels,
        datasets: [{ label: 'Faturamento (R$)', data: revData, backgroundColor: 'rgba(212,175,55,0.6)', borderRadius: 6 }],
      },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
    });
  }

  const svcCtx = document.getElementById('chartServices');
  if (svcCtx) {
    new Chart(svcCtx, {
      type: 'pie',
      data: {
        labels: svcLabels.length ? svcLabels : ['Sem dados'],
        datasets: [{
          data: svcData.length ? svcData : [1],
          backgroundColor: ['#d4af37', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#f59e0b'],
          borderWidth: 0,
        }],
      },
      options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } } } },
    });
  }
})();
