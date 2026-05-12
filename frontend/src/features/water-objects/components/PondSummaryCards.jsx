function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('hr-HR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatInteger(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('hr-HR', { maximumFractionDigits: 0 });
}

function formatKg(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return '—';
  return `${n.toLocaleString('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
}

function formatCm(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${n.toLocaleString('hr-HR', { maximumFractionDigits: 0 })} cm`;
}

function currentSeasonStart() {
  const now = new Date();
  return `${now.getFullYear()}-01-01`;
}

export function PondSummaryCards({ stock, waterLevels, controlEvents, feedingEvents }) {
  const totalCount = stock.reduce((s, r) => s + Number(r.count_total ?? 0), 0);
  const totalWeight = stock.reduce((s, r) => s + Number(r.weight_total_kg ?? 0), 0);
  const latestLevel = waterLevels.length > 0 ? waterLevels[0] : null;
  const lastControlDate = controlEvents.length > 0 ? controlEvents[0].control_date : null;

  const sorted = [...feedingEvents].sort((a, b) => (b.event_date > a.event_date ? 1 : -1));
  const lastFeedingDate = sorted.length > 0 ? sorted[0].event_date : null;

  const seasonStart = currentSeasonStart();
  const totalFeedSeason = feedingEvents
    .filter((e) => e.event_date >= seasonStart)
    .reduce((s, e) => s + Number(e.quantity_kg ?? 0), 0);

  const cards = [
    { label: 'Broj riba', value: totalCount > 0 ? formatInteger(totalCount) + ' kom' : '—' },
    { label: 'Ukupna masa', value: totalWeight > 0 ? formatKg(totalWeight) : '—' },
    { label: 'Vodostaj', value: latestLevel ? formatCm(latestLevel.water_level_current_cm) : '—' },
    { label: 'Zadnje hranjenje', value: lastFeedingDate ? formatDate(lastFeedingDate) : '—' },
    { label: 'Zadnja kontrola', value: lastControlDate ? formatDate(lastControlDate) : '—' },
    { label: 'Hrana ove sezone', value: totalFeedSeason > 0 ? formatKg(totalFeedSeason) : '—' },
  ];

  return (
    <div className="pond-summary-cards">
      {cards.map((c) => (
        <article key={c.label} className="pond-summary-card">
          <h4>{c.label}</h4>
          <p>{c.value}</p>
        </article>
      ))}
    </div>
  );
}
