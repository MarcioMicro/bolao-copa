let historico = [];
let chart = null;
const MAX_VISIBLE = 8;

async function init() {
  setupNav();
  Auth.requireLogin();

  const loadingMsg = document.getElementById('loading-msg');
  loadingMsg.style.display = 'block';

  try {
    const res = await apiGet('obterHistoricoRanking');
    if (!res.success || !res.historico) {
      loadingMsg.innerHTML = '<p class="error">Erro ao carregar histórico</p>';
      return;
    }

    historico = res.historico;

    if (historico.length === 0) {
      loadingMsg.innerHTML = '<p style="color:var(--cinza);text-align:center">Nenhum dado de histórico disponível ainda. Resultados serão registrados após os primeiros jogos.</p>';
      return;
    }

    const usuarios = [...new Set(historico.map(h => h.nome))].sort((a, b) => a.localeCompare(b, 'pt', { sensitivity: 'base' }));
    populateUsuarioFilter(usuarios);

    const fases = [...new Set(historico.map(h => h.fase))];
    document.getElementById('fases-legend').textContent = fases.join(' → ');

    loadingMsg.style.display = 'none';
    renderChart();

  } catch (e) {
    loadingMsg.innerHTML = '<p class="error">Erro: ' + e.message + '</p>';
  }
}

function populateUsuarioFilter(usuarios) {
  const select = document.getElementById('filter-usuarios');
  select.innerHTML = '';
  usuarios.forEach(user => {
    const opt = document.createElement('option');
    opt.value = user;
    opt.textContent = user;
    select.appendChild(opt);
  });
}

function getSelectedUsers(todosUsuarios) {
  const select = document.getElementById('filter-usuarios');
  const selecionados = [];
  for (const opt of select.options) {
    if (opt.selected) selecionados.push(opt.value);
  }
  return selecionados.length > 0 ? selecionados : todosUsuarios;
}

function renderChart() {
  if (chart) chart.destroy();
  const chartType = document.getElementById('chart-type').value;
  if (chartType === 'posicoes') {
    renderPosicoes();
  } else {
    renderPontos();
  }
}

function setupScrollbar(total) {
  const wrap = document.getElementById('scroll-wrap');
  const slider = document.getElementById('chart-scroll');
  if (total <= MAX_VISIBLE) {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = 'block';
  slider.min = 0;
  slider.max = total - MAX_VISIBLE;
  slider.value = slider.max;
}

function onChartScroll() {
  if (!chart) return;
  const slider = document.getElementById('chart-scroll');
  const offset = parseInt(slider.value);
  chart.options.scales.x.min = offset;
  chart.options.scales.x.max = offset + MAX_VISIBLE - 1;
  chart.update('none');
}

function xAxisWindow(total) {
  if (total <= MAX_VISIBLE) return {};
  return { min: total - MAX_VISIBLE, max: total - 1 };
}

function agruparPorTimestamp() {
  const porTimestamp = {};
  historico.forEach(h => {
    if (!porTimestamp[h.timestamp]) porTimestamp[h.timestamp] = [];
    porTimestamp[h.timestamp].push(h);
  });
  return porTimestamp;
}

function renderPosicoes() {
  const porTimestamp = agruparPorTimestamp();
  const timestamps = Object.keys(porTimestamp).sort();
  const labels = timestamps.map(ts => (porTimestamp[ts][0]?.fase || '') + '\n' + formatDate(new Date(ts)));

  const todosUsuarios = [...new Set(historico.map(h => h.nome))].sort((a, b) => a.localeCompare(b, 'pt', { sensitivity: 'base' }));
  const usuarios = getSelectedUsers(todosUsuarios);
  const cores = gerarCores(usuarios.length);

  const datasets = usuarios.map((user, idx) => ({
    label: user,
    data: timestamps.map(ts => {
      const s = porTimestamp[ts].find(s => s.nome === user);
      return s ? s.posicao : null;
    }),
    borderColor: cores[idx],
    backgroundColor: cores[idx] + '30',
    fill: false,
    tension: 0.3,
    borderWidth: 2,
    pointRadius: 4,
    pointBackgroundColor: cores[idx],
    pointBorderColor: '#fff',
    pointBorderWidth: 2,
  }));

  const win = xAxisWindow(timestamps.length);
  setupScrollbar(timestamps.length);

  chart = new Chart(document.getElementById('myChart').getContext('2d'), {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 10, usePointStyle: true } },
        tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + (ctx.parsed.y ? ctx.parsed.y + 'º' : 'N/A') } }
      },
      scales: {
        x: { ...win },
        y: { title: { display: true, text: 'Posição' }, reverse: true, ticks: { stepSize: 1 }, grace: '5%' }
      }
    }
  });
}

function renderPontos() {
  const porTimestamp = agruparPorTimestamp();
  const timestamps = Object.keys(porTimestamp).sort();
  const labels = timestamps.map(ts => (porTimestamp[ts][0]?.fase || '') + '\n' + formatDate(new Date(ts)));

  const todosUsuarios = [...new Set(historico.map(h => h.nome))].sort((a, b) => a.localeCompare(b, 'pt', { sensitivity: 'base' }));
  const usuarios = getSelectedUsers(todosUsuarios);
  const cores = gerarCores(usuarios.length);

  const datasets = usuarios.map((user, idx) => ({
    label: user,
    data: timestamps.map(ts => {
      const s = porTimestamp[ts].find(s => s.nome === user);
      return s ? s.pontos : 0;
    }),
    borderColor: cores[idx],
    backgroundColor: cores[idx] + '30',
    fill: false,
    tension: 0.3,
    borderWidth: 2,
    pointRadius: 4,
    pointBackgroundColor: cores[idx],
    pointBorderColor: '#fff',
    pointBorderWidth: 2,
  }));

  const win = xAxisWindow(timestamps.length);
  setupScrollbar(timestamps.length);

  chart = new Chart(document.getElementById('myChart').getContext('2d'), {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 10, usePointStyle: true } },
        tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + ctx.parsed.y + 'pts' } }
      },
      scales: {
        x: { ...win },
        y: { title: { display: true, text: 'Pontuação' }, grace: '5%' }
      }
    }
  });
}

function gerarCores(n) {
  const cores = [
    '#2ecc71', '#3498db', '#e74c3c', '#f39c12', '#9b59b6',
    '#1abc9c', '#e91e63', '#34495e', '#f1c40f', '#16a085',
  ];
  return Array.from({ length: n }, (_, i) => cores[i % cores.length]);
}

function formatDate(d) {
  const pad = n => String(n).padStart(2, '0');
  return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

init();
