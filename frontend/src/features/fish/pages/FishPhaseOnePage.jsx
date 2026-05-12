import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/state/AuthContext';
import { listWaterObjectsRequest } from '../../water-objects/api/waterObjectsApi';
import {
  createFishControlEventRequest,
  createFishEntryEventRequest,
  listFishCategoriesRequest,
  listFishControlEventsRequest,
  listFishEntryEventsRequest,
  listFishSpeciesRequest,
  listFishStockCurrentRequest
} from '../api/fishApi';

// ── constants ─────────────────────────────────────────────────────────────────

const ENTRY_EVENT_TYPES = [
  { value: 'nasad', label: 'Nasad' },
  { value: 'dodatni_nasad', label: 'Dodatni nasad' },
  { value: 'premjestaj_ulaz', label: 'Premještaj (ulaz)' }
];

const SOURCE_KINDS = [
  { value: 'interni_objekt', label: 'Interni objekt' },
  { value: 'mrijestiliste', label: 'Mrijestilište' },
  { value: 'uvoz', label: 'Uvoz' },
  { value: 'ostalo', label: 'Ostalo' }
];

const INITIAL_ENTRY_FORM = {
  water_object_id: '',
  event_date: new Date().toISOString().slice(0, 10),
  event_type: 'nasad',
  species_id: '',
  category_id: '',
  count_total: '',
  weight_avg_kg: '',
  weight_total_kg: '',
  source_kind: 'mrijestiliste',
  source_water_object_id: '',
  source_label: '',
  notes: ''
};

function makeEmptyControlLine() {
  return {
    species_id: '',
    category_id: '',
    sample_count: '',
    sample_weight_avg_kg: '',
    sample_weight_total_kg: '',
    estimated_count_total: '',
    estimated_weight_total_kg: '',
    notes: ''
  };
}

const INITIAL_CONTROL_FORM = {
  water_object_id: '',
  control_date: new Date().toISOString().slice(0, 10),
  sample_area_m2: '',
  estimated_total_area_m2: '',
  notes: '',
  lines: [makeEmptyControlLine()]
};

// ── formatters ────────────────────────────────────────────────────────────────

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('hr-HR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatNum(value, decimals = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString('hr-HR', { minimumFractionDigits: 0, maximumFractionDigits: decimals });
}

