import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/state/AuthContext';
import { listWaterObjectsRequest } from '../../water-objects/api/waterObjectsApi';
import {
  createFishEntryEventApiRequest,
  listFishCategoriesRequest,
  listFishSpeciesRequest
} from '../api/fishApi';
import { FishEntryRow, OTHER_OPTION_VALUE } from '../components/FishEntryRow';

const initialHeaderForm = {
  water_object_id: '',
  event_date: new Date().toISOString().slice(0, 10),
  source: ''
};

function createEmptyRow() {
  return {
    id: crypto.randomUUID(),
    species_id: '',
    category_id: '',
    new_species_label: '',
    new_category_label: '',
    count_in: '',
    weight_avg_kg: '',
    weight_total_kg: '',
    lastWeightInput: 'avg'
  };
}

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

function rowHasMissingRequiredFields(row) {
  if (!row.species_id || !row.category_id) {
    return true;
  }

  if (row.species_id === OTHER_OPTION_VALUE && !row.new_species_label.trim()) {
    return true;
  }

  if (row.category_id === OTHER_OPTION_VALUE && !row.new_category_label.trim()) {
    return true;
  }

  const countIn = toNumber(row.count_in);
  if (!Number.isFinite(countIn) || countIn <= 0) {
    return true;
  }

  const weightAvg = toNumber(row.weight_avg_kg);
  const weightTotal = toNumber(row.weight_total_kg);
  return (!Number.isFinite(weightAvg) || weightAvg <= 0) && (!Number.isFinite(weightTotal) || weightTotal <= 0);
}

