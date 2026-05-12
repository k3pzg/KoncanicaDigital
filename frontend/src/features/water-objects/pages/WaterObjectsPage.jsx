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

const OBJECT_TYPES = ['ribnjak', 'bazen', 'kanal', 'zimovnik', 'rastiliste', 'maticnjak'];

const OBJECT_TYPE_LABELS = {
  ribnjak: 'Ribnjak',
  bazen: 'Bazen',
  kanal: 'Kanal',
  zimovnik: 'Zimovnik',
  rastiliste: 'Rastiliste',
  maticnjak: 'Maticnjak'
};

function formatDecimal(value, digits = 2) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '-';
  return parsed.toLocaleString('hr-HR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function formatArea(value) {
  if (value === null || value === undefined || value === '') return '-';
  return `${formatDecimal(value)} m²`;
}

function formatDepth(value) {
  if (value === null || value === undefined || value === '') return '-';
  return `${formatDecimal(value)} m`;
}

function formatVolume(value) {
  if (value === null || value === undefined || value === '') return '-';
  return `${formatDecimal(value)} m³`;
}

function getWaterLevelStatus(measurement) {
  if (!measurement) return { label: 'Nema podataka', className: 'water-level-status neutral' };
  const note = String(measurement.note ?? '').toLowerCase();
  if (note.includes('prazan')) return { label: 'Kritično', className: 'water-level-status critical' };
  if (note.includes('potrebno') || note.includes('pražnjenje')) return { label: 'Upozorenje', className: 'water-level-status warning' };
  if (note.includes('punjenje')) return { label: 'Punjenje', className: 'water-level-status info' };
  const missing = Number(measurement.water_level_missing_cm);
  if (Number.isFinite(missing) && missing < -75) return { label: 'Nizak', className: 'water-level-status warning' };
  if (Number.isFinite(missing)) return { label: 'Uredu', className: 'water-level-status good' };
  return { label: 'Nema podataka', className: 'water-level-status neutral' };
}

function normalizePolygonGeojsonForTextarea(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value, null, 2); } catch { return ''; }
}

function autoVolume(area, depth) {
  const a = Number(area);
  const d = Number(depth);
  if (Number.isFinite(a) && a > 0 && Number.isFinite(d) && d > 0) {
    return (a * d).toFixed(2);
  }
  return '';
}

