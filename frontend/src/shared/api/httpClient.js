// Build-time variable takes priority (set via VITE_API_BASE_URL in Railway service variables)
let API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// If not set at build time, detect the correct backend URL at runtime
if (!API_BASE_URL) {
  const hostname = window.location.hostname;
  if (hostname.includes('railway.app')) {
    // Running on Railway — route to the backend service's public domain
    API_BASE_URL = 'https://backend-api.up.railway.app';
  } else {
    // Local development — the Vite dev server proxies API calls, so no prefix needed
    API_BASE_URL = '';
  }
}

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
    'Database unavailable': 'Baza podataka nije dostupna. Provjerite da je MySQL pokrenut.',
    'feed_type_id or new_feed_type_name is required': 'Vrsta hrane je obavezna.',
    'quantity_kg is required': 'Količina hrane je obavezna.',
    'quantity_kg must be greater than zero': 'Količina mora biti veća od nule.',
    'receipt_date is required': 'Datum primitka je obavezan.',
    'water_object_id is required': 'Vodni objekt je obavezan.',
    'event_date is required': 'Datum hranjenja je obavezan.',
    'feed_type_already_exists': 'Vrsta hrane s tim nazivom već postoji.',
    'name is required': 'Naziv vrste hrane je obavezan.',
    'name is too long': 'Naziv vrste hrane je predugačak (max. 100 znakova).'
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
