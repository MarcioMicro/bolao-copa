let adminUser, allUsers, allGames, allBets, config;

function syncPrazoAposta(value) {
  const prazo = document.getElementById('new-prazo');
  if (!prazo.dataset.manual) prazo.value = value;
}

async function init() {
  adminUser = Auth.get();
  const isAdmin = adminUser && (adminUser.admin === true || String(adminUser.admin).toUpperCase() === 'TRUE');

  if (!isAdmin) {
    // Verifica se já existe algum admin na planilha
    const res = await apiGet('checkHasAdmin').catch(() => null);
    if (res && res.hasAdmin) {
      window.location.href = 'index.html';
      return;
    }
    // Nenhum admin ainda — mostra só o formulário de setup
    document.querySelector('.tab-buttons').style.display = 'none';
    document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
    document.getElementById('setup-panel').style.display = 'block';
    return;
  }

  setupNav();
  showTab('usuarios');
}

function showTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(`tab-${tab}`).classList.add('active');

  if (tab === 'usuarios') loadUsers();
  else if (tab === 'jogos') loadGames();
  else if (tab === 'resultados') loadResultados();
  else if (tab === 'config') loadConfig();
}

// ── Usuários ──────────────────────────────────────────────────────────────────

async function loadUsers() {
  const panel = document.getElementById('tab-usuarios');
  panel.innerHTML = '<p class="loading-msg">Carregando...</p>';

  const res = await apiPost('adminGetUsers', Auth.credentials());
  if (!res.success) { panel.innerHTML = `<p class="error">${res.error}</p>`; return; }
  allUsers = res.users;

  const pending  = allUsers.filter(u => u.status === 'pendente' && !u.isIA);
  const approved = allUsers.filter(u => u.status === 'aprovado' && !u.isIA);
  const blocked  = allUsers.filter(u => u.status === 'bloqueado' && !u.isIA);
  const iaUsers  = allUsers.filter(u => u.isIA);

  panel.innerHTML = `
    <h3>Aguardando aprovação (${pending.length})</h3>
    ${userTable(pending, true)}
    <h3>Aprovados (${approved.length})</h3>
    ${userTable(approved, false)}
    ${blocked.length ? `<h3>Bloqueados (${blocked.length})</h3>${userTable(blocked, false)}` : ''}
    <h3>🤖 Inteligências Artificiais (${iaUsers.length})</h3>
    ${iaUserTable(iaUsers)}
  `;
}

function userTable(users, isPending) {
  if (!users.length) return '<p class="empty-msg">Nenhum.</p>';
  return `<div class="table-wrap"><table class="admin-table">
    <thead><tr><th>Nome</th><th>Campeão</th><th>Cadastro</th><th>Admin</th><th>Ações</th></tr></thead>
    <tbody>
      ${users.map(u => `<tr>
        <td>${u.nome}</td>
        <td>${u.campeao || '-'}</td>
        <td>${formatDate(u.dataCadastro)}</td>
        <td>${u.admin ? '✅' : ''}</td>
        <td class="action-cell">
          ${isPending || u.status === 'bloqueado'
            ? `<button onclick="updateUser('${u.id}','aprovado')" class="btn btn-sm btn-success">Aprovar</button>`
            : `<button onclick="updateUser('${u.id}','bloqueado')" class="btn btn-sm btn-danger">Bloquear</button>`}
          ${!u.admin
            ? `<button onclick="toggleAdmin('${u.id}',true)" class="btn btn-sm btn-secondary">Tornar Admin</button>`
            : `<button onclick="toggleAdmin('${u.id}',false)" class="btn btn-sm btn-secondary">Remover Admin</button>`}
          <button onclick="resetPassword('${u.id}','${u.nome}')" class="btn btn-sm btn-secondary">Trocar Senha</button>
        </td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;
}