function toPositiveNum(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ── component ─────────────────────────────────────────────────────────────────

export function FishPhaseOnePage() {
  const { token } = useAuth();

  const [waterObjects, setWaterObjects] = useState([]);
  const [species, setSpecies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [entryEvents, setEntryEvents] = useState([]);
  const [controlEvents, setControlEvents] = useState([]);
  const [stockItems, setStockItems] = useState([]);

  const [activeTab, setActiveTab] = useState('poribljavanje');
  const [entryForm, setEntryForm] = useState(INITIAL_ENTRY_FORM);
  const [controlForm, setControlForm] = useState(INITIAL_CONTROL_FORM);
  const [stockFilterId, setStockFilterId] = useState('');
  const [error, setError] = useState('');
  const [entrySaved, setEntrySaved] = useState(false);
  const [controlSaved, setControlSaved] = useState(false);

  async function loadAll() {
    try {
      const [woRes, spRes, catRes, entryRes, controlRes, stockRes] = await Promise.all([
        listWaterObjectsRequest(token),
        listFishSpeciesRequest(token),
        listFishCategoriesRequest(token),
        listFishEntryEventsRequest(token),
        listFishControlEventsRequest(token),
        listFishStockCurrentRequest(token)
      ]);
      setWaterObjects(woRes.items ?? []);
      setSpecies(spRes.items ?? []);
      setCategories(catRes.items ?? []);
      setEntryEvents(entryRes.items ?? []);
      setControlEvents(controlRes.items ?? []);
      setStockItems(stockRes.items ?? []);
    } catch (err) {
      setError(err.message || 'Greška pri učitavanju podataka.');
    }
  }

  useEffect(() => { loadAll(); }, []);

  // ── entry form ───────────────────────────────────────────────────────────────

  function handleEntryChange(event) {
    const { name, value } = event.target;
    setEntryForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'source_kind') {
        if (value === 'interni_objekt') next.source_label = '';
        else next.source_water_object_id = '';
      }
      return next;
    });
  }

  async function handleEntrySubmit(event) {
    event.preventDefault();
    setError('');
    const countTotal = Number(entryForm.count_total);
    const weightTotal = Number(entryForm.weight_total_kg);
    if (!Number.isFinite(countTotal) || countTotal <= 0) { setError('Ukupno komada mora biti broj veći od 0.'); return; }
    if (!Number.isFinite(weightTotal) || weightTotal <= 0) { setError('Ukupna masa mora biti broj veći od 0.'); return; }
    if (entryForm.source_kind === 'interni_objekt' && !entryForm.source_water_object_id) {
      setError('Odaberite izvorni vodni objekt.'); return;
    }
    if (entryForm.source_kind === 'ostalo' && !entryForm.source_label.trim()) {
      setError('Upišite opis podrijetla.'); return;
    }
    try {
      await createFishEntryEventRequest(token, {
        ...entryForm,
        source_water_object_id: entryForm.source_kind === 'interni_objekt' ? entryForm.source_water_object_id : '',
        source_label: entryForm.source_kind === 'interni_objekt' ? '' : entryForm.source_label.trim()
      });
      setEntryForm({ ...INITIAL_ENTRY_FORM, event_date: new Date().toISOString().slice(0, 10) });
      setEntrySaved(true);
      setTimeout(() => setEntrySaved(false), 2500);
      await loadAll();
    } catch (err) {
      setError(err.message || 'Greška pri spremanju unosa.');
    }
  }

  // ── control form ─────────────────────────────────────────────────────────────

  function handleControlHeaderChange(event) {
    const { name, value } = event.target;
    setControlForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleControlLineChange(index, event) {
    const { name, value } = event.target;
    setControlForm((prev) => {
      const lines = [...prev.lines];
      const line = { ...lines[index], [name]: value };
      const sampAvg = toPositiveNum(name === 'sample_weight_avg_kg' ? value : line.sample_weight_avg_kg);
      const sampCount = toPositiveNum(name === 'sample_count' ? value : line.sample_count);
      const estCount = toPositiveNum(name === 'estimated_count_total' ? value : line.estimated_count_total);
      if (sampCount && sampAvg) line.sample_weight_total_kg = (sampCount * sampAvg).toFixed(3);
      if (estCount && sampAvg) line.estimated_weight_total_kg = (estCount * sampAvg).toFixed(3);
      lines[index] = line;
      return { ...prev, lines };
    });
  }

  function addControlLine() {
    setControlForm((prev) => ({ ...prev, lines: [...prev.lines, makeEmptyControlLine()] }));
  }

  function removeControlLine(index) {
    setControlForm((prev) => {
      if (prev.lines.length <= 1) return prev;
      return { ...prev, lines: prev.lines.filter((_, i) => i !== index) };
    });
  }

  async function handleControlSubmit(event) {
    event.preventDefault();
    setError('');
    if (!controlForm.water_object_id || !controlForm.control_date) {
      setError('Odaberite vodni objekt i datum kontrole.'); return;
    }
    for (const [i, line] of controlForm.lines.entries()) {
      const n = i + 1;
      if (!line.species_id) { setError(`Redak ${n}: odaberite vrstu ribe.`); return; }
      if (!line.category_id) { setError(`Redak ${n}: odaberite kategoriju.`); return; }
      if (!toPositiveNum(line.sample_count)) { setError(`Redak ${n}: broj u uzorku mora biti > 0.`); return; }
      if (!toPositiveNum(line.sample_weight_avg_kg)) { setError(`Redak ${n}: prosječna masa mora biti > 0.`); return; }
      if (!toPositiveNum(line.estimated_count_total)) { setError(`Redak ${n}: procijenjen ukupan broj mora biti > 0.`); return; }
      if (!toPositiveNum(line.estimated_weight_total_kg)) { setError(`Redak ${n}: procijenjena ukupna masa mora biti > 0.`); return; }
    }
    try {
      await createFishControlEventRequest(token, {
        water_object_id: Number(controlForm.water_object_id),
        control_date: controlForm.control_date,
        sample_area_m2: controlForm.sample_area_m2 !== '' ? Number(controlForm.sample_area_m2) : null,
        estimated_total_area_m2: controlForm.estimated_total_area_m2 !== '' ? Number(controlForm.estimated_total_area_m2) : null,
        notes: controlForm.notes.trim() || null,
        lines: controlForm.lines.map((line) => ({
          species_id: Number(line.species_id),
          category_id: Number(line.category_id),
          sample_count: Number(line.sample_count),
          sample_weight_avg_kg: Number(line.sample_weight_avg_kg),
          sample_weight_total_kg: line.sample_weight_total_kg !== '' ? Number(line.sample_weight_total_kg) : null,
          estimated_count_total: Number(line.estimated_count_total),
          estimated_weight_total_kg: Number(line.estimated_weight_total_kg),
          notes: line.notes.trim() || null
        }))
      });
      setControlForm({ ...INITIAL_CONTROL_FORM, control_date: new Date().toISOString().slice(0, 10) });
      setControlSaved(true);
      setTimeout(() => setControlSaved(false), 2500);
      await loadAll();
    } catch (err) {
      setError(err.message || 'Greška pri spremanju kontrole.');
    }
  }

  // ── stock filter ─────────────────────────────────────────────────────────────

  const filteredStock = useMemo(() => {
    if (!stockFilterId) return stockItems;
    return stockItems.filter((row) => String(row.water_object_id) === String(stockFilterId));
  }, [stockItems, stockFilterId]);

  // ── render ────────────────────────────────────────────────────────────────────

  const tabs = [
    { key: 'poribljavanje', label: 'Poribljavanje' },
    { key: 'kontrola', label: 'Kontrola' },
    { key: 'fond', label: 'Fond i povijest' }
  ];

  return (
    <div style={{ width: 'min(1100px, 100%)', display: 'grid', gap: '1rem' }}>

      {/* ── tab navigation ── */}
      <section className="card" style={{ padding: '0 1.25rem' }}>
        <div className="fish-ops-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`fish-ops-tab${activeTab === tab.key ? ' active' : ''}`}
              onClick={() => { setActiveTab(tab.key); setError(''); }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && <p className="error-text" style={{ marginBottom: '1rem' }}>{error}</p>}

        {/* ── Poribljavanje tab ── */}
        {activeTab === 'poribljavanje' && (
          <div style={{ paddingBottom: '1.25rem' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.05rem', fontWeight: 700 }}>Unos poribljavanja</h2>
            {entrySaved && <p className="success-text" style={{ marginBottom: '0.75rem' }}>Poribljavanje uspješno evidentirano.</p>}
            <form className="fish-ops-form" onSubmit={handleEntrySubmit}>
              <label>
                Vodni objekt *
                <select name="water_object_id" value={entryForm.water_object_id} onChange={handleEntryChange} required>
                  <option value="">Odaberi objekt…</option>
                  {waterObjects.map((o) => <option key={o.id} value={o.id}>{o.code}</option>)}
                </select>
              </label>
              <label>
                Datum *
                <input type="date" name="event_date" value={entryForm.event_date} onChange={handleEntryChange} required />
              </label>
              <label>
                Vrsta događaja
                <select name="event_type" value={entryForm.event_type} onChange={handleEntryChange}>
                  {ENTRY_EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
              <label>
                Vrsta ribe *
                <select name="species_id" value={entryForm.species_id} onChange={handleEntryChange} required>
                  <option value="">Odaberi vrstu…</option>
                  {species.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
              <label>
                Kategorija *
                <select name="category_id" value={entryForm.category_id} onChange={handleEntryChange} required>
                  <option value="">Odaberi kategoriju…</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </label>
              <label>
                Ukupno komada *
                <input type="number" name="count_total" min="1" step="1" inputMode="numeric"
                  value={entryForm.count_total} onChange={handleEntryChange} required placeholder="npr. 5000" />
              </label>
              <label>
                Prosječna masa (kg)
                <input type="number" name="weight_avg_kg" min="0.001" step="0.001" inputMode="decimal"
                  value={entryForm.weight_avg_kg} onChange={handleEntryChange} placeholder="npr. 0.050" />
              </label>
              <label>
                Ukupna masa (kg) *
                <input type="number" name="weight_total_kg" min="0.001" step="0.001" inputMode="decimal"
                  value={entryForm.weight_total_kg} onChange={handleEntryChange} required placeholder="npr. 250.000" />
              </label>
              <label>
                Podrijetlo
                <select name="source_kind" value={entryForm.source_kind} onChange={handleEntryChange}>
                  {SOURCE_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                </select>
              </label>
              {entryForm.source_kind === 'interni_objekt' ? (
                <label>
                  Izvorni objekt *
                  <select name="source_water_object_id" value={entryForm.source_water_object_id} onChange={handleEntryChange} required>
                    <option value="">Odaberi…</option>
                    {waterObjects.map((o) => <option key={o.id} value={o.id}>{o.code}</option>)}
                  </select>
                </label>
              ) : (
                <label>
                  Opis podrijetla{entryForm.source_kind === 'ostalo' ? ' *' : ''}
                  <input type="text" name="source_label" value={entryForm.source_label} onChange={handleEntryChange}
                    placeholder="Npr. naziv mrijestilišta ili dobavljača" />
                </label>
              )}
              <label className="field-full">
                Napomena
                <textarea name="notes" rows={2} value={entryForm.notes} onChange={handleEntryChange}
                  placeholder="Opcionalna napomena o unosu…" />
              </label>
              <div className="fish-ops-form-actions">
                <button type="submit" className="btn btn--primary">Evidentiraj poribljavanje</button>
                <button type="button" className="btn" onClick={() => setEntryForm(INITIAL_ENTRY_FORM)}>
                  Resetiraj formu
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Kontrola tab ── */}
        {activeTab === 'kontrola' && (
          <div style={{ paddingBottom: '1.25rem' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.05rem', fontWeight: 700 }}>Kontrolno uzorkovanje</h2>
            {controlSaved && <p className="success-text" style={{ marginBottom: '0.75rem' }}>Kontrola uspješno evidentirana.</p>}
            <form onSubmit={handleControlSubmit}>
              {/* Header fields */}
              <div className="fish-ops-form" style={{ marginBottom: '1rem' }}>
                <label>
                  Vodni objekt *
                  <select name="water_object_id" value={controlForm.water_object_id} onChange={handleControlHeaderChange} required>
                    <option value="">Odaberi objekt…</option>
                    {waterObjects.map((o) => <option key={o.id} value={o.id}>{o.code}</option>)}
                  </select>
                </label>
                <label>
                  Datum kontrole *
                  <input type="date" name="control_date" value={controlForm.control_date} onChange={handleControlHeaderChange} required />
                </label>
                <label>
                  Uzorkovana površina (m²)
                  <input type="number" name="sample_area_m2" min="0" step="0.01" inputMode="decimal"
                    value={controlForm.sample_area_m2} onChange={handleControlHeaderChange} placeholder="npr. 500" />
                </label>
                <label>
                  Procijenjena ukupna površina (m²)
                  <input type="number" name="estimated_total_area_m2" min="0" step="0.01" inputMode="decimal"
                    value={controlForm.estimated_total_area_m2} onChange={handleControlHeaderChange} placeholder="npr. 25000" />
                </label>
                <label className="field-full">
                  Napomena (zaglavlje)
                  <textarea name="notes" rows={2} value={controlForm.notes} onChange={handleControlHeaderChange}
                    placeholder="Opcionalna napomena o kontroli…" />
                </label>
              </div>

              {/* Control lines */}
              <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
                  Vrste po uzorku ({controlForm.lines.length})
                </div>
                {controlForm.lines.map((line, index) => (
                  <div key={index} className="control-line-card">
                    <div className="control-line-card-header">
                      <span className="control-line-card-title">Vrsta {index + 1}</span>
                      {controlForm.lines.length > 1 && (
                        <button type="button" className="btn btn--sm btn--danger" onClick={() => removeControlLine(index)}>
                          Ukloni
                        </button>
                      )}
                    </div>

                    <div className="fish-ops-form">
                      <label>
                        Vrsta ribe *
                        <select name="species_id" value={line.species_id} onChange={(e) => handleControlLineChange(index, e)} required>
                          <option value="">Odaberi vrstu…</option>
                          {species.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                      </label>
                      <label>
                        Kategorija *
                        <select name="category_id" value={line.category_id} onChange={(e) => handleControlLineChange(index, e)} required>
                          <option value="">Odaberi kategoriju…</option>
                          {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                      </label>

                      <div className="control-subsection">Uzorak</div>

                      <label>
                        Broj u uzorku *
                        <input type="number" name="sample_count" min="1" step="1" inputMode="numeric"
                          value={line.sample_count} onChange={(e) => handleControlLineChange(index, e)}
                          required placeholder="npr. 50" />
                      </label>
                      <label>
                        Prosjek masa (kg) *
                        <input type="number" name="sample_weight_avg_kg" min="0.001" step="0.001" inputMode="decimal"
                          value={line.sample_weight_avg_kg} onChange={(e) => handleControlLineChange(index, e)}
                          required placeholder="npr. 1.250" />
                      </label>
                      <label>
                        Ukupna masa uzorka (kg)
                        <input type="number" name="sample_weight_total_kg" min="0" step="0.001" inputMode="decimal"
                          value={line.sample_weight_total_kg} onChange={(e) => handleControlLineChange(index, e)}
                          placeholder="automatski" readOnly={!!(line.sample_count && line.sample_weight_avg_kg)}
                          style={line.sample_count && line.sample_weight_avg_kg ? { background: 'var(--color-surface-subtle)', color: 'var(--color-text-muted)' } : undefined} />
                      </label>

                      <div className="control-subsection">Procjena za cijeli objekt</div>

                      <label>
                        Procijenjen ukupan broj *
                        <input type="number" name="estimated_count_total" min="1" step="1" inputMode="numeric"
                          value={line.estimated_count_total} onChange={(e) => handleControlLineChange(index, e)}
                          required placeholder="npr. 3000" />
                      </label>
                      <label>
                        Procijenjena ukupna masa (kg) *
                        <input type="number" name="estimated_weight_total_kg" min="0.001" step="0.001" inputMode="decimal"
                          value={line.estimated_weight_total_kg} onChange={(e) => handleControlLineChange(index, e)}
                          required placeholder="automatski ili unesi"
                          style={line.estimated_count_total && line.sample_weight_avg_kg ? { background: 'var(--color-surface-subtle)', color: 'var(--color-text-muted)' } : undefined} />
                      </label>

                      <label className="field-full">
                        Napomena (redak)
                        <textarea name="notes" rows={1} value={line.notes} onChange={(e) => handleControlLineChange(index, e)}
                          placeholder="Opcionalno…" />
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn" onClick={addControlLine}>
                  + Dodaj vrstu
                </button>
                <button type="submit" className="btn btn--primary">
                  Spremi kontrolu
                </button>
                <button type="button" className="btn" onClick={() => setControlForm(INITIAL_CONTROL_FORM)}>
                  Resetiraj
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Fond i povijest tab ── */}
        {activeTab === 'fond' && (
          <div style={{ paddingBottom: '1.25rem' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.05rem', fontWeight: 700 }}>Pregled fonda i povijest</h2>

            {/* stock filter */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>
                Filtriraj po objektu
                <select value={stockFilterId} onChange={(e) => setStockFilterId(e.target.value)} style={{ minWidth: '180px' }}>
                  <option value="">Svi objekti</option>
                  {waterObjects.map((o) => <option key={o.id} value={o.id}>{o.code}</option>)}
                </select>
              </label>
            </div>

            <div className="table-wrap" style={{ marginBottom: '1.5rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>Objekt</th>
                    <th>Vrsta ribe</th>
                    <th>Kategorija</th>
                    <th className="numeric-cell">Kom</th>
                    <th className="numeric-cell">Prosjek kg</th>
                    <th className="numeric-cell">Ukupno kg</th>
                    <th>Zadnje osvježenje</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStock.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '1.5rem' }}>Nema podataka.</td></tr>
                  )}
                  {filteredStock.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Link to={`/app/ponds/${row.water_object_id}`} style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
                          {row.water_object_code}
                        </Link>
                      </td>
                      <td>{row.species_label ?? row.species_code ?? '-'}</td>
                      <td>{row.category_label ?? row.category_code ?? '-'}</td>
                      <td className="numeric-cell">{formatNum(row.count_total, 0)}</td>
                      <td className="numeric-cell">{formatNum(row.weight_avg_kg, 3)}</td>
                      <td className="numeric-cell">{formatNum(row.weight_total_kg, 2)}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                        {row.last_refresh_type === 'entry' ? 'Nasad' : row.last_refresh_type === 'control' ? 'Kontrola' : 'Ručno'}
                        {row.last_refresh_date ? ` · ${formatDate(row.last_refresh_date)}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* entry history */}
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>
              Povijest poribljavanja
            </h3>
            <div className="table-wrap" style={{ marginBottom: '1.5rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>Datum</th>
                    <th>Objekt</th>
                    <th>Vrsta događaja</th>
                    <th>Vrsta ribe</th>
                    <th>Kategorija</th>
                    <th className="numeric-cell">Kom</th>
                    <th className="numeric-cell">Kg</th>
                    <th>Podrijetlo</th>
                  </tr>
                </thead>
                <tbody>
                  {entryEvents.length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '1.5rem' }}>Nema evidentiranih unosa.</td></tr>
                  )}
                  {entryEvents.map((item) => (
                    <tr key={item.id} className="event-row event-row--entry">
                      <td>{formatDate(item.event_date)}</td>
                      <td>
                        <Link to={`/app/ponds/${item.water_object_id}`} style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
                          {item.water_object_code}
                        </Link>
                      </td>
                      <td>{ENTRY_EVENT_TYPES.find((t) => t.value === item.event_type)?.label ?? item.event_type}</td>
                      <td>{item.species_label ?? '-'}</td>
                      <td>{item.category_label ?? '-'}</td>
                      <td className="numeric-cell">{formatNum(item.count_total, 0)}</td>
                      <td className="numeric-cell">{formatNum(item.weight_total_kg, 2)}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                        {item.source_water_object_code ?? item.source_label ?? SOURCE_KINDS.find((k) => k.value === item.source_kind)?.label ?? '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* control history */}
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>
              Povijest kontrolnih uzorkovanja
            </h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Datum</th>
                    <th>Objekt</th>
                    <th>Uzorkovana površina (m²)</th>
                    <th>Ukupna površina (m²)</th>
                    <th>Napomena</th>
                  </tr>
                </thead>
                <tbody>
                  {controlEvents.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '1.5rem' }}>Nema evidentiranih kontrola.</td></tr>
                  )}
                  {controlEvents.map((item) => (
                    <tr key={item.id} className="event-row event-row--control">
                      <td>{formatDate(item.control_date)}</td>
                      <td>
                        <Link to={`/app/ponds/${item.water_object_id}`} style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
                          {item.water_object_code}
                        </Link>
                      </td>
                      <td className="numeric-cell">{item.sample_area_m2 != null ? `${formatNum(item.sample_area_m2, 2)} m²` : '-'}</td>
                      <td className="numeric-cell">{item.estimated_total_area_m2 != null ? `${formatNum(item.estimated_total_area_m2, 2)} m²` : '-'}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{item.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
