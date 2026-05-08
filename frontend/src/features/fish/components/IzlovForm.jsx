import { useMemo, useState } from 'react';
import { useAuth } from '../../auth/state/AuthContext';
import { createFishExitEventRequest } from '../api/fishApi';

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
    event_type: 'izlov',
    species_id: '',
    category_id: '',
    count_total: '',
    weight_avg_kg: '',
    weight_total_kg: '',
    notes: ''
  };
}

export function IzlovForm({ pondId, stock, species, categories, onSave, onCancel }) {
  const { token } = useAuth();
  const [form, setForm] = useState(makeEmptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Build species options from current stock — only show species present in this pond
  const stockSpeciesIds = useMemo(() => {
    const ids = new Set((stock ?? []).map((r) => String(r.species_id)).filter(Boolean));
    return ids;
  }, [stock]);

  const availableSpecies = useMemo(() => {
    if (!stockSpeciesIds.size) return species ?? [];
    const filtered = (species ?? []).filter((s) => stockSpeciesIds.has(String(s.id)));
    return filtered.length > 0 ? filtered : (species ?? []);
  }, [species, stockSpeciesIds]);

  // Filter categories to those available for the selected species in current stock
  const availableCategories = useMemo(() => {
    if (!form.species_id) return categories ?? [];
    const categoryIds = new Set(
      (stock ?? [])
        .filter((r) => String(r.species_id) === String(form.species_id) && r.category_id)
        .map((r) => String(r.category_id))
    );
    if (!categoryIds.size) return categories ?? [];
    const filtered = (categories ?? []).filter((c) => categoryIds.has(String(c.id)));
    return filtered.length > 0 ? filtered : (categories ?? []);
  }, [categories, stock, form.species_id]);

  // Current stock row for selected species+category (for showing available quantity)
  const stockRow = useMemo(() => {
    if (!form.species_id || !form.category_id) return null;
    return (stock ?? []).find(
      (r) => String(r.species_id) === String(form.species_id) && String(r.category_id) === String(form.category_id)
    ) ?? null;
  }, [stock, form.species_id, form.category_id]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };

      // Reset category when species changes
      if (name === 'species_id') next.category_id = '';

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

    if (stockRow && count > Number(stockRow.count_total ?? Infinity)) {
      setError(`Nema dovoljno ribe na stanju (dostupno: ${stockRow.count_total} kom).`);
      return;
    }

    const computedTotal = total > 0 ? total : (count > 0 && avg > 0 ? count * avg : null);
    if (!computedTotal || computedTotal <= 0) {
      setError('Unesite ukupnu masu (kg) ili prosječnu masu — barem jedno polje je obavezno.');
      return;
    }

    setSaving(true);
    try {
      await createFishExitEventRequest(token, {
        water_object_id: Number(pondId),
        event_date: form.event_date,
        event_type: form.event_type,
        species_id: Number(form.species_id),
        category_id: Number(form.category_id),
        count_total: count,
        weight_avg_kg: avg || null,
        weight_total_kg: computedTotal,
        destination_kind: 'trziste',
        destination_label: null,
        notes: form.notes.trim() || null
      });
      setSuccess(true);
      setForm(makeEmptyForm());
      setTimeout(() => {
        setSuccess(false);
        onSave();
      }, 800);
    } catch (err) {
      setError(err.message ?? 'Greška pri spremanju izlova.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="pond-inline-form" onSubmit={handleSubmit}>
      <div className="pond-inline-form-title">Izlov — evidencija</div>

      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">Izlov uspješno spremljen.</p>}

      <div className="pond-inline-form-grid">
        <label>
          Datum
          <input type="date" name="event_date" value={form.event_date} onChange={handleChange} required />
        </label>

        <label>
          Vrsta izlaza
          <select name="event_type" value={form.event_type} onChange={handleChange}>
            <option value="izlov">Izlov (prodaja / isporuka)</option>
            <option value="premjestaj_izlaz">Premještaj (izlaz)</option>
          </select>
        </label>

        <label>
          Vrsta ribe *
          <select name="species_id" value={form.species_id} onChange={handleChange} required>
            <option value="">Odaberi vrstu…</option>
            {availableSpecies.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>

        <label>
          Kategorija *
          <select name="category_id" value={form.category_id} onChange={handleChange} required>
            <option value="">Odaberi kategoriju…</option>
            {availableCategories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>

        {stockRow && (
          <div className="pond-stock-hint">
            Na stanju: <strong>{Number(stockRow.count_total).toLocaleString('hr-HR', { maximumFractionDigits: 0 })} kom</strong>
            {' / '}
            <strong>{Number(stockRow.weight_total_kg).toLocaleString('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</strong>
          </div>
        )}

        <label>
          Komada *
          <input
            type="number" name="count_total" value={form.count_total}
            onChange={handleChange} min="1" step="1" inputMode="numeric"
            placeholder="npr. 500" required
          />
        </label>

        <label>
          Prosječna masa (kg)
          <input
            type="number" name="weight_avg_kg" value={form.weight_avg_kg}
            onChange={handleChange} min="0.001" step="0.001" inputMode="decimal"
            placeholder="npr. 2.500"
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

        <label className="pond-inline-form-full">
          Napomena
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} placeholder="Opcionalna napomena…" />
        </label>
      </div>

      <div className="pond-inline-form-actions">
        <button type="submit" className="pond-action-btn pond-action-btn--primary" disabled={saving}>
          {saving ? 'Sprema se…' : 'Spremi izlov'}
        </button>
        <button type="button" className="pond-action-btn" onClick={onCancel}>
          Odustani
        </button>
      </div>
    </form>
  );
}
