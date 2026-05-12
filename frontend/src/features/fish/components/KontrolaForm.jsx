import { useState } from 'react';
import { useAuth } from '../../auth/state/AuthContext';
import { createFishControlEventRequest } from '../api/fishApi';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function toPositive(v) {
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
      const sampAvg = toPositive(name === 'sample_weight_avg_kg' ? value : line.sample_weight_avg_kg);
      const sampCount = toPositive(name === 'sample_count' ? value : line.sample_count);
      const estCount = toPositive(name === 'estimated_count_total' ? value : line.estimated_count_total);
      if (sampCount && sampAvg) line.sample_weight_total_kg = (sampCount * sampAvg).toFixed(3);
      if (estCount && sampAvg) line.estimated_weight_total_kg = (estCount * sampAvg).toFixed(3);
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
      if (!toPositive(line.sample_count)) { setError(`Redak ${n}: broj u uzorku mora biti > 0.`); return; }
      if (!toPositive(line.sample_weight_avg_kg)) { setError(`Redak ${n}: prosječna masa mora biti > 0.`); return; }
      if (!toPositive(line.estimated_count_total)) { setError(`Redak ${n}: procijenjen broj mora biti > 0.`); return; }
      if (!toPositive(line.estimated_weight_total_kg)) { setError(`Redak ${n}: procijenjena masa mora biti > 0.`); return; }
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
      setTimeout(() => { setSuccess(false); onSave(); }, 800);
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

      {/* Header fields */}
      <div className="pond-inline-form-grid">
        <label>
          Datum kontrole *
          <input type="date" name="control_date" value={form.control_date} onChange={handleHeaderChange} required />
        </label>
        <label>
          Uzorkovana površina (m²)
          <input type="number" name="sample_area_m2" min="0" step="0.01" inputMode="decimal"
            value={form.sample_area_m2} onChange={handleHeaderChange} placeholder="npr. 500" />
        </label>
        <label>
          Ukupna površina procjene (m²)
          <input type="number" name="estimated_total_area_m2" min="0" step="0.01" inputMode="decimal"
            value={form.estimated_total_area_m2} onChange={handleHeaderChange} placeholder="npr. 25000" />
        </label>
        <label className="pond-inline-form-full">
          Napomena (zaglavlje)
          <textarea name="notes" rows={2} value={form.notes} onChange={handleHeaderChange}
            placeholder="Opcionalna napomena o kontroli…" />
        </label>
      </div>

      {/* Line cards */}
      <div className="pond-control-lines">
        {form.lines.map((line, index) => (
          <div key={index} className="control-line-card">
            <div className="control-line-card-header">
              <span className="control-line-card-title">Vrsta {index + 1}</span>
              {form.lines.length > 1 && (
                <button type="button" className="btn btn--sm btn--danger" onClick={() => removeLine(index)}>
                  Ukloni
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

              <div className="control-subsection">Uzorak</div>

              <label>
                Broj u uzorku *
                <input type="number" name="sample_count" min="1" step="1" inputMode="numeric"
                  value={line.sample_count} onChange={(e) => handleLineChange(index, e)}
                  required placeholder="npr. 50" />
              </label>
              <label>
                Prosj. masa uzorka (kg) *
                <input type="number" name="sample_weight_avg_kg" min="0.001" step="0.001" inputMode="decimal"
                  value={line.sample_weight_avg_kg} onChange={(e) => handleLineChange(index, e)}
                  required placeholder="npr. 1.250" />
              </label>
              <label>
                Ukupna masa uzorka (kg)
                <input
                  type="number" name="sample_weight_total_kg" min="0" step="0.001" inputMode="decimal"
                  value={line.sample_weight_total_kg} onChange={(e) => handleLineChange(index, e)}
                  placeholder="automatski"
                  readOnly={!!(line.sample_count && line.sample_weight_avg_kg)}
                  style={line.sample_count && line.sample_weight_avg_kg
                    ? { background: 'var(--color-surface-subtle)', color: 'var(--color-text-muted)' }
                    : undefined}
                />
              </label>

              <div className="control-subsection">Procjena za cijeli ribnjak</div>

              <label>
                Procijenjen ukupan broj *
                <input type="number" name="estimated_count_total" min="1" step="1" inputMode="numeric"
                  value={line.estimated_count_total} onChange={(e) => handleLineChange(index, e)}
                  required placeholder="npr. 3000" />
              </label>
              <label>
                Procijenjena ukupna masa (kg) *
                <input type="number" name="estimated_weight_total_kg" min="0.001" step="0.001" inputMode="decimal"
                  value={line.estimated_weight_total_kg} onChange={(e) => handleLineChange(index, e)}
                  required placeholder="automatski ili unesi"
                  style={line.estimated_count_total && line.sample_weight_avg_kg
                    ? { background: 'var(--color-surface-subtle)', color: 'var(--color-text-muted)' }
                    : undefined}
                />
              </label>

              <label className="pond-inline-form-full">
                Napomena (redak)
                <textarea name="notes" rows={1} value={line.notes} onChange={(e) => handleLineChange(index, e)}
                  placeholder="Opcionalno…" />
              </label>
            </div>
          </div>
        ))}

        <button type="button" className="btn" onClick={addLine}>
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
