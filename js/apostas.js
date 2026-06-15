let user, games, userBets, config;

async function init() {
  user = Auth.requireLogin();
  if (!user) return;
  setupNav();
  await loadAll();
}

async function loadAll() {
  const [gamesRes, betsRes, cfgRes] = await Promise.all([
    apiGet('getGames'),
    apiPost('getUserBets', Auth.credentials()),
    apiGet('getConfig')
  ]);

  if (!gamesRes.success) return showToast('Erro ao carregar jogos', 'error');

  games = gamesRes.games || [];
  userBets = {};
  (betsRes.bets || []).forEach(b => { userBets[b.jogoId] = b; });
  config = cfgRes.config || {};

  renderChampion();
  renderGames();
}

function renderChampion() {
  const section = document.getElementById('champion-section');
  const campeonatoAberto = config.apostas_campeonato_abertas === true || String(config.apostas_campeonato_abertas).toUpperCase() === 'TRUE';

  if (user.campeao) {
    section.innerHTML = `
      <div class="champion-card locked">
        <div class="champion-label">Seu campeão</div>
        <div class="champion-choice">
          ${getFlagImg(user.campeao, 'flag-champion')}
          <span>${user.campeao}</span>
        </div>
        <div class="champion-locked-msg">Escolha bloqueada</div>
      </div>`;
  } else if (campeonatoAberto) {
    const countries = getAllCountries();
    section.innerHTML = `
      <div class="champion-card open">
        <div class="champion-label">Escolha seu campeão</div>
        <p class="champion-hint">Escolha <strong>uma única vez</strong> antes das apostas começarem!</p>
        <div class="champion-select-wrap">
          <select id="champion-select" class="champion-select">
            <option value="">Selecione um país...</option>
            ${countries.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
          <button onclick="saveChampion()" class="btn btn-champion">Confirmar Campeão</button>
        </div>
      </div>`;

    document.getElementById('champion-select').addEventListener('change', function() {
      const preview = document.getElementById('champion-preview');
      if (preview) preview.remove();
      if (!this.value) return;
      const prev = document.createElement('div');
      prev.id = 'champion-preview';
      prev.className = 'champion-preview';
      prev.innerHTML = `${getFlagImg(this.value, 'flag-champion')} <span>${this.value}</span>`;
      this.parentElement.insertBefore(prev, this.nextSibling);
    });
  } else {
    section.innerHTML = `
      <div class="champion-card closed">
        <div class="champion-label">Campeão</div>
        <p>Janela de apostas no campeão encerrada.</p>
      </div>`;
  }
}

async function saveChampion() {
  const select = document.getElementById('champion-select');
  if (!select || !select.value) return showToast('Selecione um país', 'error');

  const btn = document.querySelector('.btn-champion');
  loading(btn, true);

  const res = await apiPost('saveChampion', {
    ...Auth.credentials(),
    campeao: select.value
  });

  loading(btn, false);
  if (!res.success) return showToast(res.error, 'error');

  showToast('Campeão salvo!');
  user.campeao = select.value;
  Auth.save(user);
  renderChampion();
}

let activeFilter = 'todos';

function setFilter(filter) {
  activeFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('onclick').includes(`'${filter}'`));
  });
  renderGames();
}

function gameMatchesFilter(game) {
  const closed = game.encerrado === true || game.encerrado === 'TRUE';
  const deadlinePassed = isDeadlinePassed(game.prazoAposta);
  const canBet = !closed && !deadlinePassed;
  if (activeFilter === 'abertos') return canBet;
  if (activeFilter === 'sem-aposta') return canBet && !userBets[game.id];
  return true;
}

function togglePhase(safeId) {
  const grid = document.getElementById(`grid-${safeId}`);
  const icon = document.getElementById(`icon-${safeId}`);
  const collapsed = grid.style.display === 'none';
  grid.style.display = collapsed ? '' : 'none';
  icon.textContent = collapsed ? '▾' : '▸';
}

