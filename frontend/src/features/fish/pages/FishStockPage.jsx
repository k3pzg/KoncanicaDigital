import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/state/AuthContext';
import { listWaterObjectsRequest } from '../../water-objects/api/waterObjectsApi';
import {
  createFishExitEventRequest,
  listFishCategoriesRequest,
  listFishSpeciesRequest,
  listFishStockAggregateRequest
} from '../api/fishApi';

function formatInteger(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return '-';
  }

  return parsed.toLocaleString('hr-HR', { maximumFractionDigits: 0 });
}

function formatDecimal(value, digits) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return '-';
  }

  return parsed.toLocaleString('hr-HR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function compareText(left, right, direction) {
  return direction === 'desc'
    ? right.localeCompare(left, 'hr-HR')
    : left.localeCompare(right, 'hr-HR');
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const SPECIES_DISPLAY = {
  saran_goli: 'Šaran (goli)',
  tolstolobik_bijeli: 'Tolstolobik bijeli',
  tolstolobik_sivi: 'Tolstolobik sivi',
  smud: 'Smuđ',
  stuka: 'Štuka'
};

const CATEGORY_DISPLAY = {
  dvogodisnja_mladj: 'Dvogodišnja mlađ',
  jednogodisnja_mladj: 'Jednogodišnja mlađ',
  mjesecnjak: 'Mjesečnjak',
  matica: 'Matica',
  konzum: 'Konzum'
};

function capitalizeWords(text) {
  return String(text)
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatSpeciesName(code) {
  if (!code) {
    return '-';
  }

  const normalizedCode = String(code).trim().toLowerCase();
  if (SPECIES_DISPLAY[normalizedCode]) {
    return SPECIES_DISPLAY[normalizedCode];
  }

  return capitalizeWords(normalizedCode.replaceAll('_', ' '));
}

function formatCategoryName(code) {
  if (!code) {
    return 'Bez kategorije';
  }

  const normalizedCode = String(code).trim().toLowerCase();
  if (CATEGORY_DISPLAY[normalizedCode]) {
    return CATEGORY_DISPLAY[normalizedCode];
  }

  return capitalizeWords(normalizedCode.replaceAll('_', ' '));
}

const initialExitForm = {
  water_object_id: '',
  event_date: '',
  species_id: '',
  category_id: '',
  count_total: '',
  weight_avg_kg: '',
  weight_total_kg: '',
  notes: ''
};

export function FishStockPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState([]);
  const [waterObjects, setWaterObjects] = useState([]);
  const [speciesOptions, setSpeciesOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingExit, setIsSubmittingExit] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [waterSort, setWaterSort] = useState('asc');
  const [speciesSort, setSpeciesSort] = useState('asc');
  const [search, setSearch] = useState('');
  const [exitForm, setExitForm] = useState(initialExitForm);

  async function loadFishStockAndLookups() {
    setIsLoading(true);
    setError('');

    try {
      const [stockResponse, waterObjectsResponse, speciesResponse, categoriesResponse] = await Promise.all([
        listFishStockAggregateRequest(token),
        listWaterObjectsRequest(token),
        listFishSpeciesRequest(token),
        listFishCategoriesRequest(token)
      ]);

      setRows(Array.isArray(stockResponse) ? stockResponse : []);
      setWaterObjects(waterObjectsResponse.items ?? []);
      setSpeciesOptions(speciesResponse.items ?? []);
      setCategoryOptions(categoriesResponse.items ?? []);
    } catch (loadError) {
      setError(loadError.message || 'Neuspješno učitavanje stanja ribljeg fonda.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadFishStockAndLookups();
  }, [token]);

  const normalizedRows = useMemo(() => {
    return rows.map((row) => {
      const speciesName = row.species_name ?? row.species_label ?? formatSpeciesName(row.species_code);
      const categoryName = row.category_name ?? row.category_label ?? formatCategoryName(row.category_code);
      const waterObjectCode = row.water_object_code ?? row.water_object_label ?? 'NEPOZNATO';

      return {
        ...row,
        species_display: speciesName,
        category_display: categoryName,
        water_object_display: waterObjectCode
      };
    });
  }, [rows]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('hr-HR');

    return normalizedRows.filter((row) => {
      if (!normalizedSearch) {
        return true;
      }

      const waterCode = String(row.water_object_display ?? '').toLocaleLowerCase('hr-HR');
      const speciesName = String(row.species_display ?? '').toLocaleLowerCase('hr-HR');
      const categoryName = String(row.category_display ?? '').toLocaleLowerCase('hr-HR');

      return (
        waterCode.includes(normalizedSearch)
        || speciesName.includes(normalizedSearch)
        || categoryName.includes(normalizedSearch)
      );
    });
  }, [normalizedRows, search]);

  const waterGroups = useMemo(() => {
    const grouped = filteredRows.reduce((groups, row) => {
      const waterCode = row.water_object_display ?? 'NEPOZNATO';

      if (!groups[waterCode]) {
        groups[waterCode] = [];
      }

      groups[waterCode].push(row);
      return groups;
    }, {});

    return Object.keys(grouped)
      .sort((left, right) => compareText(left, right, waterSort))
      .map((waterObjectCode) => {
        const rowsByWaterObject = [...grouped[waterObjectCode]].sort((left, right) => {
          const speciesComparison = compareText(left.species_display ?? '', right.species_display ?? '', speciesSort);
          if (speciesComparison !== 0) {
            return speciesComparison;
          }

          return compareText(left.category_display ?? '', right.category_display ?? '', speciesSort);
        });

        const totals = rowsByWaterObject.reduce(
          (acc, row) => {
            acc.countTotal += toNumber(row.count_total);
            acc.weightTotal += toNumber(row.weight_total_kg);
            return acc;
          },
          { countTotal: 0, weightTotal: 0 }
        );

        return {
          waterObjectCode,
          rows: rowsByWaterObject,
          total: {
            count_total: totals.countTotal,
            weight_total_kg: totals.weightTotal,
            weight_avg_kg: totals.countTotal > 0 ? totals.weightTotal / totals.countTotal : 0
          }
        };
      });
  }, [filteredRows, waterSort, speciesSort]);

  const globalSummary = useMemo(() => {
    const totals = filteredRows.reduce(
      (acc, row) => {
        acc.countTotal += toNumber(row.count_total);
        acc.weightTotal += toNumber(row.weight_total_kg);
        return acc;
      },
      { countTotal: 0, weightTotal: 0 }
    );

    return {
      count_total: totals.countTotal,
      weight_total_kg: totals.weightTotal,
      weight_avg_kg: totals.countTotal > 0 ? totals.weightTotal / totals.countTotal : 0
    };
  }, [filteredRows]);

  function handleExitChange(event) {
    const { name, value } = event.target;
    setExitForm((prev) => {
      const next = { ...prev, [name]: value };
      const count = Number(next.count_total);
      const weightAvg = Number(next.weight_avg_kg);
      const weightTotal = Number(next.weight_total_kg);

      if (name === 'weight_avg_kg' && Number.isFinite(count) && count > 0 && Number.isFinite(weightAvg) && weightAvg > 0) {
        next.weight_total_kg = String((count * weightAvg).toFixed(3));
      }

      if (name === 'weight_total_kg' && Number.isFinite(count) && count > 0 && Number.isFinite(weightTotal) && weightTotal > 0) {
        next.weight_avg_kg = String((weightTotal / count).toFixed(3));
      }

      if (name === 'count_total' && Number.isFinite(count) && count > 0) {
        if (Number.isFinite(weightAvg) && weightAvg > 0) {
          next.weight_total_kg = String((count * weightAvg).toFixed(3));
        } else if (Number.isFinite(weightTotal) && weightTotal > 0) {
          next.weight_avg_kg = String((weightTotal / count).toFixed(3));
        }
      }

      return next;
    });
  }

  async function handleExitSubmit(event) {
    event.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');

    if (!exitForm.water_object_id || !exitForm.event_date || !exitForm.species_id || !exitForm.category_id) {
      setSubmitError('Popunite objekt, datum, vrstu i kategoriju.');
      return;
    }

    const countTotal = Number(exitForm.count_total);
    const weightTotal = Number(exitForm.weight_total_kg);

    if (!Number.isFinite(countTotal) || countTotal <= 0) {
      setSubmitError('Količina mora biti broj veći od 0.');
      return;
    }

    if (!Number.isFinite(weightTotal) || weightTotal <= 0) {
      setSubmitError('Ukupna masa mora biti broj veći od 0.');
      return;
    }

    setIsSubmittingExit(true);

    try {
      await createFishExitEventRequest(token, {
        ...exitForm,
        event_type: 'izlov',
        destination_kind: 'ostalo',
        destination_label: 'Izlov',
        water_object_id: Number(exitForm.water_object_id),
        species_id: Number(exitForm.species_id),
        category_id: Number(exitForm.category_id),
        count_total: countTotal,
        weight_total_kg: weightTotal,
        weight_avg_kg: Number(exitForm.weight_avg_kg) || weightTotal / countTotal
      });

      setSubmitSuccess('Izlov je uspješno spremljen. Stanje je osvježeno.');
      setExitForm(initialExitForm);
      await loadFishStockAndLookups();
    } catch (submitErrorValue) {
      setSubmitError(submitErrorValue.message || 'Neuspješno spremanje izlova.');
    } finally {
      setIsSubmittingExit(false);
    }
  }

  return (
    <section className="card fish-stock-card">
      <h2>Stanje ribljeg fonda</h2>
      <p>Prikaz po objektu, vrsti i kategoriji.</p>

      <form className="fish-exit-form" onSubmit={handleExitSubmit}>
        <h3>Evidencija izlova</h3>

        <div className="fish-exit-grid">
          <label>
            Vodni objekt
            <select
              name="water_object_id"
              value={exitForm.water_object_id}
              onChange={handleExitChange}
              disabled={isLoading || isSubmittingExit}
              required
            >
              <option value="">Odaberite objekt</option>
              {waterObjects.map((item) => (
                <option key={item.id} value={item.id}>{item.code} — {item.name}</option>
              ))}
            </select>
          </label>

          <label>
            Datum
            <input
              type="date"
              name="event_date"
              value={exitForm.event_date}
              onChange={handleExitChange}
              disabled={isLoading || isSubmittingExit}
              required
            />
          </label>

          <label>
            Vrsta
            <select
              name="species_id"
              value={exitForm.species_id}
              onChange={handleExitChange}
              disabled={isLoading || isSubmittingExit}
              required
            >
              <option value="">Odaberite vrstu</option>
              {speciesOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>

          <label>
            Kategorija
            <select
              name="category_id"
              value={exitForm.category_id}
              onChange={handleExitChange}
              disabled={isLoading || isSubmittingExit}
              required
            >
              <option value="">Odaberite kategoriju</option>
              {categoryOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>

          <label>
            Količina (kom)
            <input
              type="number"
              name="count_total"
              value={exitForm.count_total}
              onChange={handleExitChange}
              min="1"
              step="1"
              disabled={isLoading || isSubmittingExit}
              required
            />
          </label>

          <label>
            Prosječna masa (kg)
            <input
              type="number"
              name="weight_avg_kg"
              value={exitForm.weight_avg_kg}
              onChange={handleExitChange}
              min="0"
              step="0.001"
              disabled={isLoading || isSubmittingExit}
            />
          </label>

          <label>
            Ukupna masa (kg)
            <input
              type="number"
              name="weight_total_kg"
              value={exitForm.weight_total_kg}
              onChange={handleExitChange}
              min="0.001"
              step="0.001"
              disabled={isLoading || isSubmittingExit}
              required
            />
          </label>
        </div>

        <label>
          Napomena
          <textarea
            name="notes"
            value={exitForm.notes}
            onChange={handleExitChange}
            disabled={isLoading || isSubmittingExit}
            rows={2}
          />
        </label>

        {submitError ? <p className="error-text">{submitError}</p> : null}
        {submitSuccess ? <p>{submitSuccess}</p> : null}

        <button type="submit" disabled={isLoading || isSubmittingExit}>
          {isSubmittingExit ? 'Spremanje...' : 'Spremi izlov'}
        </button>
      </form>

      <div className="fish-stock-filters">
        <label>
          Sortiranje objekta
          <select value={waterSort} onChange={(event) => setWaterSort(event.target.value)}>
            <option value="asc">A-Z</option>
            <option value="desc">Z-A</option>
          </select>
        </label>

        <label>
          Sortiranje vrste/kategorije
          <select value={speciesSort} onChange={(event) => setSpeciesSort(event.target.value)}>
            <option value="asc">A-Z</option>
            <option value="desc">Z-A</option>
          </select>
        </label>

        <label>
          Pretraga
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Objekt, vrsta ili kategorija"
          />
        </label>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
      {isLoading ? <p>Učitavanje podataka...</p> : null}
      {!isLoading && !error && waterGroups.length === 0 ? <p>Nema podataka za prikaz.</p> : null}

      {!isLoading && waterGroups.length > 0 ? (
        <section className="fish-stock-summary">
          <article className="fish-stock-summary-card">
            <h4>Ukupno riba</h4>
            <p>{formatInteger(globalSummary.count_total)}</p>
          </article>
          <article className="fish-stock-summary-card">
            <h4>Ukupna masa</h4>
            <p>{formatDecimal(globalSummary.weight_total_kg, 2)} kg</p>
          </article>
          <article className="fish-stock-summary-card">
            <h4>Prosječna težina</h4>
            <p>{formatDecimal(globalSummary.weight_avg_kg, 3)} kg</p>
          </article>
        </section>
      ) : null}

      {!isLoading && waterGroups.length > 0 ? (
        <div className="fish-stock-groups">
          {waterGroups.map((group) => (
            <section key={group.waterObjectCode} className="fish-stock-group">
              <h3>{group.waterObjectCode}</h3>
              <div className="table-wrap fish-stock-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Vrsta</th>
                      <th>Kategorija</th>
                      <th className="numeric-cell">Kom</th>
                      <th className="numeric-cell">Kg</th>
                      <th className="numeric-cell">Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row, index) => (
                      <tr
                        key={`${group.waterObjectCode}-${row.species_code}-${row.category_code ?? 'no-category'}-${index}`}
                        className="fish-stock-data-row"
                      >
                        <td>{row.species_display}</td>
                        <td>{row.category_display}</td>
                        <td className="numeric-cell">{formatInteger(row.count_total)}</td>
                        <td className="numeric-cell">{formatDecimal(row.weight_total_kg, 2)}</td>
                        <td className="numeric-cell">{formatDecimal(row.weight_avg_kg, 2)}</td>
                      </tr>
                    ))}
                    <tr className="fish-stock-total-row">
                      <td><strong>TOTAL</strong></td>
                      <td></td>
                      <td className="numeric-cell"><strong>{formatInteger(group.total.count_total)}</strong></td>
                      <td className="numeric-cell"><strong>{formatDecimal(group.total.weight_total_kg, 2)}</strong></td>
                      <td className="numeric-cell"><strong>{formatDecimal(group.total.weight_avg_kg, 2)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </section>
  );
}
