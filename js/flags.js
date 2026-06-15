const FLAG_CODES = {
  'África do Sul': 'za', 'Alemanha': 'de', 'Arábia Saudita': 'sa',
  'Argélia': 'dz', 'Argentina': 'ar', 'Austrália': 'au', 'Áustria': 'at',
  'Bélgica': 'be', 'Bósnia e Herzegovina': 'ba', 'Brasil': 'br',
  'Cabo Verde': 'cv', 'Canadá': 'ca', 'Catar': 'qa', 'Colômbia': 'co',
  'Coreia do Sul': 'kr', 'Costa do Marfim': 'ci', 'Croácia': 'hr',
  'Curaçao': 'cw', 'Egito': 'eg', 'Equador': 'ec', 'Escócia': 'gb-sct',
  'Espanha': 'es', 'Estados Unidos': 'us', 'França': 'fr', 'Gana': 'gh',
  'Haiti': 'ht', 'Holanda': 'nl', 'Inglaterra': 'gb-eng', 'Irã': 'ir',
  'Iraque': 'iq', 'Japão': 'jp', 'Jordânia': 'jo', 'Marrocos': 'ma',
  'México': 'mx', 'Noruega': 'no', 'Nova Zelândia': 'nz', 'Panamá': 'pa',
  'Paraguai': 'py', 'Portugal': 'pt', 'RD do Congo': 'cd',
  'República Tcheca': 'cz', 'Senegal': 'sn', 'Suécia': 'se', 'Suíça': 'ch',
  'Tunísia': 'tn', 'Turquia': 'tr', 'Uruguai': 'uy', 'Uzbequistão': 'uz',
};

function getFlagUrl(country, size = 40) {
  const code = FLAG_CODES[country];
  if (!code) return null;
  return `https://flagcdn.com/w${size}/${code}.png`;
}

function getFlagImg(country, cssClass = 'flag-img') {
  const url = getFlagUrl(country);
  if (!url) return `<span class="flag-placeholder">${country.charAt(0)}</span>`;
  return `<img src="${url}" alt="${country}" class="${cssClass}" onerror="this.style.display='none'">`;
}

function getAllCountries() {
  return Object.keys(FLAG_CODES).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
