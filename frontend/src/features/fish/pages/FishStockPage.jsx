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

  const normalizedSearch = search.trim().toLocaleLowerCase('hr-HR');

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
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
  }, [rows, normalizedSearch]);

  const groupedRows = useMemo(() => {
    const waterGroups = filteredRows.reduce((groups, row) => {
      const waterCode = row.water_object_code ?? 'NEPOZNATO';
      const categoryName = row.category_name ?? 'Bez kategorije';

      if (!groups[waterCode]) {
        groups[waterCode] = {};
      }

      if (!groups[waterCode][categoryName]) {
        groups[waterCode][categoryName] = [];
      }

      groups[waterCode][categoryName].push(row);
      return groups;
    }, {});

    return Object.keys(waterGroups)
      .sort((left, right) => compareText(left, right, waterSort))
      .map((waterObjectCode) => {
        const categoryGroups = Object.keys(waterGroups[waterObjectCode])
          .sort((left, right) => left.localeCompare(right, 'hr-HR'))
          .map((categoryName) => {
            const categoryRows = [...waterGroups[waterObjectCode][categoryName]].sort((left, right) => {
              const leftName = left.species_name ?? left.species_code ?? '';
              const rightName = right.species_name ?? right.species_code ?? '';
              return compareText(leftName, rightName, speciesSort);
            });

            const totals = categoryRows.reduce(
              (acc, row) => {
                acc.countTotal += toNumber(row.count_total);
                acc.weightTotal += toNumber(row.weight_total_kg);
                return acc;
              },
              { countTotal: 0, weightTotal: 0 }
            );

            return {
              categoryName,
              rows: categoryRows,
              totals: {
                count_total: totals.countTotal,
                weight_total_kg: totals.weightTotal,
                weight_avg_kg: totals.countTotal > 0 ? totals.weightTotal / totals.countTotal : 0
              }
            };
          });

        return {
          waterObjectCode,
          categories: categoryGroups
        };
      });
  }, [filteredRows, waterSort, speciesSort]);

  const categoryTotals = useMemo(() => {
    const totalsByCategory = filteredRows.reduce((totals, row) => {
      const categoryName = row.category_name ?? 'Bez kategorije';
      if (!totals[categoryName]) {
        totals[categoryName] = { countTotal: 0, weightTotal: 0 };
      }

      totals[categoryName].countTotal += toNumber(row.count_total);
      totals[categoryName].weightTotal += toNumber(row.weight_total_kg);
      return totals;
    }, {});

    return Object.keys(totalsByCategory)
      .sort((left, right) => left.localeCompare(right, 'hr-HR'))
      .map((categoryName) => {
        const totals = totalsByCategory[categoryName];
        const avg = totals.countTotal > 0 ? totals.weightTotal / totals.countTotal : 0;

        return {
          category_name: categoryName,
          count_total: totals.countTotal,
          weight_total_kg: totals.weightTotal,
          weight_avg_kg: avg
        };
      });
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

      {!isLoading && categoryTotals.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>category_name</th>
                <th>count_total</th>
                <th>weight_total_kg</th>
                <th>weight_avg_kg</th>
              </tr>
            </thead>
            <tbody>
              {categoryTotals.map((item) => (
                <tr key={`global-${item.category_name}`}>
                  <td>{item.category_name}</td>
                  <td>{formatInteger(item.count_total)}</td>
                  <td>{formatDecimal(item.weight_total_kg, 2)}</td>
                  <td>{formatDecimal(item.weight_avg_kg, 3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!isLoading && !error && groupedRows.length === 0 ? <p>Nema podataka za prikaz.</p> : null}

      {!isLoading && groupedRows.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>water_object_code</th>
                <th>species_name</th>
                <th>category_name</th>
                <th>count_total</th>
                <th>weight_total_kg</th>
                <th>weight_avg_kg</th>
              </tr>
            </thead>
            <tbody>
              {groupedRows.map((group) => (
                <FishStockWaterGroup key={group.waterObjectCode} group={group} />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function FishStockWaterGroup({ group }) {
  return (
    <>
      <tr className="group-row">
        <td colSpan={6}>water_object_code: {group.waterObjectCode}</td>
      </tr>
      {group.categories.map((category) => (
        <FishStockCategoryGroup
          key={`${group.waterObjectCode}-${category.categoryName}`}
          waterObjectCode={group.waterObjectCode}
          category={category}
        />
      ))}
    </>
  );
}

function FishStockCategoryGroup({ waterObjectCode, category }) {
  return (
    <>
      <tr>
        <td colSpan={6}>TOTAL ({category.categoryName}) • count_total: {formatInteger(category.totals.count_total)} • weight_total_kg: {formatDecimal(category.totals.weight_total_kg, 2)} • weight_avg_kg: {formatDecimal(category.totals.weight_avg_kg, 3)}</td>
      </tr>
      {category.rows.map((row, index) => (
        <tr key={`${waterObjectCode}-${category.categoryName}-${row.species_code}-${index}`}>
          <td>{row.water_object_code ?? '-'}</td>
          <td>{row.species_name ?? '-'}</td>
          <td>{row.category_name ?? '-'}</td>
          <td>{formatInteger(row.count_total)}</td>
          <td>{formatDecimal(row.weight_total_kg, 2)}</td>
          <td>{formatDecimal(row.weight_avg_kg, 3)}</td>
        </tr>
      ))}
    </>
  );
}
