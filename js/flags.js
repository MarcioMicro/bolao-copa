const FLAG_CODES = {
  'Brasil': 'br', 'Argentina': 'ar', 'França': 'fr', 'Espanha': 'es',
  'Alemanha': 'de', 'Portugal': 'pt', 'Inglaterra': 'gb-eng',
  'Holanda': 'nl', 'Bélgica': 'be', 'Uruguai': 'uy', 'México': 'mx',
  'Estados Unidos': 'us', 'EUA': 'us', 'Canadá': 'ca', 'Japão': 'jp',
  'Coreia do Sul': 'kr', 'Marrocos': 'ma', 'Austrália': 'au',
  'Croácia': 'hr', 'Suíça': 'ch', 'Senegal': 'sn', 'Gana': 'gh',
  'Equador': 'ec', 'Sérvia': 'rs', 'Polônia': 'pl', 'Camarões': 'cm',
  'Tunísia': 'tn', 'Costa Rica': 'cr', 'Panamá': 'pa', 'Jamaica': 'jm',
  'Venezuela': 've', 'Colômbia': 'co', 'Chile': 'cl', 'Peru': 'pe',
  'Paraguai': 'py', 'Bolívia': 'bo', 'Arábia Saudita': 'sa', 'Irã': 'ir',
  'Catar': 'qa', 'Nova Zelândia': 'nz', 'China': 'cn', 'Indonésia': 'id',
  'Áustria': 'at', 'Dinamarca': 'dk', 'Eslováquia': 'sk', 'Eslovênia': 'si',
  'Geórgia': 'ge', 'Hungria': 'hu', 'Romênia': 'ro', 'Turquia': 'tr',
  'Ucrânia': 'ua', 'Itália': 'it', 'Noruega': 'no', 'Suécia': 'se',
  'Escócia': 'gb-sct', 'País de Gales': 'gb-wls', 'Irlanda': 'ie',
  'Nigéria': 'ng', 'Egito': 'eg', 'Costa do Marfim': 'ci',
  'África do Sul': 'za', 'Argélia': 'dz', 'Angola': 'ao',
  'Cabo Verde': 'cv', 'Honduras': 'hn', 'El Salvador': 'sv',
  'Guatemala': 'gt', 'Trinidad e Tobago': 'tt', 'Cuba': 'cu',
  'Haiti': 'ht', 'República Dominicana': 'do', 'Albânia': 'al',
  'Grécia': 'gr', 'Iraque': 'iq', 'Jordânia': 'jo', 'Kuwait': 'kw',
  'Emirados Árabes': 'ae', 'EAU': 'ae', 'Filipinas': 'ph',
  'Tailândia': 'th', 'Vietnã': 'vn', 'Malásia': 'my', 'Índia': 'in',
  'Guiana': 'gy', 'Suriname': 'sr', 'Fiji': 'fj',
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
  return Object.keys(FLAG_CODES).sort();
}