const INITIAL_FORM = {
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
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  async function loadItems() {
    const result = await listWaterObjectsRequest(token);
    const sorted = [...(result.items ?? [])].sort((a, b) =>
      String(a.code ?? '').localeCompare(String(b.code ?? ''), 'hr-HR', { numeric: true })
    );
    setItems(sorted);
  }

  useEffect(() => { loadItems(); }, []);

  const isFormVisible = showAddForm || editingId !== null;
  const submitLabel = useMemo(() => (editingId ? 'Spremi promjene' : 'Dodaj vodni objekt'), [editingId]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const typeLabel = (OBJECT_TYPE_LABELS[item.object_type] ?? item.object_type ?? '').toLowerCase();
      return (
        (item.code ?? '').toLowerCase().includes(q) ||
        typeLabel.includes(q)
      );
    });
  }, [items, searchQuery]);

  function handleFieldChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => {
      const next = { ...prev, [name]: type === 'checkbox' ? checked : value };
      // Auto-calculate volume from area × depth
      if (name === 'area_total_m2' || name === 'max_depth_m') {
        const area = name === 'area_total_m2' ? value : prev.area_total_m2;
        const depth = name === 'max_depth_m' ? value : prev.max_depth_m;
        const vol = autoVolume(area, depth);
        if (vol) next.max_volume_m3 = vol;
      }
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    const normalizedCode = form.code.trim();
    if (!normalizedCode) { setError('Polje šifra je obavezno.'); return; }
    try {
      const payload = { ...form, code: normalizedCode, is_active: Boolean(form.is_active) };
      if (editingId) {
        await updateWaterObjectRequest(token, editingId, payload);
      } else {
        await createWaterObjectRequest(token, payload);
      }
      setForm(INITIAL_FORM);
      setEditingId(null);
      setShowAddForm(false);
      setError('');
      await loadItems();
    } catch (err) {
      setError(err.message || 'Greška pri spremanju vodnog objekta.');
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setShowAddForm(false);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelForm() {
    setEditingId(null);
    setShowAddForm(false);
    setForm(INITIAL_FORM);
    setError('');
  }

  async function handleDelete(id) {
    if (!window.confirm('Jeste li sigurni da želite obrisati ovaj vodni objekt?')) return;
    await deleteWaterObjectRequest(token, id);
    if (editingId === id) cancelForm();
    await loadItems();
  }

  function handlePolygonDrawn(geojsonStr, centroidWkt) {
    setForm((prev) => ({
      ...prev,
      polygon_geojson: geojsonStr,
      centroid_wkt: centroidWkt || prev.centroid_wkt
    }));
  }

  const editingItem = editingId ? items.find((i) => i.id === editingId) : null;

  return (
    <div className="water-objects-grid">

      {/* Add / edit form */}
      {!editingId && (
        <button
          type="button"
          className="collapsible-panel-toggle"
          aria-expanded={showAddForm}
          onClick={() => setShowAddForm((v) => !v)}
        >
          {showAddForm ? '− Zatvori' : '+ Dodaj novi vodni objekt'}
        </button>
      )}

      {isFormVisible && (
        <section className="card">
          <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.05rem', fontWeight: 700 }}>
            {editingId ? `Uređivanje: ${editingItem?.code ?? ''}` : 'Novi vodni objekt'}
          </h2>
          {error ? <p className="error-text" style={{ marginBottom: '0.75rem' }}>{error}</p> : null}
          <form className="water-obj-form" onSubmit={handleSubmit}>
            <label>
              Šifra *
              <input name="code" value={form.code} onChange={handleFieldChange} required />
            </label>
            <label>
              Vrsta objekta
              <select name="object_type" value={form.object_type} onChange={handleFieldChange}>
                {OBJECT_TYPES.map((t) => (
                  <option key={t} value={t}>{OBJECT_TYPE_LABELS[t] ?? t}</option>
                ))}
              </select>
            </label>
            <label>
              Ukupna površina (m²)
              <input name="area_total_m2" type="number" step="any" value={form.area_total_m2} onChange={handleFieldChange} />
            </label>
            <label>
              Produktivna površina (m²)
              <input name="area_productive_m2" type="number" step="any" value={form.area_productive_m2} onChange={handleFieldChange} />
            </label>
            <label>
              Maksimalna dubina (m)
              <input name="max_depth_m" type="number" step="any" value={form.max_depth_m} onChange={handleFieldChange} />
            </label>
            <label>
              Maksimalni volumen (m³)
              <input
                name="max_volume_m3"
                type="number"
                step="any"
                value={form.max_volume_m3}
                onChange={handleFieldChange}
                placeholder="Automatski iz površina × dubina"
              />
            </label>

            {/* Geometry / admin fields */}
            <details className="field-full" style={{ marginTop: '0.25rem' }}>
              <summary style={{ cursor: 'pointer', fontSize: '0.82rem', color: 'var(--color-text-muted)', fontWeight: 600, userSelect: 'none' }}>
                Geometrija i napomena
                {form.polygon_geojson ? ' (poligon postavljen)' : ''}
              </summary>
              <div className="water-obj-form" style={{ marginTop: '0.75rem' }}>
                <label className="field-full">
                  Centroid (WKT)
                  <textarea name="centroid_wkt" value={form.centroid_wkt} onChange={handleFieldChange} rows={2} />
                </label>
                <label className="field-full">
                  Poligon (GeoJSON) — ili nacrtajte na karti ispod
                  <textarea name="polygon_geojson" value={form.polygon_geojson} onChange={handleFieldChange} rows={3} />
                </label>
                <label className="field-full">
                  Napomena
                  <textarea name="notes" value={form.notes} onChange={handleFieldChange} rows={2} />
                </label>
                <label
                  className="field-full"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', display: 'flex' }}
                >
                  <input
                    name="is_active"
                    type="checkbox"
                    checked={form.is_active}
                    onChange={handleFieldChange}
                    style={{ width: 'auto' }}
                  />
                  Aktivan
                </label>
              </div>
            </details>

            <div className="water-obj-form-actions">
              <button type="submit" className="btn btn--primary">{submitLabel}</button>
              <button type="button" className="btn" onClick={cancelForm}>
                Odustani
              </button>
            </div>

            {/* Delete — only in edit mode, separated as danger action */}
            {editingId && (
              <div className="field-full" style={{ borderTop: '1px solid var(--color-danger-border)', paddingTop: '0.75rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                  type="button"
                  className="btn btn--sm btn--danger"
                  onClick={() => handleDelete(editingId)}
                >
                  Obriši ovaj objekt
                </button>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Radnja je nepovratna.
                </span>
              </div>
            )}
          </form>
        </section>
      )}

      {/* Objects table */}
      <section className="card water-objects-list-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
            Vodni objekti
            <span style={{ marginLeft: '0.5rem', fontWeight: 400, fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
              ({filteredItems.length}{filteredItems.length !== items.length ? ` / ${items.length}` : ''})
            </span>
          </h3>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pretraži šifru ili tip..."
            style={{ width: 'auto', minWidth: '190px', fontSize: '0.875rem', padding: '0.35rem 0.6rem' }}
            aria-label="Pretraži vvodne objekte"
          />
        </div>
        <div className="table-wrap">
          <table className="water-objects-table">
            <thead>
              <tr>
                <th>Šifra</th>
                <th>Tip</th>
                <th>Površina ukupna</th>
                <th>Maks. dubina</th>
                <th>Vol. max.</th>
                <th>Vodostaj</th>
                <th>Akcije</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const wl = item.latest_water_level_measurement;
                const status = getWaterLevelStatus(wl);
                const isEditing = item.id === editingId;

                return (
                  <tr key={item.id} style={isEditing ? { background: '#eff6ff' } : undefined}>
                    <td>
                      <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{item.code}</strong>
                      {!item.is_active && (
                        <span style={{ marginLeft: '0.4rem', fontSize: '0.72rem', color: 'var(--color-text-light)' }}>neaktivan</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                      {OBJECT_TYPE_LABELS[item.object_type] ?? item.object_type ?? '-'}
                    </td>
                    <td className="numeric-cell">{formatArea(item.area_total_m2)}</td>
                    <td className="numeric-cell">{formatDepth(item.max_depth_m)}</td>
                    <td className="numeric-cell">{formatVolume(item.max_volume_m3)}</td>
                    <td>
                      <span className={status.className}>{status.label}</span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link to={`/app/ponds/${item.id}`} className="btn-link-action">
                          Detalji
                        </Link>
                        <button type="button" className="btn btn--sm" onClick={() => startEdit(item)}>
                          Uredi
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '1.5rem' }}>
                    {searchQuery ? 'Nema rezultata za traženi pojam.' : 'Nema vodnih objekata.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <WaterObjectsMap
        items={items}
        selectedObjectId={editingId}
        drawEnabled={isFormVisible}
        onPolygonDrawn={handlePolygonDrawn}
      />
    </div>
  );
}
