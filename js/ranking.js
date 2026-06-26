let rankingData, rankingConfig, rankingGames, showIA = true;

async function init() {
  const user = Auth.get();
  setupNav();

  const [rankRes, cfgRes, gamesRes] = await Promise.all([
    apiGet('getRanking'),
    apiGet('getConfig'),
    apiGet('getGames')
  ]);

  if (!rankRes.success) {
    document.getElementById('ranking-body').innerHTML =
      '<tr><td colspan="7">Erro ao carregar ranking.</td></tr>';
    return;
  }

  rankingData   = rankRes.ranking;
  rankingConfig = cfgRes.config || {};
  rankingGames  = (gamesRes.games || []).filter(g => g.encerrado === true || String(g.encerrado).toUpperCase() === 'TRUE');

  renderRanking(rankingData, rankingConfig, user);
}

function toggleIA() {
  showIA = !showIA;
  const btn = document.getElementById('btn-toggle-ia');
  btn.classList.toggle('active', showIA);
  renderRanking(rankingData, rankingConfig, Auth.get());
}

const IA_LABELS = {
  'ChatGPT':   { emoji: '🟢', label: 'ChatGPT' },
  'Claude':    { emoji: '🟠', label: 'Claude' },
  'Gemini':    { emoji: '🔵', label: 'Gemini' },
  'Perplexity':{ emoji: '🟣', label: 'Perplexity' },
  'DeepSeek':  { emoji: '🔷', label: 'DeepSeek' },
  'Grok':      { emoji: '⬛', label: 'Grok' },
};

function renderRanking(ranking, config, currentUser) {
  const champRevealed   = config.campeao_revelado === true || String(config.campeao_revelado).toUpperCase() === 'TRUE';
  const apostasVisiveis = config.apostas_visiveis === true || String(config.apostas_visiveis).toUpperCase() === 'TRUE';
  const finalChamp = config.campeao_final || '';

  const header = document.getElementById('ranking-header');
  header.innerHTML = `
    <tr>
      <th>#</th>
      <th>Nome</th>
      <th>Pontos</th>
      <th>🎯 Exato</th>
      <th>📊 Saldo</th>
      <th>✅ Vencedor</th>
      ${champRevealed ? '<th>🏆 Campeão</th>' : ''}
    </tr>`;

  const tbody = document.getElementById('ranking-body');

  const visibleRanking = ranking.filter(r => showIA || !r.isIA);

  if (!visibleRanking.length) {
    tbody.innerHTML = '<tr><td colspan="7">Nenhum resultado ainda.</td></tr>';
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];
  let humanPos = 0;

  tbody.innerHTML = visibleRanking.map((r, i) => {
    const isMe = currentUser && r.nome === currentUser.nome;
    const ia = r.isIA ? (IA_LABELS[r.nome] || { emoji: '🤖', label: r.nome }) : null;

    let pos;
    if (r.isIA) {
      pos = '🤖';
    } else {
      humanPos++;
      pos = medals[humanPos - 1] || `${humanPos}º`;
    }

    const champCell = champRevealed
      ? `<td class="${r.champPoints > 0 ? 'champ-correct' : ''}">
          ${escapeHtml(r.campeao || '-')}
          ${r.champPoints > 0 ? ' +20' : ''}
        </td>`
      : '';

    const nameBadge = ia
      ? `<span class="ia-badge" title="${escapeHtml(ia.label)}">${ia.emoji} ${escapeHtml(r.nome)}</span>`
      : '';

    const nameText = ia
      ? nameBadge
      : (isMe ? `<strong>${escapeHtml(r.nome)}</strong>` : escapeHtml(r.nome));

    const nameCell = apostasVisiveis
      ? `<span class="ranking-name-link" onclick="openBetsModal(${escapeHtml(JSON.stringify(r.nome))})">${nameText}</span>`
      : nameText;

    return `<tr class="${isMe ? 'row-me' : ''}${r.isIA ? ' row-ia' : ''}">
      <td class="pos-cell">${pos}</td>
      <td class="name-cell">${nameCell}</td>
      <td class="pts-cell"><strong>${r.points}</strong></td>
      <td>${r.exactScores}</td>
      <td>${r.correctDiffs}</td>
      <td>${r.correctWinners}</td>
      ${champCell}
    </tr>`;
  }).join('');

  if (champRevealed && finalChamp) {
    document.getElementById('champ-banner').innerHTML = `
      <div class="champ-banner">
        ${getFlagImg(finalChamp, 'flag-champion')}
        <span>Campeão: <strong>${finalChamp}</strong></span>
      </div>`;
  }
}

async function openBetsModal(nome) {
  const modal = document.getElementById('bets-modal');
  const title = document.getElementById('bets-modal-title');
  const body  = document.getElementById('bets-modal-body');

  title.textContent = `Palpites de ${nome}`;
  body.innerHTML = '<p class="loading-msg">Carregando...</p>';
  modal.style.display = 'flex';

  const res = await apiPost('getUserBetsByName', { nome });
  if (!res.success) {
    body.innerHTML = `<p class="error">${res.error}</p>`;
    return;
  }

  const betsMap = {};
  (res.bets || []).forEach(b => { betsMap[b.jogoId] = b; });

  if (!rankingGames.length) {
    body.innerHTML = '<p class="empty-msg">Nenhuma partida finalizada ainda.</p>';
    return;
  }

  function calcPoints(b1, b2, r1, r2) {
    if (b1 === r1 && b2 === r2) return 8;
    const bSign = Math.sign(b1 - b2), rSign = Math.sign(r1 - r2);
    if (bSign !== rSign) return 0;
    if (bSign !== 0 && Math.abs(b1 - b2) === Math.abs(r1 - r2)) return 5;
    return 3;
  }

  body.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Fase</th>
          <th>Jogo</th>
          <th>Resultado</th>
          <th>Palpite</th>
          <th>Pontos</th>
        </tr>
      </thead>
      <tbody>
        ${rankingGames.map(g => {
          const bet = betsMap[g.id];
          const r1 = Number(g.golTime1), r2 = Number(g.golTime2);
          let palpite = '-', ptsTxt = '-', rowClass = '';
          if (bet) {
            const b1 = Number(bet.golTime1), b2 = Number(bet.golTime2);
            const pts = calcPoints(b1, b2, r1, r2);
            palpite = `${b1} x ${b2}`;
            ptsTxt  = pts === 8 ? '🎯 +8' : pts === 5 ? '📊 +5' : pts === 3 ? '✅ +3' : '❌ 0';
            rowClass = pts > 0 ? 'pts-win' : 'pts-loss';
          }
          return `<tr class="${rowClass}">
            <td>${g.fase}</td>
            <td>${g.time1} x ${g.time2}</td>
            <td>${r1} x ${r2}</td>
            <td>${palpite}</td>
            <td>${ptsTxt}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

function closeBetsModal() {
  document.getElementById('bets-modal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', init);
