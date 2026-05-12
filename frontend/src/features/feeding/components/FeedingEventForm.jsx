import { useState } from 'react';
import { useAuth } from '../../auth/state/AuthContext';
import { createFeedingEventRequest } from '../api/feedingApi';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function makeEmpty(pondId) {
  return {
    event_date: todayIso(),
    feed_type_id: '',
    quantity_kg: '',
    note: ''
  };
}

export function FeedingEventForm({ pondId, waterObjects, feedTypes, feedStock, onSave, onCancel }) {
  const { token } = useAuth();
  const [form, setForm] = useState(() => makeEmpty(pondId));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const effectivePondId = pondId ?? form.water_object_id ?? '';

  const selectedStock = feedTypes && feedStock
    ? feedStock.find((s) => String(s.feed_type_id) === String(form.feed_type_id)) ?? null
    : null;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const qty = Number(form.quantity_kg);
    if (!form.feed_type_id) { setError('Odaberite vrstu hrane.'); return; }
    if (!qty || qty <= 0) { setError('Količina mora biti veća od 0.'); return; }

    if (selectedStock && qty > selectedStock.quantity_kg) {
      setError(
        `Nedovoljno zaliha: na stanju ${Number(selectedStock.quantity_kg).toLocaleString('hr-HR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg.`
      );
      return;
    }

    const waterObjId = pondId ?? Number(form.water_object_id);
    if (!waterObjId) { setError('Odaberite vodni objekt.'); return; }

    setSaving(true);
    try {
      await createFeedingEventRequest(token, {
        feed_type_id: Number(form.feed_type_id),
        water_object_id: Number(waterObjId),
        quantity_kg: qty,
        event_date: form.event_date,
        note: form.note.trim() || null
      });
      setSuccess(true);
      setForm(makeEmpty(pondId));
      setTimeout(() => {
        setSuccess(false);
        onSave();
      }, 800);
    } catch (err) {
      setError(err.message ?? 'Greška pri spremanju hranjenja.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="pond-inline-form" onSubmit={handleSubmit}>
      <div className="pond-inline-form-title">Hranjenje — evidencija</div>

      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">Hranjenje uspješno evidentirano.</p>}

      <div className="pond-inline-form-grid">
        <label>
          Datum *
          <input type="date" name="event_date" value={form.event_date} onChange={handleChange} required />
        </label>

        {!pondId && waterObjects && (
          <label>
            Vodni objekt *
            <select name="water_object_id" value={form.water_object_id ?? ''} onChange={handleChange} required>
              <option value="">Odaberi objekt…</option>
              {waterObjects.map((wo) => (
                <option key={wo.id} value={wo.id}>{wo.code}</option>
              ))}
            </select>
          </label>
        )}

        <label>
          Vrsta hrane *
          <select name="feed_type_id" value={form.feed_type_id} onChange={handleChange} required>
            <option value="">Odaberi vrstu hrane…</option>
            {(feedTypes ?? []).map((ft) => (
              <option key={ft.id} value={ft.id}>{ft.name}</option>
            ))}
          </select>
        </label>

        {selectedStock !== null && form.feed_type_id && (
          <div className="pond-stock-hint">
            Na zalihi: <strong>
              {Number(selectedStock?.quantity_kg ?? 0).toLocaleString('hr-HR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg
            </strong>
          </div>
        )}

        <label>
          Količina (kg) *
          <input
            type="number"
            name="quantity_kg"
            value={form.quantity_kg}
            onChange={handleChange}
            min="0.001"
            step="0.001"
            inputMode="decimal"
            placeholder="npr. 50.000"
            required
          />
        </label>

        <label className="pond-inline-form-full">
          Napomena
          <textarea
            name="note"
            value={form.note}
            onChange={handleChange}
            rows={2}
            placeholder="Opcionalna napomena…"
          />
        </label>
      </div>

      <div className="pond-inline-form-actions">
        <button type="submit" className="pond-action-btn pond-action-btn--primary" disabled={saving}>
          {saving ? 'Sprema se…' : 'Spremi hranjenje'}
        </button>
        {onCancel && (
          <button type="button" className="pond-action-btn" onClick={onCancel}>
            Odustani
          </button>
        )}
      </div>
    </form>
  );
}
