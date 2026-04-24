import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/state/AuthContext';
import { listFishStockAggregateRequest } from '../api/fishApi';

function formatNumber(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return '-';
  }

  return numericValue.toLocaleString('hr-HR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  });
}

export function FishStockPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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
    return rows.reduce((groups, row) => {
      const groupKey = row.water_object_code ?? 'NEPOZNATO';
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }

      groups[groupKey].push(row);
      return groups;
    }, {});
  }, [rows]);

  const waterObjectCodes = Object.keys(groupedRows).sort((a, b) => a.localeCompare(b));

  return (
    <section className="card fish-stock-card">
      <h2>Stanje ribljeg fonda</h2>
      <p>Izvor: http://localhost:3001/api/fish/stock</p>
      {error ? <p className="error-text">{error}</p> : null}
      {isLoading ? <p>Učitavanje podataka...</p> : null}

      {!isLoading && !error && waterObjectCodes.length === 0 ? (
        <p>Nema podataka za prikaz.</p>
      ) : null}

      {!isLoading && waterObjectCodes.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>water_object_code</th>
                <th>species_code</th>
                <th>count_total</th>
                <th>weight_total_kg</th>
                <th>weight_avg_kg</th>
              </tr>
            </thead>
            <tbody>
              {waterObjectCodes.map((waterObjectCode) => (
                <FragmentRows
                  key={waterObjectCode}
                  waterObjectCode={waterObjectCode}
                  rows={groupedRows[waterObjectCode]}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function FragmentRows({ waterObjectCode, rows }) {
  return (
    <>
      <tr className="group-row">
        <td colSpan={5}>water_object_code: {waterObjectCode}</td>
      </tr>
      {rows.map((row, index) => (
        <tr key={`${waterObjectCode}-${row.species_code}-${index}`}>
          <td>{row.water_object_code ?? '-'}</td>
          <td>{row.species_code ?? '-'}</td>
          <td>{formatNumber(row.count_total)}</td>
          <td>{formatNumber(row.weight_total_kg)}</td>
          <td>{formatNumber(row.weight_avg_kg)}</td>
        </tr>
      ))}
    </>
  );
}