function iaUserTable(users) {
  if (!users.length) return '<p class="empty-msg">Nenhuma IA cadastrada. Crie usuários normais e marque a coluna IsIA como TRUE na planilha.</p>';
  return `<div class="table-wrap"><table class="admin-table">
    <thead><tr><th>Nome</th><th>Campeão</th><th>Ações</th></tr></thead>
    <tbody>
      ${users.map(u => `<tr>
        <td>🤖 ${u.nome}</td>
        <td>${u.campeao || '-'}</td>
        <td class="action-cell">
          <button onclick="openIABetsModal('${u.id}','${u.nome}')" class="btn btn-sm btn-primary">Gerenciar Apostas</button>
          <button onclick="setIAChampion('${u.id}','${u.nome}')" class="btn btn-sm btn-secondary">Definir Campeão</button>
        </td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;
}

async function openIABetsModal(userId, nome) {
  const modal = document.getElementById('modal');

  const [gamesRes, betsRes] = await Promise.all([
    apiGet('getGames'),
    apiPost('getUserBetsByName', { nome })
  ]);

  if (!gamesRes.success) return showToast('Erro ao carregar jogos', 'error');

  const games = gamesRes.games || [];
  const betsMap = {};
  if (betsRes.success) {
    (betsRes.bets || []).forEach(b => { betsMap[b.jogoId] = b; });
  }

  const rows = games.map(g => {
    const bet = betsMap[g.id];
    const v1 = bet ? bet.golTime1 : '';
    const v2 = bet ? bet.golTime2 : '';
    const closed = g.encerrado === true || String(g.encerrado).toUpperCase() === 'TRUE';
    return `<tr>
      <td>${g.fase}</td>
      <td>${g.time1} x ${g.time2}</td>
      <td class="score-inputs">
        <input type="number" id="ia-g1-${g.id}" class="score-input" min="0" max="99" value="${v1}" placeholder="-" ${closed ? 'style="opacity:0.5"' : ''}>
        <span>x</span>
        <input type="number" id="ia-g2-${g.id}" class="score-input" min="0" max="99" value="${v2}" placeholder="-" ${closed ? 'style="opacity:0.5"' : ''}>
      </td>
      <td><button onclick="saveIABet('${userId}','${g.id}')" class="btn btn-sm btn-primary">Salvar</button></td>
    </tr>`;
  }).join('');

  modal.innerHTML = `
    <div class="modal-content" style="max-width:680px;width:95%">
      <h3>🤖 Apostas de ${nome}</h3>
      <div style="max-height:60vh;overflow-y:auto;margin-top:16px">
        <table class="admin-table">
          <thead><tr><th>Fase</th><th>Jogo</th><th>Palpite</th><th></th></tr></thead>
          <tbody>${rows || '<tr><td colspan="4" class="empty-msg">Nenhum jogo cadastrado.</td></tr>'}</tbody>
        </table>
      </div>
      <div class="modal-actions">
        <button onclick="closeModal()" class="btn btn-secondary">Fechar</button>
      </div>
    </div>`;
  modal.style.display = 'flex';
}

async function saveIABet(userId, jogoId) {
  const g1 = document.getElementById(`ia-g1-${jogoId}`).value;
  const g2 = document.getElementById(`ia-g2-${jogoId}`).value;
  if (g1 === '' || g2 === '') return showToast('Preencha o placar', 'error');

  const res = await apiPost('adminSaveBetForUser', {
    ...Auth.credentials(), userId, jogoId,
    golTime1: Number(g1), golTime2: Number(g2)
  });
  if (!res.success) return showToast(res.error, 'error');
  showToast(`Aposta salva!`);
}

async function setIAChampion(userId, nome) {
  const countries = getAllCountries();
  const modal = document.getElementById('modal');

  modal.innerHTML = `
    <div class="modal-content">
      <h3>🏆 Campeão de ${nome}</h3>
      <div class="form-group" style="margin-top:16px">
        <label>País campeão</label>
        <select id="ia-champ-select">
          <option value="">Selecione...</option>
          ${countries.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
      <div class="modal-actions">
        <button onclick="saveIAChampion('${userId}')" class="btn btn-primary">Salvar</button>
        <button onclick="closeModal()" class="btn btn-secondary">Cancelar</button>
      </div>
    </div>`;
  modal.style.display = 'flex';
}