function renderGames() {
  const container = document.getElementById('games-container');
  if (!games.length) {
    container.innerHTML = '<p class="empty-msg">Nenhum jogo cadastrado ainda.</p>';
    return;
  }

  const phaseOrder = ['Grupos', '16avos', 'Oitavas', 'Quartas', 'Semifinal', 'Terceiro Lugar', 'Final'];
  const byPhase = {};
  games.forEach(g => {
    if (!byPhase[g.fase]) byPhase[g.fase] = [];
    byPhase[g.fase].push(g);
  });

  const phases = Object.keys(byPhase).sort((a, b) => {
    const ia = phaseOrder.indexOf(a), ib = phaseOrder.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  const html = phases.map(fase => {
    const filtered = byPhase[fase].filter(gameMatchesFilter);
    if (activeFilter !== 'todos' && !filtered.length) return '';

    const visibleGames = activeFilter === 'todos' ? byPhase[fase] : filtered;
    const hasOpen = byPhase[fase].some(g => {
      const closed = g.encerrado === true || g.encerrado === 'TRUE';
      return !closed && !isDeadlinePassed(g.prazoAposta);
    });
    const collapsed = !hasOpen;
    const safeId = fase.replace(/\s+/g, '-');

    return `
      <div class="phase-section">
        <h2 class="phase-title phase-toggle" onclick="togglePhase('${safeId}')">
          <span id="icon-${safeId}">${collapsed ? '▸' : '▾'}</span> ${fase}
          <span class="phase-count">${visibleGames.length} jogo${visibleGames.length !== 1 ? 's' : ''}</span>
        </h2>
        <div class="games-grid" id="grid-${safeId}" style="${collapsed ? 'display:none' : ''}">
          ${visibleGames.map(g => gameCard(g)).join('')}
        </div>
      </div>`;
  }).join('');

  container.innerHTML = html || '<p class="empty-msg">Nenhum jogo encontrado para este filtro.</p>';
}

function gameCard(game) {
  const bet = userBets[game.id];
  const closed = game.encerrado === true || game.encerrado === 'TRUE';
  const deadlinePassed = isDeadlinePassed(game.prazoAposta);
  const canBet = !closed && !deadlinePassed;
  const hasResult = game.golTime1 !== null && game.golTime1 !== '';

  const b1 = bet ? bet.golTime1 : '';
  const b2 = bet ? bet.golTime2 : '';

  let statusBadge = '';
  let pts = '';

  if (hasResult) {
    statusBadge = `<span class="badge badge-result">Resultado: ${game.golTime1}x${game.golTime2}</span>`;
    if (bet) {
      const p = calcPoints(Number(bet.golTime1), Number(bet.golTime2), Number(game.golTime1), Number(game.golTime2));
      const label = p === 8 ? '🎯 Placar exato' : p === 5 ? '✅ Saldo certo' : p === 3 ? '👍 Vencedor' : '❌ Errou';
      pts = `<div class="bet-points ${p > 0 ? 'pts-win' : 'pts-loss'}">${label} +${p} pts</div>`;
    }
  } else if (canBet) {
    statusBadge = `<span class="badge badge-open">Aberto — ${timeUntil(game.prazoAposta)}</span>`;
  } else {
    statusBadge = `<span class="badge badge-closed">Apostas encerradas</span>`;
  }

  const inputsOrResult = hasResult
    ? `<div class="score-display">${b1 !== '' ? `${b1} x ${b2}` : '- x -'}</div>`
    : canBet
    ? `<div class="score-inputs">
        <input type="number" id="g1-${game.id}" class="score-input" min="0" max="99" value="${b1}" placeholder="-">
        <span class="score-sep">x</span>
        <input type="number" id="g2-${game.id}" class="score-input" min="0" max="99" value="${b2}" placeholder="-">
      </div>`
    : `<div class="score-display">${b1 !== '' ? `${b1} x ${b2}` : '- x -'}</div>`;

  return `
    <div id="card-${game.id}" class="game-card ${closed ? 'closed' : ''} ${hasResult ? 'with-result' : ''}">
      <div class="game-status">${statusBadge}</div>
      <div class="game-teams">
        <div class="team team-left">
          ${getFlagImg(game.time1, 'flag-game')}
          <span class="team-name">${game.time1}</span>
        </div>
        ${inputsOrResult}
        <div class="team team-right">
          ${getFlagImg(game.time2, 'flag-game')}
          <span class="team-name">${game.time2}</span>
        </div>
      </div>
      ${pts}
      ${canBet ? `<button onclick="saveBet('${game.id}')" class="btn ${bet ? 'btn-change-bet' : 'btn-save-bet'}">${bet ? 'Mudar Aposta' : 'Salvar Aposta'}</button>` : ''}
      <div class="game-deadline">${game.prazoAposta ? `Prazo: ${formatDate(game.prazoAposta)}` : ''}</div>
      ${bet && !hasResult ? `<div class="my-bet">Minha aposta: ${bet.golTime1} x ${bet.golTime2}</div>` : ''}
    </div>`;
}

function calcPoints(b1, b2, r1, r2) {
  if (b1 === r1 && b2 === r2) return 8;
  const bSign = Math.sign(b1 - b2), rSign = Math.sign(r1 - r2);
  if (bSign !== rSign) return 0;
  if (Math.abs(b1 - b2) === Math.abs(r1 - r2)) return 5;
  return 3;
}

async function saveBet(jogoId) {
  const g1 = document.getElementById(`g1-${jogoId}`);
  const g2 = document.getElementById(`g2-${jogoId}`);
  if (!g1 || !g2 || g1.value === '' || g2.value === '') {
    return showToast('Preencha o placar completo', 'error');
  }

  const btn = document.querySelector(`[onclick="saveBet('${jogoId}')"]`);
  if (btn) loading(btn, true);

  const res = await apiPost('saveBet', {
    ...Auth.credentials(),
    jogoId,
    golTime1: Number(g1.value),
    golTime2: Number(g2.value)
  });

  if (btn) loading(btn, false);
  if (!res.success) return showToast(res.error, 'error');

  showToast('Aposta salva!');
  userBets[jogoId] = { jogoId, golTime1: Number(g1.value), golTime2: Number(g2.value) };
  const cardEl = document.getElementById(`card-${jogoId}`);
  const game = games.find(g => g.id === jogoId);
  if (cardEl && game) cardEl.outerHTML = gameCard(game);
}

document.addEventListener('DOMContentLoaded', init);
