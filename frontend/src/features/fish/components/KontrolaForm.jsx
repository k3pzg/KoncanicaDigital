import { useState } from 'react';
import { useAuth } from '../../auth/state/AuthContext';
import { createFishControlEventRequest } from '../api/fishApi';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function makeEmptyLine() {
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

function makeEmptyForm() {
  return {
    control_date: todayIso(),
    sample_area_m2: '',
    estimated_total_area_m2: '',
    notes: '',
    lines: [makeEmptyLine()]
  };
}

export function KontrolaForm({ pondId, species, categories, onSave, onCancel }) {
  const { token } = useAuth();
  const [form, setForm] = useState(makeEmptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleHeaderChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleLineChange(index, event) {
    const { name, value } = event.target;
    setForm((prev) => {
      const lines = [...prev.lines];
      const line = { ...lines[index], [name]: value };

      // Auto-calculate estimated_weight from estimated_count × sample_weight_avg
      const estCount = toNum(name === 'estimated_count_total' ? value : line.estimated_count_total);
      const sampAvg = toNum(name === 'sample_weight_avg_kg' ? value : line.sample_weight_avg_kg);
      if (estCount && sampAvg) {
        line.estimated_weight_total_kg = (estCount * sampAvg).toFixed(3);
      }

      // Auto-calculate sample_weight_total from sample_count × sample_weight_avg
      const sampCount = toNum(name === 'sample_count' ? value : line.sample_count);
      if (sampCount && sampAvg) {
        line.sample_weight_total_kg = (sampCount * sampAvg).toFixed(3);
      }

      lines[index] = line;
      return { ...prev, lines };
    });
  }

  function addLine() {
    setForm((prev) => ({ ...prev, lines: [...prev.lines, makeEmptyLine()] }));
  }

  function removeLine(index) {
    setForm((prev) => {
      if (prev.lines.length <= 1) return prev;
      return { ...prev, lines: prev.lines.filter((_, i) => i !== index) };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    for (const [i, line] of form.lines.entries()) {
      const n = i + 1;
      if (!line.species_id) { setError(`Redak ${n}: odaberite vrstu ribe.`); return; }
      if (!line.category_id) { setError(`Redak ${n}: odaberite kategoriju.`); return; }
      if (!toNum(line.sample_count)) { setError(`Redak ${n}: broj u uzorku mora biti veći od 0.`); return; }
      if (!toNum(line.sample_weight_avg_kg)) { setError(`Redak ${n}: prosječna masa uzorka mora biti veća od 0.`); return; }
      if (!toNum(line.estimated_count_total)) { setError(`Redak ${n}: procijenjen broj mora biti veći od 0.`); return; }
      if (!toNum(line.estimated_weight_total_kg)) { setError(`Redak ${n}: procijenjena masa mora biti veća od 0.`); return; }
    }

    setSaving(true);
    try {
      await createFishControlEventRequest(token, {
        water_object_id: Number(pondId),
        control_date: form.control_date,
        sample_area_m2: form.sample_area_m2 !== '' ? Number(form.sample_area_m2) : null,
        estimated_total_area_m2: form.estimated_total_area_m2 !== '' ? Number(form.estimated_total_area_m2) : null,
        notes: form.notes.trim() || null,
        lines: form.lines.map((line) => ({
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
      setSuccess(true);
      setForm(makeEmptyForm());
      setTimeout(() => {
        setSuccess(false);
        onSave();
      }, 800);
    } catch (err) {
      setError(err.message ?? 'Greška pri spremanju kontrole.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="pond-inline-form" onSubmit={handleSubmit}>
      <div className="pond-inline-form-title">Kontrolno uzorkovanje — unos</div>

      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">Kontrola uspješno spremljena.</p>}

      <div className="pond-inline-form-grid">
        <label>
          Datum kontrole
          <input type="date" name="control_date" value={form.control_date} onChange={handleHeaderChange} required />
        </label>
        <label>
          Uzorkovana površina (m²)
          <input
            type="number" name="sample_area_m2" value={form.sample_area_m2}
            onChange={handleHeaderChange} min="0" step="0.01" inputMode="decimal"
            placeholder="npr. 500"
          />
        </label>
        <label>
          Procijenjena ukupna površina (m²)
          <input
            type="number" name="estimated_total_area_m2" value={form.estimated_total_area_m2}
            onChange={handleHeaderChange} min="0" step="0.01" inputMode="decimal"
            placeholder="npr. 25000"
          />
        </label>
        <label className="pond-inline-form-full">
          Napomena (zaglavlje)
          <textarea name="notes" value={form.notes} onChange={handleHeaderChange} rows={2} placeholder="Opcionalna napomena o kontroli…" />
        </label>
      </div>

      <div className="pond-control-lines">
        {form.lines.map((line, index) => (
          <div key={index} className="pond-control-line">
            <div className="pond-control-line-header">
              <span>Vrsta {index + 1}</span>
              {form.lines.length > 1 && (
                <button type="button" className="btn-delete-small" onClick={() => removeLine(index)}>
                  ✕ Ukloni
                </button>
              )}
            </div>
            <div className="pond-inline-form-grid">
              <label>
                Vrsta ribe *
                <select name="species_id" value={line.species_id} onChange={(e) => handleLineChange(index, e)} required>
                  <option value="">Odaberi vrstu…</option>
                  {species.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
              <label>
                Kategorija *
                <select name="category_id" value={line.category_id} onChange={(e) => handleLineChange(index, e)} required>
                  <option value="">Odaberi kategoriju…</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </label>
              <label>
                Broj u uzorku *
                <input
                  type="number" name="sample_count" value={line.sample_count}
                  onChange={(e) => handleLineChange(index, e)} min="1" step="1"
                  inputMode="numeric" placeholder="npr. 50" required
                />
              </label>
              <label>
                Prosjek masa uzorka (kg) *
                <input
                  type="number" name="sample_weight_avg_kg" value={line.sample_weight_avg_kg}
                  onChange={(e) => handleLineChange(index, e)} min="0.001" step="0.001"
                  inputMode="decimal" placeholder="npr. 1.250" required
                />
              </label>
              <label>
                Procijenjen ukupan broj *
                <input
                  type="number" name="estimated_count_total" value={line.estimated_count_total}
                  onChange={(e) => handleLineChange(index, e)} min="1" step="1"
                  inputMode="numeric" placeholder="npr. 3000" required
                />
              </label>
              <label>
                Procijenjena ukupna masa (kg) *
                <input
                  type="number" name="estimated_weight_total_kg" value={line.estimated_weight_total_kg}
                  onChange={(e) => handleLineChange(index, e)} min="0.001" step="0.001"
                  inputMode="decimal" placeholder="auto ili unesi" required
                />
              </label>
            </div>
          </div>
        ))}
        <button type="button" className="pond-action-btn" onClick={addLine}>
          + Dodaj vrstu
        </button>
      </div>

      <div className="pond-inline-form-actions">
        <button type="submit" className="pond-action-btn pond-action-btn--primary" disabled={saving}>
          {saving ? 'Sprema se…' : 'Spremi kontrolu'}
        </button>
        <button type="button" className="pond-action-btn" onClick={onCancel}>
          Odustani
        </button>
      </div>
    </form>
  );
}
