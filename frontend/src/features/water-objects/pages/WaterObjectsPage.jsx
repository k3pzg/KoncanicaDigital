import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/state/AuthContext';
import {
  createWaterObjectRequest,
  deleteWaterObjectRequest,
  listWaterObjectsRequest,
  updateWaterObjectRequest
} from '../api/waterObjectsApi';
import { WaterObjectsMap } from '../components/WaterObjectsMap';

const objectTypes = ['ribnjak', 'bazen', 'kanal', 'zimovnik', 'rastiliste', 'maticnjak'];

function formatDecimal(value, digits = 2) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return '-';
  }

  return parsed.toLocaleString('hr-HR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function formatArea(value) {
  return value === null || value === undefined || value === '' ? '-' : `${formatDecimal(value)} m²`;
}

function formatAreaHa(value) {
  return value === null || value === undefined || value === '' ? '-' : `${formatDecimal(value)} ha`;
}

function formatCentimeters(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return '-';
  }

  return `${parsed.toLocaleString('hr-HR', { maximumFractionDigits: 0 })} cm`;
}

function formatDepth(value) {
  return value === null || value === undefined || value === '' ? '-' : `${formatDecimal(value)} m`;
}

function formatVolume(value) {
  return value === null || value === undefined || value === '' ? '-' : `${formatDecimal(value)} m³`;
}

function getWaterLevelStatus(note) {
  const normalized = String(note ?? '').toLowerCase();

  if (normalized.includes('prazan')) {
    return { label: 'Kritično', className: 'water-level-status critical' };
  }

  if (normalized.includes('potrebno') || normalized.includes('pražnjenje')) {
    return { label: 'Upozorenje', className: 'water-level-status warning' };
  }

  if (normalized.includes('punjenje')) {
    return { label: 'Info', className: 'water-level-status info' };
  }

  return { label: 'Bez statusa', className: 'water-level-status neutral' };
}

function normalizePolygonGeojsonForTextarea(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '';
  }
}

const initialForm = {
  code: '',
  object_type: 'ribnjak',
  area_total_m2: '',
  area_productive_m2: '',
  max_depth_m: '',
  max_volume_m3: '',
  is_active: true,
  notes: '',
  centroid_wkt: '',
  polygon_geojson: ''
};

export function WaterObjectsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');

  async function loadItems() {
    const result = await listWaterObjectsRequest(token);
    const sortedItems = [...(result.items ?? [])].sort((left, right) => (
      String(left.code ?? '').localeCompare(String(right.code ?? ''), 'hr-HR', { numeric: true })
    ));
    setItems(sortedItems);
  }

  useEffect(() => {
    loadItems();
  }, []);

  const submitLabel = useMemo(() => (editingId ? 'Spremi promjene' : 'Dodaj vodni objekt'), [editingId]);

  function handleFieldChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const normalizedCode = form.code.trim();
    if (!normalizedCode) {
      setError('Polje šifra je obavezno.');
      return;
    }

    try {
      const payload = {
        ...form,
        code: normalizedCode,
        is_active: Boolean(form.is_active)
      };

      if (editingId) {
        await updateWaterObjectRequest(token, editingId, payload);
      } else {
        await createWaterObjectRequest(token, payload);
      }

      setForm(initialForm);
      setEditingId(null);
      await loadItems();
    } catch (submitError) {
      setError(submitError.message || 'Greška pri spremanju vodnog objekta.');
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      code: item.code ?? '',
      object_type: item.object_type ?? 'ribnjak',
      area_total_m2: item.area_total_m2 ?? '',
      area_productive_m2: item.area_productive_m2 ?? '',
      max_depth_m: item.max_depth_m ?? '',
      max_volume_m3: item.max_volume_m3 ?? '',
      is_active: Boolean(item.is_active),
      notes: item.notes ?? '',
      centroid_wkt: item.centroid_wkt ?? '',
      polygon_geojson: normalizePolygonGeojsonForTextarea(item.polygon_geojson)
    });
  }

  async function handleDelete(id) {
    await deleteWaterObjectRequest(token, id);
    if (editingId === id) {
      setEditingId(null);
      setForm(initialForm);
    }
    await loadItems();
  }

  return (
    <div className="water-objects-grid">
      <section className="card">
        <h2>Vodni objekti</h2>
        {error ? <p className="error-text">{error}</p> : null}
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Šifra
            <input
              name="code"
              value={form.code}
              onChange={handleFieldChange}
              required
            />
          </label>
          <label>
            Vrsta objekta
            <select name="object_type" value={form.object_type} onChange={handleFieldChange}>
              {objectTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ukupna površina (m²)
            <input name="area_total_m2" value={form.area_total_m2} onChange={handleFieldChange} />
          </label>
          <label>
            Produktivna površina (m²)
            <input name="area_productive_m2" value={form.area_productive_m2} onChange={handleFieldChange} />
          </label>
          <label>
            Maksimalna dubina (m)
            <input name="max_depth_m" value={form.max_depth_m} onChange={handleFieldChange} />
          </label>
          <label>
            Maksimalni volumen (m³)
            <input name="max_volume_m3" value={form.max_volume_m3} onChange={handleFieldChange} />
          </label>
          <label>
            Centroid (WKT)
            <textarea name="centroid_wkt" value={form.centroid_wkt} onChange={handleFieldChange} />
          </label>
          <label>
            Poligon (GeoJSON)
            <textarea name="polygon_geojson" value={form.polygon_geojson} onChange={handleFieldChange} />
          </label>
          <label>
            Napomena
            <textarea name="notes" value={form.notes} onChange={handleFieldChange} />
          </label>
          <label>
            <input name="is_active" type="checkbox" checked={form.is_active} onChange={handleFieldChange} /> Aktivan
          </label>
          <button type="submit">{submitLabel}</button>
        </form>
      </section>

      <section className="card water-objects-list-card">
        <h3>Lista objekata</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Šifra</th>
                <th>Tip</th>
                <th>Ukupna površina</th>
                <th>Produktivna površina</th>
                <th>Površina ha</th>
                <th>Puni cm</th>
                <th>Trenutni cm</th>
                <th>Nedostaje cm</th>
                <th>Napomena vodostaja</th>
                <th>Akcije</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const waterLevel = item.latest_water_level_measurement;
                const status = getWaterLevelStatus(waterLevel?.note);

                return (
                  <tr key={item.id}>
                    <td><strong>{item.code}</strong></td>
                    <td>{item.object_type ?? '-'}</td>
                    <td>{formatArea(item.area_total_m2)}</td>
                    <td>{formatArea(item.area_productive_m2)}</td>
                    <td>{formatAreaHa(waterLevel?.area_ha)}</td>
                    <td>{formatCentimeters(waterLevel?.water_level_full_cm)}</td>
                    <td>{formatCentimeters(waterLevel?.water_level_current_cm)}</td>
                    <td>{formatCentimeters(waterLevel?.water_level_missing_cm)}</td>
                    <td>
                      <span className={status.className}>{status.label}</span>
                      <span className="water-level-note-text">{waterLevel?.note || '-'}</span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link to={`/app/ponds/${item.id}`} className="btn-link-action">
                          Detalji
                        </Link>
                        <button type="button" onClick={() => startEdit(item)}>
                          Uredi
                        </button>
                        <button type="button" onClick={() => handleDelete(item.id)}>
                          Obriši
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <WaterObjectsMap items={items} selectedObjectId={editingId} />
    </div>
  );
}
