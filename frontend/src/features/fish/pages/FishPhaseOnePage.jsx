import { useEffect, useMemo, useState } from 'react';
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

const entryEventTypes = ['nasad', 'dodatni_nasad', 'premjestaj_ulaz'];
const sourceKinds = ['interni_objekt', 'mrijestiliste', 'uvoz', 'ostalo'];

const initialEntryForm = {
  water_object_id: '',
  event_date: '',
  event_type: 'nasad',
  species_id: '',
  category_id: '',
  count_total: '',
  weight_avg_kg: '',
  weight_total_kg: '',
  source_kind: 'interni_objekt',
  source_water_object_id: '',
  source_label: '',
  notes: ''
};

const initialControlLine = {
  species_id: '',
  sample_count: '',
  sample_weight_total_kg: '',
  sample_weight_avg_kg: '',
  estimated_count_total: '',
  estimated_weight_total_kg: '',
  notes: ''
};

const initialControlForm = {
  water_object_id: '',
  control_date: '',
  sample_area_m2: '',
  estimated_total_area_m2: '',
  notes: '',
  lines: [{ ...initialControlLine }]
};

export function FishPhaseOnePage() {
  const { token } = useAuth();
  const [waterObjects, setWaterObjects] = useState([]);
  const [species, setSpecies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [entryEvents, setEntryEvents] = useState([]);
  const [controlEvents, setControlEvents] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [entryForm, setEntryForm] = useState(initialEntryForm);
  const [controlForm, setControlForm] = useState(initialControlForm);
  const [stockFilterWaterObjectId, setStockFilterWaterObjectId] = useState('');
  const [error, setError] = useState('');

  async function loadLookupsAndViews() {
    const [waterObjectsResponse, speciesResponse, categoriesResponse, entryResponse, controlResponse, stockResponse] = await Promise.all([
      listWaterObjectsRequest(token),
      listFishSpeciesRequest(token),
      listFishCategoriesRequest(token),
      listFishEntryEventsRequest(token),
      listFishControlEventsRequest(token),
      listFishStockCurrentRequest(token)
    ]);

    setWaterObjects(waterObjectsResponse.items ?? []);
    setSpecies(speciesResponse.items ?? []);
    setCategories(categoriesResponse.items ?? []);
    setEntryEvents(entryResponse.items ?? []);
    setControlEvents(controlResponse.items ?? []);
    setStockItems(stockResponse.items ?? []);
  }

  useEffect(() => {
    loadLookupsAndViews().catch((loadError) => {
      setError(loadError.message || 'Greška pri učitavanju fish modula.');
    });
  }, []);

  const stockRows = useMemo(() => stockItems, [stockItems]);

  function handleEntryChange(event) {
    const { name, value } = event.target;
    setEntryForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleControlHeaderChange(event) {
    const { name, value } = event.target;
    setControlForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleControlLineChange(index, event) {
    const { name, value } = event.target;
    setControlForm((prev) => {
      const nextLines = [...prev.lines];
      nextLines[index] = { ...nextLines[index], [name]: value };
      return { ...prev, lines: nextLines };
    });
  }

  function addControlLine() {
    setControlForm((prev) => ({
      ...prev,
      lines: [...prev.lines, { ...initialControlLine }]
    }));
  }

  function removeControlLine(index) {
    setControlForm((prev) => {
      if (prev.lines.length <= 1) {
        return prev;
      }

      return {
        ...prev,
        lines: prev.lines.filter((_, lineIndex) => lineIndex !== index)
      };
    });
  }

  async function handleEntrySubmit(event) {
    event.preventDefault();
    setError('');

    try {
      await createFishEntryEventRequest(token, entryForm);
      setEntryForm(initialEntryForm);
      await loadLookupsAndViews();
    } catch (submitError) {
      setError(submitError.message || 'Greška pri spremanju entry eventa.');
    }
  }

  async function handleControlSubmit(event) {
    event.preventDefault();
    setError('');

    try {
      await createFishControlEventRequest(token, controlForm);
      setControlForm(initialControlForm);
      await loadLookupsAndViews();
    } catch (submitError) {
      setError(submitError.message || 'Greška pri spremanju control eventa.');
    }
  }

  async function refreshStock() {
    const response = await listFishStockCurrentRequest(token, stockFilterWaterObjectId || undefined);
    setStockItems(response.items ?? []);
  }

  return (
    <div className="fish-grid">
      <section className="card">
        <h2>Fish phase 1</h2>
        {error ? <p className="error-text">{error}</p> : null}
      </section>

      <section className="card">
        <h3>Entry form</h3>
        <form className="login-form" onSubmit={handleEntrySubmit}>
          <label>
            Water object
            <select name="water_object_id" value={entryForm.water_object_id} onChange={handleEntryChange} required>
              <option value="">Odaberi objekt</option>
              {waterObjects.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}
            </select>
          </label>
          <label>Event date<input type="date" name="event_date" value={entryForm.event_date} onChange={handleEntryChange} required /></label>
          <label>
            Event type
            <select name="event_type" value={entryForm.event_type} onChange={handleEntryChange}>
              {entryEventTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label>
            Species
            <select name="species_id" value={entryForm.species_id} onChange={handleEntryChange} required>
              <option value="">Odaberi vrstu</option>
              {species.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label>
            Category
            <select name="category_id" value={entryForm.category_id} onChange={handleEntryChange} required>
              <option value="">Odaberi kategoriju</option>
              {categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label>count_total<input name="count_total" value={entryForm.count_total} onChange={handleEntryChange} required /></label>
          <label>weight_avg_kg<input name="weight_avg_kg" value={entryForm.weight_avg_kg} onChange={handleEntryChange} /></label>
          <label>weight_total_kg<input name="weight_total_kg" value={entryForm.weight_total_kg} onChange={handleEntryChange} required /></label>
          <label>
            source_kind
            <select name="source_kind" value={entryForm.source_kind} onChange={handleEntryChange}>
              {sourceKinds.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          {entryForm.source_kind === 'interni_objekt' ? (
            <label>
              source_water_object_id
              <select name="source_water_object_id" value={entryForm.source_water_object_id} onChange={handleEntryChange} required>
                <option value="">Odaberi izvorni objekt</option>
                {waterObjects.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}
              </select>
            </label>
          ) : null}
          <label>source_label<textarea name="source_label" value={entryForm.source_label} onChange={handleEntryChange} /></label>
          <label>notes<textarea name="notes" value={entryForm.notes} onChange={handleEntryChange} /></label>
          <button type="submit">Spremi entry event</button>
        </form>
      </section>

      <section className="card">
        <h3>Control form</h3>
        <form className="login-form" onSubmit={handleControlSubmit}>
          <label>
            Water object
            <select name="water_object_id" value={controlForm.water_object_id} onChange={handleControlHeaderChange} required>
              <option value="">Odaberi objekt</option>
              {waterObjects.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}
            </select>
          </label>
          <label>control_date<input type="date" name="control_date" value={controlForm.control_date} onChange={handleControlHeaderChange} required /></label>
          <label>sample_area_m2<input name="sample_area_m2" value={controlForm.sample_area_m2} onChange={handleControlHeaderChange} /></label>
          <label>estimated_total_area_m2<input name="estimated_total_area_m2" value={controlForm.estimated_total_area_m2} onChange={handleControlHeaderChange} /></label>
          <label>notes<textarea name="notes" value={controlForm.notes} onChange={handleControlHeaderChange} /></label>

          {controlForm.lines.map((line, index) => (
            <fieldset key={index} className="control-line-group">
              <legend>Line {index + 1}</legend>
              <label>
                species
                <select name="species_id" value={line.species_id} onChange={(event) => handleControlLineChange(index, event)} required>
                  <option value="">Odaberi vrstu</option>
                  {species.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </label>
              <label>sample_count<input name="sample_count" value={line.sample_count} onChange={(event) => handleControlLineChange(index, event)} required /></label>
              <label>sample_weight_total_kg<input name="sample_weight_total_kg" value={line.sample_weight_total_kg} onChange={(event) => handleControlLineChange(index, event)} /></label>
              <label>sample_weight_avg_kg<input name="sample_weight_avg_kg" value={line.sample_weight_avg_kg} onChange={(event) => handleControlLineChange(index, event)} required /></label>
              <label>estimated_count_total<input name="estimated_count_total" value={line.estimated_count_total} onChange={(event) => handleControlLineChange(index, event)} required /></label>
              <label>estimated_weight_total_kg<input name="estimated_weight_total_kg" value={line.estimated_weight_total_kg} onChange={(event) => handleControlLineChange(index, event)} required /></label>
              <label>notes<textarea name="notes" value={line.notes} onChange={(event) => handleControlLineChange(index, event)} /></label>
              <button type="button" onClick={() => removeControlLine(index)}>Ukloni line</button>
            </fieldset>
          ))}

          <button type="button" onClick={addControlLine}>Dodaj line</button>
          <button type="submit">Spremi control event</button>
        </form>
      </section>

      <section className="card fish-full-width">
        <h3>Current stock</h3>
        <div className="row-actions">
          <select value={stockFilterWaterObjectId} onChange={(event) => setStockFilterWaterObjectId(event.target.value)}>
            <option value="">Svi objekti</option>
            {waterObjects.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}
          </select>
          <button type="button" onClick={refreshStock}>Refresh</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>object code</th><th>species</th><th>count_total</th><th>weight_avg_kg</th><th>weight_total_kg</th><th>last_refresh_type</th><th>last_refresh_date</th>
              </tr>
            </thead>
            <tbody>
              {stockRows.map((item) => (
                <tr key={item.id}>
                  <td>{item.water_object_code}</td><td>{item.species_label}</td><td>{item.count_total}</td><td>{item.weight_avg_kg}</td><td>{item.weight_total_kg}</td><td>{item.last_refresh_type}</td><td>{item.last_refresh_date?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card fish-full-width">
        <h3>Entry history</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>date</th><th>object</th><th>type</th><th>species</th><th>category</th><th>count_total</th><th>weight_total_kg</th><th>source</th><th>source_label</th>
              </tr>
            </thead>
            <tbody>
              {entryEvents.map((item) => (
                <tr key={item.id}>
                  <td>{item.event_date?.slice(0, 10)}</td>
                  <td>{item.water_object_code}</td>
                  <td>{item.event_type}</td>
                  <td>{item.species_label}</td>
                  <td>{item.category_label}</td>
                  <td>{item.count_total}</td>
                  <td>{item.weight_total_kg}</td>
                  <td>{item.source_water_object_code ?? item.source_kind}</td>
                  <td>{item.source_label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card fish-full-width">
        <h3>Control history</h3>
        <ul className="water-list">
          {controlEvents.map((event) => (
            <li key={event.id}>
              <strong>{event.control_date?.slice(0, 10)}</strong> · {event.water_object_code}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
