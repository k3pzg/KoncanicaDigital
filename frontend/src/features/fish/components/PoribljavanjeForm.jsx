import { useState } from 'react';
import { useAuth } from '../../auth/state/AuthContext';
import { createFishEntryEventRequest } from '../api/fishApi';

const EVENT_TYPE_OPTIONS = [
  { value: 'nasad', label: 'Nasad (novo poribljavanje)' },
  { value: 'dodatni_nasad', label: 'Dodatni nasad (dogunjavanje)' },
  { value: 'premjestaj_ulaz', label: 'Premještaj (ulaz iz drugog ribnjaka)' }
];

const SOURCE_KIND_OPTIONS = [
  { value: 'ostalo', label: 'Vanjski dobavljač / ostalo' },
  { value: 'mrijestiliste', label: 'Mrijestilište' },
  { value: 'uvoz', label: 'Uvoz' },
  { value: 'interni_objekt', label: 'Interni objekt (premještaj)' }
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function makeEmptyForm() {
  return {
    event_date: todayIso(),
    event_type: 'nasad',
    species_id: '',
    category_id: '',
    count_total: '',
    weight_avg_kg: '',
    weight_total_kg: '',
    source_kind: 'ostalo',
    source_label: '',
    notes: ''
  };
}

export function PoribljavanjeForm({ pondId, waterObjects, species, categories, onSave, onCancel }) {
  const { token } = useAuth();
  const [form, setForm] = useState(makeEmptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };

      const count = toNum(name === 'count_total' ? value : prev.count_total);
      const avg = toNum(name === 'weight_avg_kg' ? value : prev.weight_avg_kg);
      const total = toNum(name === 'weight_total_kg' ? value : prev.weight_total_kg);

      if (name === 'weight_avg_kg' && count > 0 && avg > 0) {
        next.weight_total_kg = (count * avg).toFixed(3);
      } else if (name === 'weight_total_kg' && count > 0 && total > 0) {
        next.weight_avg_kg = (total / count).toFixed(3);
      } else if (name === 'count_total' && count > 0) {
        if (avg > 0) next.weight_total_kg = (count * avg).toFixed(3);
        else if (total > 0) next.weight_avg_kg = (total / count).toFixed(3);
      }

      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const count = toNum(form.count_total);
    const total = toNum(form.weight_total_kg);
    const avg = toNum(form.weight_avg_kg);

    if (!form.species_id) { setError('Odaberite vrstu ribe.'); return; }
    if (!form.category_id) { setError('Odaberite kategoriju.'); return; }
    if (!count || count <= 0) { setError('Broj komada mora biti veći od 0.'); return; }

    const computedTotal = total > 0 ? total : (count > 0 && avg > 0 ? count * avg : null);
    if (!computedTotal || computedTotal <= 0) {
      setError('Unesite ukupnu masu (kg) ili prosječnu masu — barem jedno polje je obavezno.');
      return;
    }

    if (form.source_kind === 'interni_objekt' && !form.source_water_object_id) {
      setError('Odaberite izvorni ribnjak za premještaj.');
      return;
    }

    setSaving(true);
    try {
      await createFishEntryEventRequest(token, {
        water_object_id: Number(pondId),
        event_date: form.event_date,
        event_type: form.event_type,
        species_id: Number(form.species_id),
        category_id: Number(form.category_id),
        count_total: count,
        weight_avg_kg: avg || null,
        weight_total_kg: computedTotal,
        source_kind: form.source_kind,
        source_water_object_id: form.source_kind === 'interni_objekt' ? Number(form.source_water_object_id) : null,
        source_label: form.source_kind !== 'interni_objekt' ? (form.source_label.trim() || null) : null,
        notes: form.notes.trim() || null
      });
      setSuccess(true);
      setForm(makeEmptyForm());
      setTimeout(() => {
        setSuccess(false);
        onSave();
      }, 800);
    } catch (err) {
      setError(err.message ?? 'Greška pri spremanju poribljavanja.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="pond-inline-form" onSubmit={handleSubmit}>
      <div className="pond-inline-form-title">Poribljavanje — unos</div>

      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">Poribljavanje uspješno spremljeno.</p>}

      <div className="pond-inline-form-grid">
        <label>
          Datum
          <input type="date" name="event_date" value={form.event_date} onChange={handleChange} required />
        </label>

        <label>
          Vrsta nasada
          <select name="event_type" value={form.event_type} onChange={handleChange}>
            {EVENT_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label>
          Vrsta ribe *
          <select name="species_id" value={form.species_id} onChange={handleChange} required>
            <option value="">Odaberi vrstu…</option>
            {species.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>

        <label>
          Kategorija *
          <select name="category_id" value={form.category_id} onChange={handleChange} required>
            <option value="">Odaberi kategoriju…</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>

        <label>
          Komada *
          <input
            type="number" name="count_total" value={form.count_total}
            onChange={handleChange} min="1" step="1" inputMode="numeric"
            placeholder="npr. 5000" required
          />
        </label>

        <label>
          Prosječna masa (kg)
          <input
            type="number" name="weight_avg_kg" value={form.weight_avg_kg}
            onChange={handleChange} min="0.001" step="0.001" inputMode="decimal"
            placeholder="npr. 0.350"
          />
        </label>

        <label>
          Ukupna masa (kg)
          <input
            type="number" name="weight_total_kg" value={form.weight_total_kg}
            onChange={handleChange} min="0.001" step="0.001" inputMode="decimal"
            placeholder="auto ili unesi"
          />
        </label>

        <label>
          Podrijetlo
          <select name="source_kind" value={form.source_kind} onChange={handleChange}>
            {SOURCE_KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        {form.source_kind === 'interni_objekt' && (
          <label>
            Izvorni ribnjak *
            <select name="source_water_object_id" value={form.source_water_object_id ?? ''} onChange={handleChange} required>
              <option value="">Odaberi ribnjak…</option>
              {(waterObjects ?? []).filter((w) => String(w.id) !== String(pondId)).map((w) => (
                <option key={w.id} value={w.id}>{w.code}</option>
              ))}
            </select>
          </label>
        )}

        {form.source_kind !== 'interni_objekt' && (
          <label>
            Opis podrijetla
            <input
              type="text" name="source_label" value={form.source_label}
              onChange={handleChange} placeholder="Npr. naziv dobavljača"
            />
          </label>
        )}

        <label className="pond-inline-form-full">
          Napomena
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} placeholder="Opcionalna napomena…" />
        </label>
      </div>

      <div className="pond-inline-form-actions">
        <button type="submit" className="pond-action-btn pond-action-btn--primary" disabled={saving}>
          {saving ? 'Sprema se…' : 'Spremi poribljavanje'}
        </button>
        <button type="button" className="pond-action-btn" onClick={onCancel}>
          Odustani
        </button>
      </div>
    </form>
  );
}