async function saveIAChampion(userId) {
  const campeao = document.getElementById('ia-champ-select').value;
  if (!campeao) return showToast('Selecione um país', 'error');
  const res = await apiPost('adminSetChampionForUser', { ...Auth.credentials(), userId, campeao });
  if (!res.success) return showToast(res.error, 'error');
  showToast('Campeão salvo!');
  closeModal();
  loadUsers();
}

async function updateUser(userId, status) {
  const res = await apiPost('adminApproveUser', { ...Auth.credentials(), userId, status });
  if (!res.success) return showToast(res.error, 'error');
  showToast('Usuário atualizado!');
  loadUsers();
}

async function resetPassword(userId, nome) {
  const nova = prompt(`Nova senha para ${nome}:`);
  if (!nova) return;
  if (nova.length < 4) return showToast('Senha muito curta (mín. 4 caracteres)', 'error');
  const hash = await sha256(nova);
  const res = await apiPost('adminResetPassword', { ...Auth.credentials(), userId, senhaHash: hash });
  if (!res.success) return showToast(res.error, 'error');
  showToast('Senha alterada!');
}

async function toggleAdmin(userId, isAdmin) {
  const res = await apiPost('adminApproveUser', { ...Auth.credentials(), userId, admin: isAdmin });
  if (!res.success) return showToast(res.error, 'error');
  showToast('Permissão atualizada!');
  loadUsers();
}

// ── Jogos ─────────────────────────────────────────────────────────────────────

async function loadGames() {
  const panel = document.getElementById('tab-jogos');
  const res = await apiGet('getGames');
  if (!res.success) { panel.innerHTML = `<p class="error">${res.error}</p>`; return; }
  allGames = res.games;

  const countries = getAllCountries();
  const countryOptions = countries.map(c => `<option value="${c}">${c}</option>`).join('');

  panel.innerHTML = `
    <div class="admin-form sync-bar">
      <div class="sync-info">
        <strong>Sincronizar com football-data.org</strong>
        <span class="config-hint">Importa jogos novos e atualiza placares de jogos encerrados automaticamente.</span>
      </div>
      <button onclick="syncAPI()" class="btn btn-primary" id="btn-sync">Sincronizar Agora</button>
    </div>
    <div class="admin-form">
      <h3>Adicionar Jogo</h3>
      <div class="form-row">
        <div class="form-group">
          <label>Fase</label>
          <select id="new-fase">
            <option>Grupos</option>
            <option>16avos</option>
            <option>Oitavas</option>
            <option>Quartas</option>
            <option>Semifinal</option>
            <option>Terceiro Lugar</option>
            <option>Final</option>
          </select>
        </div>
        <div class="form-group">
          <label>Time 1</label>
          <select id="new-time1">${countryOptions}</select>
        </div>
        <div class="form-group">
          <label>Time 2</label>
          <select id="new-time2">${countryOptions}</select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Data/Hora do Jogo</label>
          <input type="datetime-local" id="new-data" oninput="syncPrazoAposta(this.value)">
        </div>
        <div class="form-group">
          <label>Prazo para Apostas</label>
          <input type="datetime-local" id="new-prazo" oninput="this.dataset.manual='1'">
        </div>
      </div>
      <button onclick="addGame()" class="btn btn-primary">Adicionar Jogo</button>
    </div>
    <h3>Jogos Cadastrados</h3>
    ${renderGamesByPhase()}`;
}

