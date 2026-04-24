const SPECIES_NAME_BY_CODE = {
  saran_ljuskas: 'Šaran (ljuskaš)',
  saran_goli: 'Šaran (goli)',
  amur: 'Amur',
  som: 'Som',
  tolstolobik: 'Tolstolobik',
  linjak: 'Linjak',
  smud: 'Smuđ',
  stuka: 'Štuka'
};

const LEGACY_TEXT_REPLACEMENTS = [
  ['??', 'Š'],
  ['?aran', 'Šaran'],
  ['?tuka', 'Štuka'],
  ['smu?', 'Smuđ'],
  ['Å¡', 'š'],
  ['Å½', 'Ž'],
  ['Å¾', 'ž'],
  ['Ä‘', 'đ'],
  ['Ä', 'Đ'],
  ['Ä', 'č'],
  ['Ä', 'Č'],
  ['Ä‡', 'ć'],
  ['Ä', 'Ć']
];

function normalizeLegacyText(value) {
  if (!value) {
    return '';
  }

  return LEGACY_TEXT_REPLACEMENTS.reduce(
    (normalized, [source, target]) => normalized.split(source).join(target),
    String(value).trim()
  );
}


function resolveCustomSpeciesCode(code) {
  const legacyRandomPattern = /^custom_species_\d+_[a-z0-9]+$/;
  if (legacyRandomPattern.test(code)) {
    return 'Unesena vrsta';
  }

  if (!code.startsWith('custom_species_')) {
    return null;
  }

  const customValue = code.replace(/^custom_species_/, '');
  if (!customValue) {
    return 'Unesena vrsta';
  }

  return customValue
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}
function titleCaseFromCode(code) {
  return code
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

export function resolveSpeciesName(speciesCode, speciesLabel) {
  const normalizedCode = String(speciesCode ?? '').trim().toLowerCase();
  if (normalizedCode && SPECIES_NAME_BY_CODE[normalizedCode]) {
    return SPECIES_NAME_BY_CODE[normalizedCode];
  }

  const normalizedLabel = normalizeLegacyText(speciesLabel);
  if (normalizedLabel) {
    return normalizedLabel;
  }

  const customSpeciesName = resolveCustomSpeciesCode(normalizedCode);
  if (customSpeciesName) {
    return customSpeciesName;
  }

  if (normalizedCode) {
    return titleCaseFromCode(normalizedCode);
  }

  return 'Nepoznata vrsta';
}