export function FishEntryFormPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedWaterObjectId = searchParams.get('waterObjectId') ?? '';
  const [headerForm, setHeaderForm] = useState({
    ...initialHeaderForm,
    water_object_id: preselectedWaterObjectId
  });
  const [rows, setRows] = useState([createEmptyRow()]);
  const [waterObjects, setWaterObjects] = useState([]);
  const [species, setSpecies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const isSubmitDisabled = useMemo(() => {
    if (isFormDisabled) {
      return true;
    }

    if (!headerForm.water_object_id || !headerForm.event_date) {
      return true;
    }

    if (!rows.length) {
      return true;
    }

    return rows.some((row) => rowHasMissingRequiredFields(row));
  }, [headerForm.event_date, headerForm.water_object_id, isFormDisabled, rows]);

  function handleHeaderChange(event) {
    const { name, value } = event.target;
    setHeaderForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleRowChange(rowId, event) {
    const { name, value } = event.target;

    setRows((prevRows) => prevRows.map((row) => {
      if (row.id !== rowId) {
        return row;
      }

      const next = { ...row, [name]: value };

      if (name === 'species_id' && value !== OTHER_OPTION_VALUE) {
        next.new_species_label = '';
      }

      if (name === 'category_id' && value !== OTHER_OPTION_VALUE) {
        next.new_category_label = '';
      }

      if (name === 'weight_avg_kg') {
        next.lastWeightInput = 'avg';
        const count = toNumber(next.count_in);
        const weightAvg = toNumber(next.weight_avg_kg);

        if (Number.isFinite(count) && count > 0 && Number.isFinite(weightAvg) && weightAvg > 0) {
          next.weight_total_kg = String(roundTo(count * weightAvg));
        }
      }

      if (name === 'weight_total_kg') {
        next.lastWeightInput = 'total';
        const count = toNumber(next.count_in);
        const weightTotal = toNumber(next.weight_total_kg);

        if (Number.isFinite(count) && count > 0 && Number.isFinite(weightTotal) && weightTotal > 0) {
          next.weight_avg_kg = String(roundTo(weightTotal / count));
        }
      }

      if (name === 'count_in') {
        const count = toNumber(next.count_in);

        if (Number.isFinite(count) && count > 0) {
          if (next.lastWeightInput === 'avg') {
            const weightAvg = toNumber(next.weight_avg_kg);
            if (Number.isFinite(weightAvg) && weightAvg > 0) {
              next.weight_total_kg = String(roundTo(count * weightAvg));
            }
          }

          if (next.lastWeightInput === 'total') {
            const weightTotal = toNumber(next.weight_total_kg);
            if (Number.isFinite(weightTotal) && weightTotal > 0) {
              next.weight_avg_kg = String(roundTo(weightTotal / count));
            }
          }
        }
      }

      return next;
    }));
  }

  function handleAddRow() {
    setRows((prev) => [...prev, createEmptyRow()]);
  }

  function handleDeleteRow(rowId) {
    setRows((prev) => prev.filter((row) => row.id !== rowId));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!headerForm.water_object_id) {
      setError('Objekt je obavezan.');
      return;
    }

    if (!headerForm.event_date) {
      setError('Datum je obavezan.');
      return;
    }

    if (!rows.length) {
      setError('Dodajte barem jedan red unosa.');
      return;
    }

    const payloadEntries = [];

    for (const [index, row] of rows.entries()) {
      if (!row.species_id) {
        setError(`Red ${index + 1}: Vrsta je obavezna.`);
        return;
      }

      if (!row.category_id) {
        setError(`Red ${index + 1}: Kategorija je obavezna.`);
        return;
      }

      const countIn = toNumber(row.count_in);
      if (!Number.isFinite(countIn) || countIn <= 0) {
        setError(`Red ${index + 1}: Količina mora biti broj veći od 0.`);
        return;
      }

      const weightAvg = toNumber(row.weight_avg_kg);
      const weightTotal = toNumber(row.weight_total_kg);

      if ((!Number.isFinite(weightAvg) || weightAvg <= 0) && (!Number.isFinite(weightTotal) || weightTotal <= 0)) {
        setError(`Red ${index + 1}: Unesite prosječnu ili ukupnu težinu (veću od 0).`);
        return;
      }

      if (row.species_id === OTHER_OPTION_VALUE && !row.new_species_label.trim()) {
        setError(`Red ${index + 1}: Unesite novu vrstu.`);
        return;
      }

      if (row.category_id === OTHER_OPTION_VALUE && !row.new_category_label.trim()) {
        setError(`Red ${index + 1}: Unesite novu kategoriju.`);
        return;
      }

      payloadEntries.push({
        species_id: row.species_id === OTHER_OPTION_VALUE ? null : Number(row.species_id),
        category_id: row.category_id === OTHER_OPTION_VALUE ? null : Number(row.category_id),
        new_species_label: row.species_id === OTHER_OPTION_VALUE ? row.new_species_label.trim() : null,
        new_category_label: row.category_id === OTHER_OPTION_VALUE ? row.new_category_label.trim() : null,
        count_in: countIn,
        weight_avg_kg: Number.isFinite(weightAvg) && weightAvg > 0 ? weightAvg : null,
        weight_total_kg: Number.isFinite(weightTotal) && weightTotal > 0 ? weightTotal : null
      });
    }

    const payload = {
      water_object_id: Number(headerForm.water_object_id),
      event_date: headerForm.event_date,
      source: headerForm.source.trim() || null,
      entries: payloadEntries
    };

    setIsSubmitting(true);

    try {
      await createFishEntryEventApiRequest(token, payload);
      setSuccess('Unosi su uspješno spremljeni. Preusmjeravanje...');
      setHeaderForm(initialHeaderForm);
      setRows([createEmptyRow()]);

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
      {preselectedWaterObjectId && (
        <div className="pond-detail-back" style={{ marginBottom: '0.75rem' }}>
          <a
            href={`/app/ponds/${preselectedWaterObjectId}`}
            onClick={(e) => { e.preventDefault(); navigate(`/app/ponds/${preselectedWaterObjectId}`); }}
          >
            ← Natrag na ribnjak
          </a>
        </div>
      )}
      <h2>Novo poribljavanje</h2>

      {error ? <p className="error-text">{error}</p> : null}
      {success ? <p>{success}</p> : null}

      <form className="login-form" onSubmit={handleSubmit}>
        <label>
          Objekt
          <select name="water_object_id" value={headerForm.water_object_id} onChange={handleHeaderChange} disabled={isFormDisabled}>
            <option value="">Odaberite objekt</option>
            {waterObjects.map((waterObject) => (
              <option key={waterObject.id} value={waterObject.id}>
                {waterObject.code} - {waterObject.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Datum
          <input type="date" name="event_date" value={headerForm.event_date} onChange={handleHeaderChange} disabled={isFormDisabled} />
        </label>

        <label>
          Izvor ribe
          <input type="text" name="source" value={headerForm.source} onChange={handleHeaderChange} disabled={isFormDisabled} placeholder="Npr. Lokalni dobavljač" />
        </label>

        {rows.map((row, index) => (
          <FishEntryRow
            key={row.id}
            row={row}
            index={index}
            species={species}
            categories={categories}
            disabled={isFormDisabled}
            onChange={handleRowChange}
            onDelete={handleDeleteRow}
            showDelete={rows.length > 1}
          />
        ))}

        <button type="button" onClick={handleAddRow} disabled={isFormDisabled}>
          + Dodaj red
        </button>

        <button type="submit" disabled={isSubmitDisabled}>
          {isSubmitting ? 'Spremanje...' : 'Spremi unose'}
        </button>
      </form>
    </section>
  );
}
