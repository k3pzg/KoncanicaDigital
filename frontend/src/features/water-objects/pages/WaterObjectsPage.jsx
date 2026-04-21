import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/state/AuthContext';
import {
  createWaterObjectRequest,
  deleteWaterObjectRequest,
  listWaterObjectsRequest,
  updateWaterObjectRequest
} from '../api/waterObjectsApi';
import { WaterObjectsMap } from '../components/WaterObjectsMap';

const objectTypes = ['ribnjak', 'bazen', 'kanal', 'zimovnik', 'rastiliste', 'maticnjak'];

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
    setItems(result.items ?? []);
  }

  useEffect(() => {
    loadItems();
  }, []);

  const submitLabel = useMemo(() => (editingId ? 'Spremi promjene' : 'Dodaj objekt'), [editingId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    try {
      const payload = {
        ...form,
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
      setError(submitError.message || 'Greška pri spremanju.');
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
      polygon_geojson: item.polygon_geojson ?? ''
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
        <h2>Water objects</h2>
        {error ? <p className="error-text">{error}</p> : null}
        <form className="login-form" onSubmit={handleSubmit}>
          <label>Code<input value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} required /></label>
          <label>Object type
            <select value={form.object_type} onChange={(event) => setForm((prev) => ({ ...prev, object_type: event.target.value }))}>
              {objectTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label>area_total_m2<input value={form.area_total_m2} onChange={(event) => setForm((prev) => ({ ...prev, area_total_m2: event.target.value }))} /></label>
          <label>area_productive_m2<input value={form.area_productive_m2} onChange={(event) => setForm((prev) => ({ ...prev, area_productive_m2: event.target.value }))} /></label>
          <label>max_depth_m<input value={form.max_depth_m} onChange={(event) => setForm((prev) => ({ ...prev, max_depth_m: event.target.value }))} /></label>
          <label>max_volume_m3<input value={form.max_volume_m3} onChange={(event) => setForm((prev) => ({ ...prev, max_volume_m3: event.target.value }))} /></label>
          <label>centroid_wkt<textarea value={form.centroid_wkt} onChange={(event) => setForm((prev) => ({ ...prev, centroid_wkt: event.target.value }))} /></label>
          <label>polygon_geojson<textarea value={form.polygon_geojson} onChange={(event) => setForm((prev) => ({ ...prev, polygon_geojson: event.target.value }))} /></label>
          <label>notes<textarea value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} /></label>
          <label><input type="checkbox" checked={form.is_active} onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))} /> is_active</label>
          <button type="submit">{submitLabel}</button>
        </form>
      </section>

      <section className="card">
        <h3>Lista objekata</h3>
        <ul className="water-list">
          {items.map((item) => (
            <li key={item.id}>
              <strong>{item.code}</strong> ({item.object_type})
              <div className="row-actions">
                <button type="button" onClick={() => startEdit(item)}>Edit</button>
                <button type="button" onClick={() => handleDelete(item.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <WaterObjectsMap items={items} />
    </div>
  );
}
