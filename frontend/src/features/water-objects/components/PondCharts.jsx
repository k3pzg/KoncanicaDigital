import {
  ResponsiveContainer,
  LineChart,
  BarChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

// ── formatters ────────────────────────────────────────────────────────────────

function shortDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('hr-HR', { day: '2-digit', month: '2-digit' });
}

function tooltipDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('hr-HR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── data builders ─────────────────────────────────────────────────────────────

function buildFishTimeline(entryEvents, exitEvents) {
  const raw = [
    ...entryEvents.map((e) => ({
      date: e.event_date ?? '',
      dCount: Number(e.count_total ?? 0),
      dWeight: Number(e.weight_total_kg ?? 0)
    })),
    ...exitEvents.map((e) => ({
      date: e.event_date ?? '',
      dCount: -Number(e.count_total ?? 0),
      dWeight: -Number(e.weight_total_kg ?? 0)
    }))
  ].filter((e) => e.date).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  if (raw.length === 0) return [];

  let cumCount = 0;
  let cumWeight = 0;
  const byDate = new Map();

  for (const e of raw) {
    cumCount = Math.max(0, cumCount + e.dCount);
    cumWeight = Math.max(0, cumWeight + e.dWeight);
    byDate.set(e.date, { date: e.date, count: cumCount, weight: parseFloat(cumWeight.toFixed(2)) });
  }

  return Array.from(byDate.values());
}

function buildWaterLevelTimeline(waterLevels) {
  return [...waterLevels]
    .filter((m) => m.measurement_date && m.water_level_current_cm !== null)
    .sort((a, b) => (a.measurement_date < b.measurement_date ? -1 : 1))
    .map((m) => ({
      date: m.measurement_date,
      vodostaj: Number(m.water_level_current_cm)
    }));
}

function buildFeedingTimeline(feedingEvents) {
  const byDate = new Map();
  for (const e of feedingEvents) {
    if (!e.event_date) continue;
    byDate.set(e.event_date, (byDate.get(e.event_date) ?? 0) + Number(e.quantity_kg ?? 0));
  }
  return Array.from(byDate.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, qty]) => ({ date, kolicina: parseFloat(qty.toFixed(2)) }));
}

// ── subcomponents ─────────────────────────────────────────────────────────────

function EmptyChart({ label }) {
  return (
    <div className="pond-chart-empty">
      <p>Nema dostupnih podataka</p>
      {label && <small>{label}</small>}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="pond-chart-card">
      <h4 className="pond-chart-title">{title}</h4>
      {children}
    </div>
  );
}

const TOOLTIP_STYLE = {
  fontSize: '0.8rem',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  boxShadow: '0 2px 8px rgba(15,23,42,0.09)'
};

const AXIS_TICK = { fontSize: 11, fill: '#64748b' };

// ── main component ────────────────────────────────────────────────────────────

export function PondCharts({ waterLevels, entryEvents, exitEvents, feedingEvents }) {
  const waterData = buildWaterLevelTimeline(waterLevels);
  const fishData = buildFishTimeline(entryEvents, exitEvents);
  const feedData = buildFeedingTimeline(feedingEvents);

  const avgMassData = fishData
    .filter((d) => d.count > 0)
    .map((d) => ({ date: d.date, prosjekKg: parseFloat((d.weight / d.count).toFixed(3)) }));

  return (
    <div className="pond-charts-grid">

      {/* Water level */}
      <ChartCard title="Razina vode (cm)">
        {waterData.length < 2 ? (
          <EmptyChart label="Potrebna su najmanje 2 mjerenja za prikaz grafa" />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={waterData} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS_TICK} minTickGap={40} />
              <YAxis tick={AXIS_TICK} width={36} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelFormatter={tooltipDate}
                formatter={(v) => [`${v} cm`, 'Vodostaj']}
              />
              <Line
                type="monotone"
                dataKey="vodostaj"
                stroke="#2563eb"
                strokeWidth={2}
                dot={waterData.length <= 20}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Fish count */}
      <ChartCard title="Broj riba (kom)">
        {fishData.length < 2 ? (
          <EmptyChart label="Potrebni su najmanje 2 događaja za prikaz grafa" />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={fishData} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS_TICK} minTickGap={40} />
              <YAxis tick={AXIS_TICK} width={48} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelFormatter={tooltipDate}
                formatter={(v) => [v.toLocaleString('hr-HR'), 'Komada']}
              />
              <Line
                type="stepAfter"
                dataKey="count"
                stroke="#16a34a"
                strokeWidth={2}
                dot={fishData.length <= 20}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Total fish mass */}
      <ChartCard title="Ukupna masa ribe (kg)">
        {fishData.length < 2 ? (
          <EmptyChart label="Potrebni su najmanje 2 događaja za prikaz grafa" />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={fishData} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS_TICK} minTickGap={40} />
              <YAxis tick={AXIS_TICK} width={48} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelFormatter={tooltipDate}
                formatter={(v) => [`${v.toLocaleString('hr-HR')} kg`, 'Masa']}
              />
              <Line
                type="stepAfter"
                dataKey="weight"
                stroke="#0891b2"
                strokeWidth={2}
                dot={fishData.length <= 20}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Average fish mass */}
      <ChartCard title="Prosjecna masa ribe (kg/kom)">
        {avgMassData.length < 2 ? (
          <EmptyChart label="Potrebni su najmanje 2 događaja za prikaz grafa" />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={avgMassData} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS_TICK} minTickGap={40} />
              <YAxis tick={AXIS_TICK} width={48} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelFormatter={tooltipDate}
                formatter={(v) => [`${v.toLocaleString('hr-HR')} kg`, 'Prosjek']}
              />
              <Line
                type="monotone"
                dataKey="prosjekKg"
                stroke="#d97706"
                strokeWidth={2}
                dot={avgMassData.length <= 20}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Feeding */}
      <ChartCard title="Kolicina hrane po hranjenju (kg)">
        {feedData.length === 0 ? (
          <EmptyChart label="Nema evidentiranih hranjenja za ovaj objekt" />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={feedData} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS_TICK} minTickGap={40} />
              <YAxis tick={AXIS_TICK} width={36} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelFormatter={tooltipDate}
                formatter={(v) => [`${v.toLocaleString('hr-HR')} kg`, 'Hranjenje']}
              />
              <Bar dataKey="kolicina" fill="#7c3aed" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

    </div>
  );
}