function renderGamesByPhase() {
  if (!allGames.length) return '<p class="empty-msg">Nenhum jogo.</p>';

  const phaseOrder = ['Grupos', '16avos', 'Oitavas', 'Quartas', 'Semifinal', 'Terceiro Lugar', 'Final'];
  const byPhase = {};
  allGames.forEach(g => {
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

  return phases.map(fase => {
    const safeId = 'admin-' + fase.replace(/\s+/g, '-');
    const hasOpen = byPhase[fase].some(g => g.encerrado !== true && String(g.encerrado).toUpperCase() !== 'TRUE');
    const collapsed = !hasOpen;
    return `
      <div class="phase-section">
        <h2 class="phase-title phase-toggle" onclick="toggleAdminPhase('${safeId}')">
          <span id="icon-${safeId}">${collapsed ? '▸' : '▾'}</span> ${fase}
          <span class="phase-count">${byPhase[fase].length} jogo${byPhase[fase].length !== 1 ? 's' : ''}</span>
        </h2>
        <div class="games-list" id="grid-${safeId}" style="${collapsed ? 'display:none' : ''}">
          ${byPhase[fase].map(g => gameRow(g)).join('')}
        </div>
      </div>`;
  }).join('');
}

function toggleAdminPhase(safeId) {
  const grid = document.getElementById(`grid-${safeId}`);
  const icon = document.getElementById(`icon-${safeId}`);
  const collapsed = grid.style.display === 'none';
  grid.style.display = collapsed ? '' : 'none';
  icon.textContent = collapsed ? '▾' : '▸';
}

function gameRow(g) {
  const closed = g.encerrado === true || g.encerrado === 'TRUE';
  return `<div class="game-row-admin ${closed ? 'closed' : ''}">
    <div class="game-info">
      <span class="badge-fase">${g.fase}</span>
      <strong>${g.time1} x ${g.time2}</strong>
      <span class="game-dt">${formatDate(g.dataHora)}</span>
      <span>Prazo: ${formatDate(g.prazoAposta)}</span>
      ${closed ? '<span class="badge badge-result">Encerrado</span>' : ''}
    </div>
    <div class="game-actions">
      <button onclick="editGame('${g.id}')" class="btn btn-sm btn-secondary">Editar</button>
      ${!closed ? `<button onclick="closeGame('${g.id}')" class="btn btn-sm btn-danger">Encerrar</button>` : ''}
      <button onclick="deleteGame('${g.id}')" class="btn btn-sm btn-danger">Excluir</button>
    </div>
  </div>`;
}

async function syncAPI() {
  const btn = document.getElementById('btn-sync');
  btn.disabled = true;
  btn.textContent = 'Sincronizando...';
  const res = await apiPost('adminSyncAPI', Auth.credentials());
  btn.disabled = false;
  btn.textContent = 'Sincronizar Agora';
  if (!res.success) return showToast(res.error, 'error');
  showToast(`${res.jogos} | ${res.resultados}`);
  loadGames();
}

async function addGame() {
  const fase = document.getElementById('new-fase').value;
  const time1 = document.getElementById('new-time1').value;
  const time2 = document.getElementById('new-time2').value;
  const dataHora = document.getElementById('new-data').value;
  const prazoAposta = document.getElementById('new-prazo').value;

  if (!time1 || !time2 || !dataHora || !prazoAposta) return showToast('Preencha todos os campos', 'error');
  if (time1 === time2) return showToast('Times não podem ser iguais', 'error');

  const res = await apiPost('adminAddGame', {
    ...Auth.credentials(), fase, time1, time2, dataHora, prazoAposta
  });
  if (!res.success) return showToast(res.error, 'error');
  showToast('Jogo adicionado!');
  loadGames();
}

async function deleteGame(id) {
  if (!confirm('Excluir este jogo? As apostas associadas também serão removidas.')) return;
  const res = await apiPost('adminDeleteGame', { ...Auth.credentials(), id });
  if (!res.success) return showToast(res.error, 'error');
  showToast('Jogo excluído!');
  loadGames();
}

async function closeGame(id) {
  if (!confirm('Encerrar apostas para este jogo?')) return;
  const res = await apiPost('adminUpdateGame', { ...Auth.credentials(), id, encerrado: true });
  if (!res.success) return showToast(res.error, 'error');
  showToast('Jogo encerrado!');
  loadGames();
}

function toDatetimeLocal(val) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d)) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function editGame(id) {
  const game = allGames.find(g => g.id === id);
  if (!game) return;

  const countries = getAllCountries();

  const modal = document.getElementById('modal');
  const phases = ['Grupos', '16avos', 'Oitavas', 'Quartas', 'Semifinal', 'Terceiro Lugar', 'Final'];
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Editar Jogo</h3>
      <div class="form-group">
        <label>Fase</label>
        <select id="edit-fase">${phases.map(p => `<option value="${p}" ${p === game.fase ? 'selected' : ''}>${p}</option>`).join('')}</select>
      </div>
      <div class="form-group">
        <label>Time 1</label>
        <select id="edit-time1">${countries.map(c => `<option value="${c}" ${c === game.time1 ? 'selected' : ''}>${c}</option>`).join('')}</select>
      </div>
      <div class="form-group">
        <label>Time 2</label>
        <select id="edit-time2">${countries.map(c => `<option value="${c}" ${c === game.time2 ? 'selected' : ''}>${c}</option>`).join('')}</select>
      </div>
      <div class="form-group">
        <label>Data/Hora</label>
        <input type="datetime-local" id="edit-data" value="${toDatetimeLocal(game.dataHora)}">
      </div>
      <div class="form-group">
        <label>Prazo Apostas</label>
        <input type="datetime-local" id="edit-prazo" value="${toDatetimeLocal(game.prazoAposta)}">
      </div>
      <div class="modal-actions">
        <button onclick="saveEdit('${id}')" class="btn btn-primary">Salvar</button>
        <button onclick="closeModal()" class="btn btn-secondary">Cancelar</button>
      </div>
    </div>`;
  modal.style.display = 'flex';
}

async function saveEdit(id) {
  const res = await apiPost('adminUpdateGame', {
    ...Auth.credentials(), id,
    fase: document.getElementById('edit-fase').value,
    time1: document.getElementById('edit-time1').value,
    time2: document.getElementById('edit-time2').value,
    dataHora: document.getElementById('edit-data').value,
    prazoAposta: document.getElementById('edit-prazo').value
  });
  if (!res.success) return showToast(res.error, 'error');
  showToast('Jogo atualizado!');
  closeModal();
  loadGames();
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

// ── Resultados ────────────────────────────────────────────────────────────────

async function loadResultados() {
  const panel = document.getElementById('tab-resultados');
  const res = await apiGet('getGames');
  if (!res.success) { panel.innerHTML = `<p class="error">${res.error}</p>`; return; }

  const pending = res.games.filter(g => {
    const closed = g.encerrado === true || g.encerrado === 'TRUE';
    const hasResult = g.golTime1 !== null && g.golTime1 !== '';
    return closed && !hasResult;
  });
  const done = res.games.filter(g => g.golTime1 !== null && g.golTime1 !== '');

  panel.innerHTML = `
    <h3>Aguardando Resultado (${pending.length})</h3>
    ${pending.length ? pending.map(g => resultForm(g)).join('') : '<p class="empty-msg">Nenhum jogo aguardando resultado.</p>'}
    <h3>Resultados Registrados (${done.length})</h3>
    <div class="results-done">
      ${done.map(g => `<div class="result-row">
        <span class="badge-fase">${g.fase}</span>
        <strong>${g.time1} ${g.golTime1} x ${g.golTime2} ${g.time2}</strong>
      </div>`).join('')}
    </div>`;
}

function resultForm(game) {
  return `<div class="result-form">
    <div class="result-teams">
      ${getFlagImg(game.time1, 'flag-sm')} <strong>${game.time1}</strong>
      <span class="score-inputs">
        <input type="number" id="r1-${game.id}" class="score-input" min="0" max="99" placeholder="-">
        <span>x</span>
        <input type="number" id="r2-${game.id}" class="score-input" min="0" max="99" placeholder="-">
      </span>
      <strong>${game.time2}</strong> ${getFlagImg(game.time2, 'flag-sm')}
    </div>
    <button onclick="setResult('${game.id}')" class="btn btn-primary btn-sm">Registrar Resultado</button>
  </div>`;
}

async function setResult(id) {
  const r1 = document.getElementById(`r1-${id}`);
  const r2 = document.getElementById(`r2-${id}`);
  if (!r1 || !r2 || r1.value === '' || r2.value === '') return showToast('Preencha o placar', 'error');

  const res = await apiPost('adminSetResult', {
    ...Auth.credentials(), id,
    golTime1: Number(r1.value),
    golTime2: Number(r2.value)
  });
  if (!res.success) return showToast(res.error, 'error');
  showToast('Resultado registrado!');
  loadResultados();
}

// ── Config ────────────────────────────────────────────────────────────────────

async function loadConfig() {
  const panel = document.getElementById('tab-config');
  const res = await apiGet('getConfig');
  if (!res.success) { panel.innerHTML = `<p class="error">${res.error}</p>`; return; }
  config = res.config;

  const boolToggle = (key, label, hint) => {
    const val = config[key] === true || String(config[key]).toUpperCase() === 'TRUE';
    return `<div class="config-item">
      <div>
        <strong>${label}</strong>
        <p class="config-hint">${hint}</p>
      </div>
      <label class="toggle">
        <input type="checkbox" ${val ? 'checked' : ''} onchange="toggleConfig('${key}', this.checked)">
        <span class="toggle-slider"></span>
      </label>
    </div>`;
  };

  const countries = getAllCountries();

  panel.innerHTML = `
    <div class="config-section">
      <h3>Apostas</h3>
      ${boolToggle('apostas_campeonato_abertas', 'Apostas no Campeão Abertas', 'Permite que usuários escolham (ou alterem) seu palpite de campeão.')}
    </div>
    <div class="config-section">
      <h3>Ranking</h3>
      ${boolToggle('campeao_revelado', 'Revelar Palpites de Campeão', 'Exibe a coluna de campeão na tabela de ranking.')}
      ${boolToggle('apostas_visiveis', 'Palpites Visíveis no Ranking', 'Permite que qualquer usuário veja os palpites detalhados de todos clicando no nome no ranking.')}
      <div class="config-item">
        <div>
          <strong>Campeão Final</strong>
          <p class="config-hint">Informe o campeão real para contabilizar os pontos.</p>
        </div>
        <div class="config-right">
          <select id="final-champ" class="config-select">
            <option value="">Selecione...</option>
            ${countries.map(c => `<option value="${c}" ${config.campeao_final === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
          <button onclick="saveFinalChamp()" class="btn btn-primary btn-sm">Salvar</button>
        </div>
      </div>
    </div>
    <div class="config-section">
      <h3>Setup Inicial (use apenas uma vez)</h3>
      <div class="config-item">
        <div>
          <strong>Criar Administrador</strong>
          <p class="config-hint">Use se ainda não houver admin no sistema.</p>
        </div>
        <div class="config-right">
          <input type="text" id="setup-nome" placeholder="Nome do admin" class="config-input">
          <input type="password" id="setup-senha" placeholder="Senha" class="config-input">
          <button onclick="setupAdmin()" class="btn btn-secondary btn-sm">Criar</button>
        </div>
      </div>
    </div>`;
}

async function toggleConfig(key, val) {
  const res = await apiPost('adminUpdateConfig', {
    ...Auth.credentials(), key, value: val ? 'TRUE' : 'FALSE'
  });
  if (!res.success) return showToast(res.error, 'error');
  showToast('Configuração salva!');
}

async function saveFinalChamp() {
  const val = document.getElementById('final-champ').value;
  if (!val) return showToast('Selecione o campeão', 'error');
  const res = await apiPost('adminUpdateConfig', {
    ...Auth.credentials(), key: 'campeao_final', value: val
  });
  if (!res.success) return showToast(res.error, 'error');
  showToast('Campeão final salvo!');
}

async function setupAdmin() {
  const nome = document.getElementById('setup-nome').value.trim();
  const senha = document.getElementById('setup-senha').value;
  const msg = document.getElementById('setup-msg');
  if (!nome || !senha) { msg.textContent = 'Preencha nome e senha.'; msg.style.color = 'red'; return; }
  const hash = await sha256(senha);
  const res = await apiPost('adminSetup', { nome, senha: hash });
  if (!res.success) { msg.textContent = res.error; msg.style.color = 'red'; return; }
  msg.textContent = 'Admin criado! Faça login agora.';
  msg.style.color = 'green';
  setTimeout(() => window.location.href = 'index.html', 1500);
}

document.addEventListener('DOMContentLoaded', init);
