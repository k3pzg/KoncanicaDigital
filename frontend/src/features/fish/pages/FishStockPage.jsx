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

  const groupedRows = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('hr-HR');
    const filteredRows = rows.filter((row) => {
      if (!normalizedSearch) {
        return true;
      }

      const waterCode = String(row.water_object_code ?? '').toLocaleLowerCase('hr-HR');
      const categoryName = String(row.category_name ?? '').toLocaleLowerCase('hr-HR');
      const speciesName = String(row.species_name ?? row.species_code ?? '').toLocaleLowerCase('hr-HR');
      return (
        waterCode.includes(normalizedSearch)
        || categoryName.includes(normalizedSearch)
        || speciesName.includes(normalizedSearch)
      );
    });

    const grouped = filteredRows.reduce((groups, row) => {
      const groupKey = row.water_object_code ?? 'NEPOZNATO';
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }

      groups[groupKey].push(row);
      return groups;
    }, {});

    const sortedWaterCodes = Object.keys(grouped).sort((left, right) => compareText(left, right, waterSort));
    return sortedWaterCodes.map((waterObjectCode) => ({
      waterObjectCode,
      rows: [...grouped[waterObjectCode]].sort((left, right) => {
        const leftName = left.species_name ?? left.species_code ?? '';
        const rightName = right.species_name ?? right.species_code ?? '';
        return compareText(leftName, rightName, speciesSort);
      })
    }));
  }, [rows, search, waterSort, speciesSort]);

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
            placeholder="Objekt, kategorija ili vrsta"
          />
        </label>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
      {isLoading ? <p>Učitavanje podataka...</p> : null}
      {!isLoading && !error && groupedRows.length === 0 ? <p>Nema podataka za prikaz.</p> : null}

      {!isLoading && groupedRows.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>water_object_code</th>
                <th>category_name</th>
                <th>species_name</th>
                <th>count_total</th>
                <th>weight_total_kg</th>
                <th>weight_avg_kg</th>
              </tr>
            </thead>
            <tbody>
              {groupedRows.map((group) => (
                <FishStockGroup key={group.waterObjectCode} group={group} />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function FishStockGroup({ group }) {
  return (
    <>
      <tr className="group-row">
        <td colSpan={6}>water_object_code: {group.waterObjectCode}</td>
      </tr>
      {group.rows.map((row, index) => (
        <tr key={`${group.waterObjectCode}-${row.species_code}-${index}`}>
          <td>{row.water_object_code ?? '-'}</td>
          <td>{row.category_name ?? '-'}</td>
          <td>{row.species_name ?? '-'}</td>
          <td>{formatInteger(row.count_total)}</td>
          <td>{formatDecimal(row.weight_total_kg, 2)}</td>
          <td>{formatDecimal(row.weight_avg_kg, 3)}</td>
        </tr>
      ))}
    </>
  );
}
