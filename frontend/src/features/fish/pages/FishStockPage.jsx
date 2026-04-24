import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/state/AuthContext';
import { listFishStockAggregateRequest } from '../api/fishApi';

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
  if (code == null) {
    return 'Bez kategorije';
  }

  const normalizedCode = String(code).trim().toLowerCase();
  if (CATEGORY_DISPLAY[normalizedCode]) {
    return CATEGORY_DISPLAY[normalizedCode];
  }

  return capitalizeWords(normalizedCode.replaceAll('_', ' '));
}

export function FishStockPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [waterSort, setWaterSort] = useState('asc');
  const [speciesSort, setSpeciesSort] = useState('asc');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadFishStock() {
      setIsLoading(true);
      setError('');

      try {
        const response = await listFishStockAggregateRequest(token);
        setRows(Array.isArray(response) ? response : []);
      } catch (loadError) {
        setError(loadError.message || 'Neuspješno učitavanje stanja ribljeg fonda.');
      } finally {
        setIsLoading(false);
      }
    }

    loadFishStock();
  }, [token]);

  const normalizedRows = useMemo(() => {
    return rows.map((row) => ({
      ...row,
      category_name: formatCategoryName(row.category_name)
    }));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('hr-HR');

    return normalizedRows.filter((row) => {
      if (!normalizedSearch) {
        return true;
      }

      const waterCode = String(row.water_object_code ?? '').toLocaleLowerCase('hr-HR');
      const speciesName = String(row.species_name ?? '').toLocaleLowerCase('hr-HR');
      const categoryName = String(row.category_name ?? '').toLocaleLowerCase('hr-HR');

      return (
        waterCode.includes(normalizedSearch)
        || speciesName.includes(normalizedSearch)
        || categoryName.includes(normalizedSearch)
      );
    });
  }, [normalizedRows, search]);

  const waterGroups = useMemo(() => {
    const grouped = filteredRows.reduce((groups, row) => {
      const waterCode = row.water_object_code ?? 'NEPOZNATO';

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
          const leftName = left.species_name ?? left.species_code ?? '';
          const rightName = right.species_name ?? right.species_code ?? '';
          return compareText(leftName, rightName, speciesSort);
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

  return (
    <section className="card fish-stock-card">
      <h2>Stanje ribljeg fonda</h2>
      <p>Izvor: http://localhost:3001/api/fish/stock</p>

      <div className="fish-stock-filters">
        <label>
          Sortiranje objekta
          <select value={waterSort} onChange={(event) => setWaterSort(event.target.value)}>
            <option value="asc">A-Z</option>
            <option value="desc">Z-A</option>
          </select>
        </label>

        <label>
          Sortiranje vrste
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
                      <tr key={`${group.waterObjectCode}-${row.species_code}-${index}`} className="fish-stock-data-row">
                        <td>{formatSpeciesName(row.species_code ?? row.species_name)}</td>
                        <td>{row.category_name}</td>
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
