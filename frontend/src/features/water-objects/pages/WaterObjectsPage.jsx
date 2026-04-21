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

  function handleFieldChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    try {
      const payload = {
        ...form,
        code: form.code,
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
          <label>
            Code
            <input
              name="code"
              value={form.code}
              onChange={handleFieldChange}
              required
            />
          </label>
          <label>
            Object type
            <select name="object_type" value={form.object_type} onChange={handleFieldChange}>
              {objectTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            area_total_m2
            <input name="area_total_m2" value={form.area_total_m2} onChange={handleFieldChange} />
          </label>
          <label>
            area_productive_m2
            <input name="area_productive_m2" value={form.area_productive_m2} onChange={handleFieldChange} />
          </label>
          <label>
            max_depth_m
            <input name="max_depth_m" value={form.max_depth_m} onChange={handleFieldChange} />
          </label>
          <label>
            max_volume_m3
            <input name="max_volume_m3" value={form.max_volume_m3} onChange={handleFieldChange} />
          </label>
          <label>
            centroid_wkt
            <textarea name="centroid_wkt" value={form.centroid_wkt} onChange={handleFieldChange} />
          </label>
          <label>
            polygon_geojson
            <textarea name="polygon_geojson" value={form.polygon_geojson} onChange={handleFieldChange} />
          </label>
          <label>
            notes
            <textarea name="notes" value={form.notes} onChange={handleFieldChange} />
          </label>
          <label>
            <input name="is_active" type="checkbox" checked={form.is_active} onChange={handleFieldChange} /> is_active
          </label>
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
                <button type="button" onClick={() => startEdit(item)}>
                  Edit
                </button>
                <button type="button" onClick={() => handleDelete(item.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <WaterObjectsMap items={items} />
    </div>
  );
}
