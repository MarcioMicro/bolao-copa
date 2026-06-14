const Auth = {
  KEY: 'bolao_user',

  save(user) {
    localStorage.setItem(this.KEY, JSON.stringify(user));
  },

  get() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY));
    } catch {
      return null;
    }
  },

  logout() {
    localStorage.removeItem(this.KEY);
    window.location.href = 'index.html';
  },

  requireLogin() {
    const user = this.get();
    if (!user) { window.location.href = 'index.html'; return null; }
    return user;
  },

  requireAdmin() {
    const user = this.get();
    if (!user || (user.admin !== true && String(user.admin).toUpperCase() !== 'TRUE')) {
      window.location.href = 'index.html';
      return null;
    }
    return user;
  },

  credentials() {
    const user = this.get();
    if (!user) return {};
    return { nome: user.nome, senha: user.senhaHash };
  }
};
