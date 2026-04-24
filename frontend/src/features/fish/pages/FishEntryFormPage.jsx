import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/state/AuthContext';
import { listWaterObjectsRequest } from '../../water-objects/api/waterObjectsApi';
import {
  createFishEntryEventApiRequest,
  listFishCategoriesRequest,
  listFishSpeciesRequest
} from '../api/fishApi';

const initialForm = {
  water_object_id: '',
  species_id: '',
  category_id: '',
  event_date: '',
  count_in: '',
  weight_avg_kg: '',
  weight_total_kg: ''
};

function toNumber(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundTo(value, precision = 4) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function FishEntryFormPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [waterObjects, setWaterObjects] = useState([]);
  const [species, setSpecies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastWeightInput, setLastWeightInput] = useState('avg');

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError('');

      try {
        const [waterObjectsResponse, speciesResponse, categoriesResponse] = await Promise.all([
          listWaterObjectsRequest(token),
          listFishSpeciesRequest(token),
          listFishCategoriesRequest(token)
        ]);

        setWaterObjects(waterObjectsResponse.items ?? []);
        setSpecies(speciesResponse.items ?? []);
        setCategories(categoriesResponse.items ?? []);
      } catch (loadError) {
        setError(loadError.message || 'Neuspješno učitavanje podataka forme.');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [token]);

  const isFormDisabled = isLoading || isSubmitting;

  const canCalculateTotal = useMemo(() => {
    const count = toNumber(form.count_in);
    const weightAvg = toNumber(form.weight_avg_kg);
    return Number.isFinite(count) && count > 0 && Number.isFinite(weightAvg) && weightAvg > 0;
  }, [form.count_in, form.weight_avg_kg]);

  const canCalculateAverage = useMemo(() => {
    const count = toNumber(form.count_in);
    const weightTotal = toNumber(form.weight_total_kg);
    return Number.isFinite(count) && count > 0 && Number.isFinite(weightTotal) && weightTotal > 0;
  }, [form.count_in, form.weight_total_kg]);

  function handleFieldChange(event) {
    const { name, value } = event.target;

    setForm((prev) => {
      const next = { ...prev, [name]: value };

      if (name === 'weight_avg_kg') {
        setLastWeightInput('avg');
        const count = toNumber(next.count_in);
        const weightAvg = toNumber(next.weight_avg_kg);

        if (Number.isFinite(count) && count > 0 && Number.isFinite(weightAvg) && weightAvg > 0) {
          next.weight_total_kg = String(roundTo(count * weightAvg));
        }
      }

      if (name === 'weight_total_kg') {
        setLastWeightInput('total');
        const count = toNumber(next.count_in);
        const weightTotal = toNumber(next.weight_total_kg);

        if (Number.isFinite(count) && count > 0 && Number.isFinite(weightTotal) && weightTotal > 0) {
          next.weight_avg_kg = String(roundTo(weightTotal / count));
        }
      }

      if (name === 'count_in') {
        const count = toNumber(next.count_in);

        if (Number.isFinite(count) && count > 0) {
          if (lastWeightInput === 'avg') {
            const weightAvg = toNumber(next.weight_avg_kg);
            if (Number.isFinite(weightAvg) && weightAvg > 0) {
              next.weight_total_kg = String(roundTo(count * weightAvg));
            }
          }

          if (lastWeightInput === 'total') {
            const weightTotal = toNumber(next.weight_total_kg);
            if (Number.isFinite(weightTotal) && weightTotal > 0) {
              next.weight_avg_kg = String(roundTo(weightTotal / count));
            }
          }
        }
      }

      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.water_object_id) {
      setError('Objekt je obavezan.');
      return;
    }

    if (!form.species_id) {
      setError('Vrsta je obavezna.');
      return;
    }

    if (!form.category_id) {
      setError('Kategorija je obavezna.');
      return;
    }

    if (!form.event_date) {
      setError('Datum je obavezan.');
      return;
    }

    const countIn = toNumber(form.count_in);
    if (!Number.isFinite(countIn) || countIn <= 0) {
      setError('Količina mora biti broj veći od 0.');
      return;
    }

    const weightAvg = toNumber(form.weight_avg_kg);
    const weightTotal = toNumber(form.weight_total_kg);

    if ((!Number.isFinite(weightAvg) || weightAvg <= 0) && (!Number.isFinite(weightTotal) || weightTotal <= 0)) {
      setError('Unesite prosječnu ili ukupnu težinu (veću od 0).');
      return;
    }

    const payload = {
      water_object_id: Number(form.water_object_id),
      species_id: Number(form.species_id),
      category_id: Number(form.category_id),
      event_date: form.event_date,
      count_in: countIn,
      weight_avg_kg: Number.isFinite(weightAvg) && weightAvg > 0 ? weightAvg : null,
      weight_total_kg: Number.isFinite(weightTotal) && weightTotal > 0 ? weightTotal : null
    };

    setIsSubmitting(true);

    try {
      await createFishEntryEventApiRequest(token, payload);
      setSuccess('Unos je uspješno spremljen. Preusmjeravanje...');
      setForm(initialForm);

      setTimeout(() => {
        navigate('/app/fish-stock');
      }, 800);
    } catch (submitError) {
      setError(submitError.message || 'Neuspješno spremanje unosa.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="card fish-stock-card">
      <h2>Novi unos poribljavanja</h2>
      <p>Dodavanje fish_entry_event zapisa.</p>

      {error ? <p className="error-text">{error}</p> : null}
      {success ? <p>{success}</p> : null}

      <form className="login-form" onSubmit={handleSubmit}>
        <label>
          Objekt
          <select name="water_object_id" value={form.water_object_id} onChange={handleFieldChange} disabled={isFormDisabled}>
            <option value="">Odaberite objekt</option>
            {waterObjects.map((waterObject) => (
              <option key={waterObject.id} value={waterObject.id}>
                {waterObject.code} - {waterObject.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Vrsta
          <select name="species_id" value={form.species_id} onChange={handleFieldChange} disabled={isFormDisabled}>
            <option value="">Odaberite vrstu</option>
            {species.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Kategorija
          <select name="category_id" value={form.category_id} onChange={handleFieldChange} disabled={isFormDisabled}>
            <option value="">Odaberite kategoriju</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Datum
          <input type="date" name="event_date" value={form.event_date} onChange={handleFieldChange} disabled={isFormDisabled} />
        </label>

        <label>
          Količina
          <input type="number" min="0.01" step="0.01" name="count_in" value={form.count_in} onChange={handleFieldChange} disabled={isFormDisabled} />
        </label>

        <label>
          Prosječna težina
          <input
            type="number"
            min="0.0001"
            step="0.0001"
            name="weight_avg_kg"
            value={form.weight_avg_kg}
            onChange={handleFieldChange}
            disabled={isFormDisabled}
          />
        </label>

        <label>
          Ukupna težina
          <input
            type="number"
            min="0.0001"
            step="0.0001"
            name="weight_total_kg"
            value={form.weight_total_kg}
            onChange={handleFieldChange}
            disabled={isFormDisabled}
          />
        </label>

        <button type="submit" disabled={isFormDisabled || (!canCalculateAverage && !canCalculateTotal)}>
          {isSubmitting ? 'Spremanje...' : 'Spremi unos'}
        </button>
      </form>
    </section>
  );
}
