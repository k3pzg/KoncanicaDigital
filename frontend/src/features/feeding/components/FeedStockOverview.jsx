function formatKg(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString('hr-HR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' kg';
}

export function FeedStockOverview({ stock }) {
  if (!stock || stock.length === 0) {
    return <p className="pond-empty-state">Nema evidentiranih vrsta hrane u sustavu.</p>;
  }

  const totalKg = stock.reduce((sum, row) => sum + Number(row.quantity_kg ?? 0), 0);

  return (
    <div className="feed-stock-overview">
      <div className="feed-stock-summary">
        <article className="feed-stock-total">
          <h4>Ukupno na zalihi</h4>
          <p>{formatKg(totalKg)}</p>
        </article>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Vrsta hrane</th>
              <th className="numeric-cell">Na zalihi (kg)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {stock.map((row) => {
              const qty = Number(row.quantity_kg ?? 0);
              const statusClass = qty <= 0
                ? 'feed-stock-status feed-stock-status--empty'
                : qty < 50
                  ? 'feed-stock-status feed-stock-status--low'
                  : 'feed-stock-status feed-stock-status--ok';
              const statusLabel = qty <= 0 ? 'Prazno' : qty < 50 ? 'Malo' : 'Dostupno';

              return (
                <tr key={row.feed_type_id} className={qty <= 0 ? 'feed-stock-row--empty' : ''}>
                  <td>{row.feed_type_name}</td>
                  <td className="numeric-cell">{formatKg(qty)}</td>
                  <td><span className={statusClass}>{statusLabel}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
