function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setupNav() {
  const user = Auth.get();
  const nav = document.getElementById('nav');
  if (!nav || !user) return;

  const isAdmin = user.admin === true || String(user.admin).toUpperCase() === 'TRUE';
  const adminLink = isAdmin ? `<a href="admin.html">Admin</a>` : '';
  nav.innerHTML = `
    <div class="nav-brand">
      <img src="images/simbolo_negativo.png" alt="URI" class="nav-logo">
      <span>Bolão dos "Entendidos"</span>
    </div>
    <div class="nav-links">
      <a href="apostas.html">Apostas</a>
      <a href="ranking.html">Ranking</a>
      ${adminLink}
    </div>
    <div class="nav-user">
      <span class="nav-username">${escapeHtml(user.nome)}</span>
      <button onclick="Auth.logout()" class="btn-logout">Sair</button>
    </div>
  `;

  const current = window.location.pathname.split('/').pop();
  nav.querySelectorAll('a').forEach(a => {
    if (a.getAttribute('href') === current) a.classList.add('active');
  });
}

function showToast(msg, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function formatDate(str) {
  if (!str) return '-';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function isDeadlinePassed(prazo) {
  if (!prazo) return false;
  return new Date() > new Date(prazo);
}

function timeUntil(prazo) {
  const diff = new Date(prazo) - new Date();
  if (diff <= 0) return 'Encerrado';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 48) return `${Math.floor(h/24)} dias`;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function loading(el, show) {
  if (show) {
    el.disabled = true;
    el.dataset.orig = el.textContent;
    el.textContent = 'Aguarde...';
  } else {
    el.disabled = false;
    el.textContent = el.dataset.orig || el.textContent;
  }
}
