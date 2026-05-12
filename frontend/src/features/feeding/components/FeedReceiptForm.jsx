import { useState } from 'react';
import { useAuth } from '../../auth/state/AuthContext';
import { createFeedReceiptRequest } from '../api/feedingApi';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function makeEmpty() {
  return {
    feed_type_id: '',
    new_feed_type_name: '',
    quantity_kg: '',
    supplier: '',
    receipt_date: todayIso(),
    note: ''
  };
}

export function FeedReceiptForm({ feedTypes, onSave, onCancel }) {
  const { token } = useAuth();
  const [form, setForm] = useState(makeEmpty);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const isNewType = form.feed_type_id === '__new__';

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const qty = Number(form.quantity_kg);
    if (!form.feed_type_id) { setError('Odaberite vrstu hrane.'); return; }
    if (isNewType && !form.new_feed_type_name.trim()) { setError('Unesite naziv nove vrste hrane.'); return; }
    if (!qty || qty <= 0) { setError('Količina mora biti veća od 0.'); return; }
    if (!form.receipt_date) { setError('Datum primitka je obavezan.'); return; }

    setSaving(true);
    try {
      const payload = {
        quantity_kg: qty,
        supplier: form.supplier.trim() || null,
        receipt_date: form.receipt_date,
        note: form.note.trim() || null
      };

      if (isNewType) {
        payload.new_feed_type_name = form.new_feed_type_name.trim();
      } else {
        payload.feed_type_id = Number(form.feed_type_id);
      }

      await createFeedReceiptRequest(token, payload);
      setSuccess(true);
      setForm(makeEmpty());
      setTimeout(() => {
        setSuccess(false);
        onSave();
      }, 800);
    } catch (err) {
      setError(err.message ?? 'Greška pri spremanju primitka hrane.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="pond-inline-form" onSubmit={handleSubmit}>
      <div className="pond-inline-form-title">Primitak hrane — nova zaliha</div>

      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">Primitak hrane uspješno evidentiran.</p>}

      <div className="pond-inline-form-grid">
        <label>
          Vrsta hrane *
          <select name="feed_type_id" value={form.feed_type_id} onChange={handleChange} required>
            <option value="">Odaberi vrstu hrane…</option>
            {(feedTypes ?? []).map((ft) => (
              <option key={ft.id} value={ft.id}>{ft.name}</option>
            ))}
            <option value="__new__">+ Nova vrsta hrane…</option>
          </select>
        </label>

        {isNewType && (
          <label>
            Naziv nove vrste *
            <input
              type="text"
              name="new_feed_type_name"
              value={form.new_feed_type_name}
              onChange={handleChange}
              placeholder="npr. Granule 3mm"
              maxLength={100}
            />
          </label>
        )}

        <label>
          Datum primitka *
          <input type="date" name="receipt_date" value={form.receipt_date} onChange={handleChange} required />
        </label>

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
            placeholder="npr. 500.000"
            required
          />
        </label>

        <label>
          Dobavljač
          <input
            type="text"
            name="supplier"
            value={form.supplier}
            onChange={handleChange}
            placeholder="Opcionalno"
            maxLength={200}
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
          {saving ? 'Sprema se…' : 'Spremi primitak'}
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
