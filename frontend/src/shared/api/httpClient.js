const API_BASE_URL = 'http://localhost:3001';

function translateBackendMessage(message) {
  if (!message) {
    return 'Zahtjev nije uspio.';
  }

  const map = {
    'Unauthorized': 'Niste prijavljeni ili je sesija istekla.',
    'Invalid credentials': 'Neispravno korisničko ime ili lozinka.',
    'Not found': 'Traženi zapis nije pronađen.',
    'code is required': 'Polje šifra je obavezno.',
    'object_type is required': 'Vrsta objekta je obavezna.',
    'water_object_id is required': 'Vodni objekt je obavezan.',
    'event_date is required': 'Datum događaja je obavezan.',
    'control_date is required': 'Datum kontrole je obavezan.',
    'species_id is required': 'Vrsta ribe je obavezna.',
    'category_id is required': 'Kategorija je obavezna.',
    'at least one control line is required': 'Potreban je barem jedan redak kontrole.',
    'izlov cannot reduce stock below zero': 'Izlov ne može smanjiti stanje ispod nule.'
  };

  return map[message] ?? message;
}

export async function apiRequest(path, options = {}) {
  const { headers: customHeaders, ...restOptions } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(customHeaders ?? {})
    }
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(translateBackendMessage(data.message));
  }

  return data;
}
