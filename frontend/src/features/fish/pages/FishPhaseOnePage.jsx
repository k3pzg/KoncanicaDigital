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
      setError(loadError.message || 'Greška pri učitavanju modula ribe.');
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
      setError(submitError.message || 'Greška pri spremanju unosa.');
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
      setError(submitError.message || 'Greška pri spremanju kontrole.');
    }
  }

  async function refreshStock() {
    const response = await listFishStockCurrentRequest(token, stockFilterWaterObjectId || undefined);
    setStockItems(response.items ?? []);
  }

  return (
    <div className="fish-grid">
      <section className="card">
        <h2>Riba - faza 1</h2>
        {error ? <p className="error-text">{error}</p> : null}
      </section>

      <section className="card">
        <h3>Unos događaja</h3>
        <form className="login-form" onSubmit={handleEntrySubmit}>
          <label>
            Vodni objekt
            <select name="water_object_id" value={entryForm.water_object_id} onChange={handleEntryChange} required>
              <option value="">Odaberi objekt</option>
              {waterObjects.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}
            </select>
          </label>
          <label>Datum događaja<input type="date" name="event_date" value={entryForm.event_date} onChange={handleEntryChange} required /></label>
          <label>
            Vrsta događaja
            <select name="event_type" value={entryForm.event_type} onChange={handleEntryChange}>
              {entryEventTypes.map((type) => (
                <option key={type} value={type}>
                  {type === 'nasad' ? 'Nasad' : type === 'dodatni_nasad' ? 'Dodatni nasad' : 'Premještaj ulaz'}
                </option>
              ))}
            </select>
          </label>
          <label>
            Vrsta ribe
            <select name="species_id" value={entryForm.species_id} onChange={handleEntryChange} required>
              <option value="">Odaberi vrstu</option>
              {species.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label>
            Kategorija
            <select name="category_id" value={entryForm.category_id} onChange={handleEntryChange} required>
              <option value="">Odaberi kategoriju</option>
              {categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label>Ukupno komada<input name="count_total" value={entryForm.count_total} onChange={handleEntryChange} required /></label>
          <label>Prosječna masa (kg)<input name="weight_avg_kg" value={entryForm.weight_avg_kg} onChange={handleEntryChange} /></label>
          <label>Ukupna masa (kg)<input name="weight_total_kg" value={entryForm.weight_total_kg} onChange={handleEntryChange} required /></label>
          <label>
            Vrsta podrijetla
            <select name="source_kind" value={entryForm.source_kind} onChange={handleEntryChange}>
              {sourceKinds.map((item) => (
                <option key={item} value={item}>
                  {item === 'interni_objekt' ? 'Interni objekt' : item === 'mrijestiliste' ? 'Mrijestilište' : item === 'uvoz' ? 'Uvoz' : 'Ostalo'}
                </option>
              ))}
            </select>
          </label>
          {entryForm.source_kind === 'interni_objekt' ? (
            <label>
              Izvorni vodni objekt
              <select name="source_water_object_id" value={entryForm.source_water_object_id} onChange={handleEntryChange} required>
                <option value="">Odaberi izvorni objekt</option>
                {waterObjects.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}
              </select>
            </label>
          ) : null}
          <label>Opis podrijetla<textarea name="source_label" value={entryForm.source_label} onChange={handleEntryChange} /></label>
          <label>Napomena<textarea name="notes" value={entryForm.notes} onChange={handleEntryChange} /></label>
          <button type="submit">Spremi unos</button>
        </form>
      </section>

      <section className="card">
        <h3>Unos kontrole</h3>
        <form className="login-form" onSubmit={handleControlSubmit}>
          <label>
            Vodni objekt
            <select name="water_object_id" value={controlForm.water_object_id} onChange={handleControlHeaderChange} required>
              <option value="">Odaberi objekt</option>
              {waterObjects.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}
            </select>
          </label>
          <label>Datum kontrole<input type="date" name="control_date" value={controlForm.control_date} onChange={handleControlHeaderChange} required /></label>
          <label>Uzorkovana površina (m²)<input name="sample_area_m2" value={controlForm.sample_area_m2} onChange={handleControlHeaderChange} /></label>
          <label>Procijenjena ukupna površina (m²)<input name="estimated_total_area_m2" value={controlForm.estimated_total_area_m2} onChange={handleControlHeaderChange} /></label>
          <label>Napomena<textarea name="notes" value={controlForm.notes} onChange={handleControlHeaderChange} /></label>

          {controlForm.lines.map((line, index) => (
            <fieldset key={index} className="control-line-group">
              <legend>Redak {index + 1}</legend>
              <label>
                Vrsta ribe
                <select name="species_id" value={line.species_id} onChange={(event) => handleControlLineChange(index, event)} required>
                  <option value="">Odaberi vrstu</option>
                  {species.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </label>
              <label>Broj u uzorku<input name="sample_count" value={line.sample_count} onChange={(event) => handleControlLineChange(index, event)} required /></label>
              <label>Ukupna masa uzorka (kg)<input name="sample_weight_total_kg" value={line.sample_weight_total_kg} onChange={(event) => handleControlLineChange(index, event)} /></label>
              <label>Prosječna masa uzorka (kg)<input name="sample_weight_avg_kg" value={line.sample_weight_avg_kg} onChange={(event) => handleControlLineChange(index, event)} required /></label>
              <label>Procijenjen ukupan broj<input name="estimated_count_total" value={line.estimated_count_total} onChange={(event) => handleControlLineChange(index, event)} required /></label>
              <label>Procijenjena ukupna masa (kg)<input name="estimated_weight_total_kg" value={line.estimated_weight_total_kg} onChange={(event) => handleControlLineChange(index, event)} required /></label>
              <label>Napomena<textarea name="notes" value={line.notes} onChange={(event) => handleControlLineChange(index, event)} /></label>
              <button type="button" onClick={() => removeControlLine(index)}>Ukloni redak</button>
            </fieldset>
          ))}

          <button type="button" onClick={addControlLine}>Dodaj redak</button>
          <button type="submit">Spremi kontrolu</button>
        </form>
      </section>

      <section className="card fish-full-width">
        <h3>Trenutno stanje</h3>
        <div className="row-actions">
          <select value={stockFilterWaterObjectId} onChange={(event) => setStockFilterWaterObjectId(event.target.value)}>
            <option value="">Svi objekti</option>
            {waterObjects.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}
          </select>
          <button type="button" onClick={refreshStock}>Osvježi</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Šifra objekta</th><th>Vrsta ribe</th><th>Ukupno komada</th><th>Prosječna masa (kg)</th><th>Ukupna masa (kg)</th><th>Zadnje osvježenje</th><th>Datum osvježenja</th>
              </tr>
            </thead>
            <tbody>
              {stockRows.map((item) => (
                <tr key={item.id}>
                  <td>{item.water_object_code}</td><td>{item.species_label}</td><td>{item.count_total}</td><td>{item.weight_avg_kg}</td><td>{item.weight_total_kg}</td><td>{item.last_refresh_type === 'entry' ? 'Unos' : item.last_refresh_type === 'control' ? 'Kontrola' : 'Ručno'}</td><td>{item.last_refresh_date?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card fish-full-width">
        <h3>Povijest unosa</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Datum</th><th>Objekt</th><th>Vrsta događaja</th><th>Vrsta ribe</th><th>Kategorija</th><th>Ukupno komada</th><th>Ukupna masa (kg)</th><th>Podrijetlo</th><th>Opis podrijetla</th>
              </tr>
            </thead>
            <tbody>
              {entryEvents.map((item) => (
                <tr key={item.id}>
                  <td>{item.event_date?.slice(0, 10)}</td>
                  <td>{item.water_object_code}</td>
                  <td>{item.event_type === 'nasad' ? 'Nasad' : item.event_type === 'dodatni_nasad' ? 'Dodatni nasad' : 'Premještaj ulaz'}</td>
                  <td>{item.species_label}</td>
                  <td>{item.category_label}</td>
                  <td>{item.count_total}</td>
                  <td>{item.weight_total_kg}</td>
                  <td>{item.source_water_object_code ?? (item.source_kind === 'interni_objekt' ? 'Interni objekt' : item.source_kind === 'mrijestiliste' ? 'Mrijestilište' : item.source_kind === 'uvoz' ? 'Uvoz' : 'Ostalo')}</td>
                  <td>{item.source_label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card fish-full-width">
        <h3>Povijest kontrola</h3>
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
