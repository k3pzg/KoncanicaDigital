const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

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
    'izlov cannot reduce stock below zero': 'Izlov ne može smanjiti stanje ispod nule.',
    'Database unavailable': 'Baza podataka nije dostupna. Provjerite da je MySQL pokrenut.'
  };

  return map[message] ?? message;
}

function buildApiUrl(path) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
}

async function parseResponseBody(response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    return text ? { message: text } : null;
  }

  return response.json();
}

export async function apiRequest(path, options = {}) {
  const { headers: customHeaders, ...restOptions } = options;
  let response;

  try {
    response = await fetch(buildApiUrl(path), {
      ...restOptions,
      headers: {
        'Content-Type': 'application/json',
        ...(customHeaders ?? {})
      }
    });
  } catch {
    throw new Error('API poslužitelj nije dostupan. Provjerite da je backend pokrenut.');
  }

  const data = await parseResponseBody(response);

  if (!response.ok) {
    throw new Error(translateBackendMessage(data?.message));
  }

  return data;
}
