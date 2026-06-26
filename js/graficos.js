let historico = [];
let chart = null;

async function init() {
  setupNav();
  Auth.requireLogin();

  const loadingMsg = document.getElementById('loading-msg');
  loadingMsg.style.display = 'block';

  try {
    // Carrega dados do histórico
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

    // Constrói lista de usuários únicos
    const usuarios = [...new Set(historico.map(h => h.nome))].sort();
    populateUsuarioFilter(usuarios);

    // Constrói legenda de fases
    const fases = [...new Set(historico.map(h => h.fase))];
    document.getElementById('fases-legend').textContent = fases.join(' → ');

    loadingMsg.style.display = 'none';

    // Renderiza gráfico inicial
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
    opt.selected = false;
    select.appendChild(opt);
  });
}

function renderChart() {
  if (chart) chart.destroy();

  const chartType = document.getElementById('chart-type').value;
  const loadingMsg = document.getElementById('loading-msg');

  if (chartType === 'posicoes') {
    renderPosicoes();
    document.getElementById('filter-usuarios-div').style.display = 'none';
  } else if (chartType === 'pontos') {
    renderPontos();
    document.getElementById('filter-usuarios-div').style.display = 'none';
  } else if (chartType === 'comparacao') {
    renderComparacao();
    document.getElementById('filter-usuarios-div').style.display = 'block';
  }
}

function renderPosicoes() {
  // Agrupa por timestamp
  const porTimestamp = {};
  historico.forEach(h => {
    if (!porTimestamp[h.timestamp]) {
      porTimestamp[h.timestamp] = [];
    }
    porTimestamp[h.timestamp].push(h);
  });

  const timestamps = Object.keys(porTimestamp).sort();
  const labels = timestamps.map(ts => {
    const d = new Date(ts);
    const fase = porTimestamp[ts][0]?.fase || 'N/A';
    return fase + '\n' + formatDate(d);
  });

  // Pega usuários únicos
  const usuarios = [...new Set(historico.map(h => h.nome))].sort();
  const cores = gerarCores(usuarios.length);

  const datasets = usuarios.map((user, idx) => {
    const data = timestamps.map(ts => {
      const snapshot = porTimestamp[ts].find(s => s.nome === user);
      return snapshot ? snapshot.posicao : null;
    });
    return {
      label: user,
      data: data,
      borderColor: cores[idx],
      backgroundColor: cores[idx] + '30',
      fill: false,
      tension: 0.3,
      borderWidth: 2,
      pointRadius: 4,
      pointBackgroundColor: cores[idx],
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
    };
  });

  const ctx = document.getElementById('myChart').getContext('2d');
  chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { size: 12 },
            padding: 15,
            usePointStyle: true,
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.dataset.label + ': ' + (context.parsed.y ? context.parsed.y + 'º lugar' : 'N/A');
            }
          }
        }
      },
      scales: {
        y: {
          title: { display: true, text: 'Posição no Ranking' },
          reverse: true,  // 1º no topo
          ticks: { stepSize: 1 },
          grace: '5%'
        }
      }
    }
  });
}

function renderPontos() {
  // Agrupa por timestamp
  const porTimestamp = {};
  historico.forEach(h => {
    if (!porTimestamp[h.timestamp]) {
      porTimestamp[h.timestamp] = [];
    }
    porTimestamp[h.timestamp].push(h);
  });

  const timestamps = Object.keys(porTimestamp).sort();
  const labels = timestamps.map(ts => {
    const d = new Date(ts);
    const fase = porTimestamp[ts][0]?.fase || 'N/A';
    return fase + '\n' + formatDate(d);
  });

  // Pega usuários únicos
  const usuarios = [...new Set(historico.map(h => h.nome))].sort();
  const cores = gerarCores(usuarios.length);

  const datasets = usuarios.map((user, idx) => {
    const data = timestamps.map(ts => {
      const snapshot = porTimestamp[ts].find(s => s.nome === user);
      return snapshot ? snapshot.pontos : 0;
    });
    return {
      label: user,
      data: data,
      borderColor: cores[idx],
      backgroundColor: cores[idx] + '30',
      fill: true,
      tension: 0.3,
      borderWidth: 2,
      pointRadius: 4,
      pointBackgroundColor: cores[idx],
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
    };
  });

  const ctx = document.getElementById('myChart').getContext('2d');
  chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { size: 12 },
            padding: 15,
            usePointStyle: true,
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.dataset.label + ': ' + context.parsed.y + 'pts';
            }
          }
        }
      },
      scales: {
        y: {
          title: { display: true, text: 'Pontuação' },
          beginAtZero: true,
          grace: '5%'
        }
      }
    }
  });
}

function renderComparacao() {
  // Pega usuários selecionados
  const select = document.getElementById('filter-usuarios');
  let usuariosSelecionados = [];
  for (let opt of select.options) {
    if (opt.selected) usuariosSelecionados.push(opt.value);
  }

  // Se nenhum selecionado, mostra os 5 primeiros
  if (usuariosSelecionados.length === 0) {
    const todoUsuarios = [...new Set(historico.map(h => h.nome))].sort();
    usuariosSelecionados = todoUsuarios.slice(0, Math.min(5, todoUsuarios.length));
  }

  // Agrupa por timestamp
  const porTimestamp = {};
  historico.forEach(h => {
    if (!porTimestamp[h.timestamp]) {
      porTimestamp[h.timestamp] = [];
    }
    porTimestamp[h.timestamp].push(h);
  });

  const timestamps = Object.keys(porTimestamp).sort();
  const labels = timestamps.map(ts => {
    const d = new Date(ts);
    const fase = porTimestamp[ts][0]?.fase || 'N/A';
    return fase + '\n' + formatDate(d);
  });

  const cores = gerarCores(usuariosSelecionados.length);

  const datasets = usuariosSelecionados.map((user, idx) => {
    const data = timestamps.map(ts => {
      const snapshot = porTimestamp[ts].find(s => s.nome === user);
      return snapshot ? snapshot.pontos : 0;
    });
    return {
      label: user,
      data: data,
      borderColor: cores[idx],
      backgroundColor: cores[idx] + '50',
      fill: true,
      tension: 0.4,
      borderWidth: 3,
      pointRadius: 5,
      pointBackgroundColor: cores[idx],
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      tension: 0.3,
    };
  });

  const ctx = document.getElementById('myChart').getContext('2d');
  chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { size: 12, weight: 'bold' },
            padding: 15,
            usePointStyle: true,
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)',
          callbacks: {
            label: function(context) {
              return context.dataset.label + ': ' + context.parsed.y + 'pts';
            }
          }
        }
      },
      scales: {
        y: {
          title: { display: true, text: 'Pontuação' },
          beginAtZero: true,
          grace: '5%'
        }
      }
    }
  });
}

function gerarCores(n) {
  const cores = [
    '#2ecc71',  // verde
    '#3498db',  // azul
    '#e74c3c',  // vermelho
    '#f39c12',  // laranja
    '#9b59b6',  // roxo
    '#1abc9c',  // turquesa
    '#e91e63',  // rosa
    '#34495e',  // cinza escuro
    '#f1c40f',  // amarelo
    '#16a085',  // verde escuro
  ];

  const result = [];
  for (let i = 0; i < n; i++) {
    result.push(cores[i % cores.length]);
  }
  return result;
}

function formatDate(d) {
  const pad = n => String(n).padStart(2, '0');
  return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

// Inicializa ao carregar a página
init();
