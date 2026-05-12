import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/state/AuthContext';
import { listWaterObjectsRequest } from '../../water-objects/api/waterObjectsApi';
import {
  createFishExitEventRequest,
  listFishCategoriesRequest,
  listFishExitEventsRequest,
  listFishSpeciesRequest,
  listFishStockCurrentRequest
} from '../api/fishApi';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('hr-HR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatInteger(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString('hr-HR', { maximumFractionDigits: 0 });
}

function formatDecimal(value, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString('hr-HR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

const EXIT_TYPE_LABELS = {
  izlov: 'Izlov',
  premjestaj_izlaz: 'Premještaj (izlaz)'
};

function makeEmptyForm() {
  return {
    water_object_id: '',
    event_date: todayIso(),
    event_type: 'izlov',
    species_id: '',
    category_id: '',
    count_total: '',
    weight_avg_kg: '',
    weight_total_kg: '',
    destination_kind: 'trziste',
    notes: ''
  };
}

export function IzlovPage() {
  const { token } = useAuth();
  const [waterObjects, setWaterObjects] = useState([]);
  const [allStock, setAllStock] = useState([]);
  const [species, setSpecies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [exitEvents, setExitEvents] = useState([]);
  const [form, setForm] = useState(makeEmptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  async function loadAll() {
    setIsLoading(true);
    setLoadError('');
    try {
      const [woRes, stockRes, speciesRes, categoriesRes, exitRes] = await Promise.all([
        listWaterObjectsRequest(token),
        listFishStockCurrentRequest(token),
        listFishSpeciesRequest(token),
        listFishCategoriesRequest(token),
        listFishExitEventsRequest(token)
      ]);
      setWaterObjects(woRes.items ?? []);
      setAllStock(stockRes.items ?? []);
      setSpecies(speciesRes.items ?? []);
      // exclude the fallback "unknown" category from form options
      setCategories((categoriesRes.items ?? []).filter((c) => c.code !== 'unknown'));
      setExitEvents(exitRes.items ?? []);
    } catch (err) {
      setLoadError(err.message ?? 'Greška pri učitavanju podataka.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, [token]);

  // Stock rows for the selected pond
  const pondStock = useMemo(() => {
    if (!form.water_object_id) return [];
    return allStock.filter((r) => String(r.water_object_id) === String(form.water_object_id) && Number(r.count_total) > 0);
  }, [allStock, form.water_object_id]);

  // Species that have stock in the selected pond
  const availableSpecies = useMemo(() => {
    if (!pondStock.length) return species;
    const ids = new Set(pondStock.map((r) => String(r.species_id)));
    const filtered = species.filter((s) => ids.has(String(s.id)));
    return filtered.length > 0 ? filtered : species;
  }, [species, pondStock]);

  // Categories available for selected species in selected pond
  const availableCategories = useMemo(() => {
    if (!form.species_id || !pondStock.length) return categories;
    const ids = new Set(
      pondStock
        .filter((r) => String(r.species_id) === String(form.species_id))
        .map((r) => String(r.category_id))
    );
    if (!ids.size) return categories;
    const filtered = categories.filter((c) => ids.has(String(c.id)));
    return filtered.length > 0 ? filtered : categories;
  }, [categories, pondStock, form.species_id]);

  // Stock hint for selected species+category
  const stockRow = useMemo(() => {
    if (!form.species_id || !form.category_id) return null;
    return pondStock.find(
      (r) => String(r.species_id) === String(form.species_id) && String(r.category_id) === String(form.category_id)
    ) ?? null;
  }, [pondStock, form.species_id, form.category_id]);

  function handleChange(event) {
    const { name, value } = event.target;
    setSuccess('');
    setError('');
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'water_object_id') { next.species_id = ''; next.category_id = ''; }
      if (name === 'species_id') next.category_id = '';

      const count = toNum(name === 'count_total' ? value : prev.count_total);
      const avg = toNum(name === 'weight_avg_kg' ? value : prev.weight_avg_kg);
      const total = toNum(name === 'weight_total_kg' ? value : prev.weight_total_kg);

      if (name === 'weight_avg_kg' && count && avg) {
        next.weight_total_kg = (count * avg).toFixed(3);
      } else if (name === 'weight_total_kg' && count && total) {
        next.weight_avg_kg = (total / count).toFixed(3);
      } else if (name === 'count_total' && count) {
        if (avg) next.weight_total_kg = (count * avg).toFixed(3);
        else if (total) next.weight_avg_kg = (total / count).toFixed(3);
      }

      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const count = toNum(form.count_total);
    const total = toNum(form.weight_total_kg);
    const avg = toNum(form.weight_avg_kg);

    if (!form.water_object_id) { setError('Odaberite vodni objekt.'); return; }
    if (!form.species_id) { setError('Odaberite vrstu ribe.'); return; }
    if (!form.category_id) { setError('Odaberite kategoriju.'); return; }
    if (!count) { setError('Broj komada mora biti veći od 0.'); return; }

    const computedTotal = total ?? (count && avg ? count * avg : null);
    if (!computedTotal) {
      setError('Unesite ukupnu masu ili prosječnu masu.');
      return;
    }

    if (stockRow && count > Number(stockRow.count_total ?? Infinity)) {
      setError(`Nema dovoljno ribe na stanju (dostupno: ${formatInteger(stockRow.count_total)} kom).`);
      return;
    }

    setSaving(true);
    try {
      await createFishExitEventRequest(token, {
        water_object_id: Number(form.water_object_id),
        event_date: form.event_date,
        event_type: form.event_type,
        species_id: Number(form.species_id),
        category_id: Number(form.category_id),
        count_total: count,
        weight_avg_kg: avg ?? computedTotal / count,
        weight_total_kg: computedTotal,
        destination_kind: form.destination_kind,
        destination_label: null,
        notes: form.notes.trim() || null
      });
      setSuccess('Izlov je uspješno evidentiran.');
      setForm((prev) => ({ ...makeEmptyForm(), water_object_id: prev.water_object_id }));
      await loadAll();
    } catch (err) {
      setError(err.message ?? 'Greška pri spremanju izlova.');
    } finally {
      setSaving(false);
    }
  }

  const selectedWaterObject = waterObjects.find((w) => String(w.id) === String(form.water_object_id)) ?? null;

  return (
    <div className="izlov-page">

      <section className="card izlov-header-card">
        <h2>Evidencija izlova</h2>
        <p>Odaberite ribnjak, vrstu i kategoriju ribe, te unesite količinu i masu.</p>
      </section>

      {loadError ? (
        <section className="card">
          <p className="error-text">{loadError}</p>
        </section>
      ) : null}

      <div className="izlov-layout">

        {/* ── Form ── */}
        <section className="card izlov-form-card">
          <h3>Novi izlov</h3>
          {error ? <p className="error-text" style={{ marginBottom: '0.75rem' }}>{error}</p> : null}
          {success ? <p className="success-text" style={{ marginBottom: '0.75rem' }}>{success}</p> : null}

          <form onSubmit={handleSubmit} className="izlov-form-grid">

            <div className="izlov-form-section">
              <h4>Lokacija i datum</h4>
              <div className="izlov-form-row">
                <label>
                  Vodni objekt *
                  <select name="water_object_id" value={form.water_object_id} onChange={handleChange} required disabled={isLoading || saving}>
                    <option value="">Odaberi ribnjak…</option>
                    {waterObjects.map((w) => (
                      <option key={w.id} value={w.id}>{w.code}{w.name ? ` — ${w.name}` : ''}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Datum *
                  <input type="date" name="event_date" value={form.event_date} onChange={handleChange} required disabled={saving} />
                </label>

                <label>
                  Vrsta izlaza
                  <select name="event_type" value={form.event_type} onChange={handleChange} disabled={saving}>
                    <option value="izlov">Izlov (prodaja / isporuka)</option>
                    <option value="premjestaj_izlaz">Premještaj (izlaz)</option>
                  </select>
                </label>
              </div>
            </div>

            {/* Stock context for selected pond */}
            {selectedWaterObject && pondStock.length > 0 ? (
              <div className="izlov-stock-context">
                <div className="izlov-stock-context-title">Trenutni fond — {selectedWaterObject.code}</div>
                <div className="table-wrap">
                  <table className="izlov-stock-table">
                    <thead>
                      <tr>
                        <th>Vrsta</th>
                        <th>Kategorija</th>
                        <th className="numeric-cell">Kom</th>
                        <th className="numeric-cell">Kg ukupno</th>
                        <th className="numeric-cell">Prosjek kg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pondStock.map((r) => (
                        <tr key={r.id}>
                          <td>{r.species_label ?? r.species_code ?? '-'}</td>
                          <td>{r.category_label ?? r.category_code ?? '-'}</td>
                          <td className="numeric-cell">{formatInteger(r.count_total)}</td>
                          <td className="numeric-cell">{formatDecimal(r.weight_total_kg, 2)}</td>
                          <td className="numeric-cell">{formatDecimal(r.weight_avg_kg, 3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {selectedWaterObject && pondStock.length === 0 && !isLoading ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: '0.25rem 0' }}>
                Nema evidentiranog fonda za odabrani ribnjak.
              </p>
            ) : null}

            <div className="izlov-form-section">
              <h4>Vrsta i kategorija</h4>
              <div className="izlov-form-row">
                <label>
                  Vrsta ribe *
                  <select name="species_id" value={form.species_id} onChange={handleChange} required disabled={isLoading || saving}>
                    <option value="">Odaberi vrstu…</option>
                    {availableSpecies.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </label>

                <label>
                  Kategorija *
                  <select name="category_id" value={form.category_id} onChange={handleChange} required disabled={isLoading || saving}>
                    <option value="">Odaberi kategoriju…</option>
                    {availableCategories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </label>
              </div>

              {stockRow ? (
                <div className="izlov-stock-hint">
                  Na stanju: <strong>{formatInteger(stockRow.count_total)} kom</strong> / <strong>{formatDecimal(stockRow.weight_total_kg, 2)} kg</strong>
                  {' — prosjek: '}<strong>{formatDecimal(stockRow.weight_avg_kg, 3)} kg/kom</strong>
                </div>
              ) : null}
            </div>

            <div className="izlov-form-section">
              <h4>Količina i masa</h4>
              <div className="izlov-form-row">
                <label>
                  Komada *
                  <input
                    type="number" name="count_total" value={form.count_total} onChange={handleChange}
                    min="1" step="1" inputMode="numeric" placeholder="npr. 500"
                    required disabled={saving}
                  />
                </label>

                <label>
                  Prosječna masa (kg)
                  <input
                    type="number" name="weight_avg_kg" value={form.weight_avg_kg} onChange={handleChange}
                    min="0.001" step="0.001" inputMode="decimal" placeholder="npr. 2,500"
                    disabled={saving}
                  />
                </label>

                <label>
                  Ukupna masa (kg)
                  <input
                    type="number" name="weight_total_kg" value={form.weight_total_kg} onChange={handleChange}
                    min="0.001" step="0.001" inputMode="decimal" placeholder="auto ili unesi"
                    disabled={saving}
                  />
                </label>
              </div>
            </div>

            <label style={{ display: 'grid', gap: '0.3rem', fontSize: '0.875rem', fontWeight: 500 }}>
              Napomena
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} placeholder="Opcionalna napomena…" disabled={saving} />
            </label>

            <div className="izlov-form-actions">
              <button type="submit" className="btn btn--primary" disabled={isLoading || saving}>
                {saving ? 'Sprema se…' : 'Spremi izlov'}
              </button>
              <button type="button" className="btn" disabled={saving} onClick={() => { setForm(makeEmptyForm()); setError(''); setSuccess(''); }}>
                Poništi
              </button>
            </div>

          </form>
        </section>

        {/* ── History ── */}
        <section className="card izlov-history-card">
          <h3>Povijest izlova</h3>
          {isLoading ? <p>Učitavanje…</p> : null}
          {!isLoading && exitEvents.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Nema evidentiranih izlova.</p>
          ) : null}
          {exitEvents.length > 0 ? (
            <div className="table-wrap">
              <table className="izlov-history-table">
                <thead>
                  <tr>
                    <th>Datum</th>
                    <th>Objekt</th>
                    <th>Vrsta</th>
                    <th>Kategorija</th>
                    <th>Tip</th>
                    <th className="numeric-cell">Kom</th>
                    <th className="numeric-cell">Kg ukupno</th>
                    <th className="numeric-cell">Prosjek kg</th>
                    <th>Napomena</th>
                  </tr>
                </thead>
                <tbody>
                  {exitEvents.map((row) => (
                    <tr key={row.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(row.event_date)}</td>
                      <td><strong>{row.water_object_code ?? '-'}</strong></td>
                      <td>{row.species_label ?? row.species_code ?? '-'}</td>
                      <td>{row.category_label ?? row.category_code ?? '-'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{EXIT_TYPE_LABELS[row.event_type] ?? row.event_type ?? '-'}</td>
                      <td className="numeric-cell">{formatInteger(row.count_total)}</td>
                      <td className="numeric-cell">{formatDecimal(row.weight_total_kg, 2)}</td>
                      <td className="numeric-cell">{formatDecimal(row.weight_avg_kg, 3)}</td>
                      <td>{row.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

      </div>
    </div>
  );
}
