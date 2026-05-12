import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/state/AuthContext';
import { getWaterObjectByIdRequest } from '../api/waterObjectsApi';
import {
  createWaterLevelMeasurementRequest,
  deleteWaterLevelMeasurementRequest,
  listWaterLevelMeasurementsRequest
} from '../api/waterLevelsApi';
import {
  listFishCategoriesRequest,
  listFishControlEventsRequest,
  listFishEntryEventsRequest,
  listFishExitEventsRequest,
  listFishSpeciesRequest,
  listFishStockCurrentRequest
} from '../../fish/api/fishApi';
import { listWaterObjectsRequest } from '../api/waterObjectsApi';
import { PoribljavanjeForm } from '../../fish/components/PoribljavanjeForm';
import { IzlovForm } from '../../fish/components/IzlovForm';
import { KontrolaForm } from '../../fish/components/KontrolaForm';
import { FeedingEventForm } from '../../feeding/components/FeedingEventForm';
import { listFeedTypesRequest, listFeedStockRequest, listFeedingEventsRequest } from '../../feeding/api/feedingApi';
import { PondSummaryCards } from '../components/PondSummaryCards';
import { PondCharts } from '../components/PondCharts';

// ── label maps ────────────────────────────────────────────────────────────────

const OBJECT_TYPE_LABELS = {
  ribnjak: 'Ribnjak',
  bazen: 'Bazen',
  kanal: 'Kanal',
  zimovnik: 'Zimovnik',
  rastiliste: 'Rastiilište',
  maticnjak: 'Matičnjak'
};

const ENTRY_TYPE_LABELS = {
  nasad: 'Nasad',
  dodatni_nasad: 'Dodatni nasad',
  premjestaj_ulaz: 'Premještaj (ulaz)'
};

const EXIT_TYPE_LABELS = {
  izlov: 'Izlov',
  premjestaj_izlaz: 'Premještaj (izlaz)'
};

// ── formatters ────────────────────────────────────────────────────────────────

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('hr-HR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatInteger(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString('hr-HR', { maximumFractionDigits: 0 });
}

function formatDecimal(value, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString('hr-HR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function formatCm(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return `${n.toLocaleString('hr-HR', { maximumFractionDigits: 0 })} cm`;
}

function formatArea(value) {
  if (value === null || value === undefined || value === '') return '-';
  return `${formatDecimal(value)} m²`;
}

function formatDepth(value) {
  if (value === null || value === undefined || value === '') return '-';
  return `${formatDecimal(value)} m`;
}

function computeDisplayVolume(pond) {
  const stored = Number(pond?.max_volume_m3);
  if (Number.isFinite(stored) && stored > 0) return stored;
  const area = Number(pond?.area_total_m2);
  const depth = Number(pond?.max_depth_m);
  if (Number.isFinite(area) && area > 0 && Number.isFinite(depth) && depth > 0) return area * depth;
  return null;
}

function formatVolume(value) {
  if (value === null || value === undefined) return '-';
  return `${formatDecimal(value)} m³`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// ── water level helpers ───────────────────────────────────────────────────────

const emptyWaterLevelForm = {
  measurement_date: todayIso(),
  water_level_current_cm: '',
  water_level_full_cm: '',
  water_level_missing_cm: '',
  area_ha: '',
  note: ''
};

function calcMissing(full, current) {
  const f = Number(full);
  const c = Number(current);
  if (Number.isFinite(f) && Number.isFinite(c) && f > 0) {
    return String(Math.max(0, f - c));
  }
  return '';
}

// ── unified event history ─────────────────────────────────────────────────────

function buildUnifiedHistory(entryEvents, exitEvents, controlEvents) {
  const entries = (entryEvents ?? []).map((e) => ({
    _type: 'entry',
    _date: e.event_date,
    _sortKey: e.event_date ?? '',
    id: e.id,
    date: e.event_date,
    typeLabel: ENTRY_TYPE_LABELS[e.event_type] ?? e.event_type ?? 'Poribljavanje',
    species: e.species_label ?? e.species_code ?? '-',
    category: e.category_label ?? e.category_code ?? '-',
    count: e.count_total,
    weight: e.weight_total_kg,
    notes: e.notes ?? ''
  }));

  const exits = (exitEvents ?? []).map((e) => ({
    _type: 'exit',
    _date: e.event_date,
    _sortKey: e.event_date ?? '',
    id: e.id,
    date: e.event_date,
    typeLabel: EXIT_TYPE_LABELS[e.event_type] ?? e.event_type ?? 'Izlov',
    species: e.species_label ?? e.species_code ?? '-',
    category: e.category_label ?? e.category_code ?? '-',
    count: e.count_total,
    weight: e.weight_total_kg,
    notes: e.notes ?? ''
  }));

  const controls = (controlEvents ?? []).map((e) => ({
    _type: 'control',
    _date: e.control_date,
    _sortKey: e.control_date ?? '',
    id: e.id,
    date: e.control_date,
    typeLabel: 'Kontrolno uzorkovanje',
    species: null,
    category: null,
    count: null,
    weight: null,
    notes: e.notes ?? ''
  }));

  return [...entries, ...exits, ...controls].sort((a, b) => {
    if (b._sortKey > a._sortKey) return 1;
    if (b._sortKey < a._sortKey) return -1;
    return 0;
  });
}

const EVENT_TYPE_STYLE = {
  entry: { className: 'event-badge event-badge--entry', label: '▲' },
  exit: { className: 'event-badge event-badge--exit', label: '▼' },
  control: { className: 'event-badge event-badge--control', label: '◎' }
};

// ── component ─────────────────────────────────────────────────────────────────

export function PondDetailPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [pond, setPond] = useState(null);
  const [stock, setStock] = useState([]);
  const [waterLevels, setWaterLevels] = useState([]);
  const [entryEvents, setEntryEvents] = useState([]);
  const [exitEvents, setExitEvents] = useState([]);
  const [controlEvents, setControlEvents] = useState([]);
  const [species, setSpecies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [waterObjects, setWaterObjects] = useState([]);
  const [feedTypes, setFeedTypes] = useState([]);
  const [feedStock, setFeedStock] = useState([]);
  const [feedingEvents, setFeedingEvents] = useState([]);

  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // active inline form: null | 'water' | 'poribljavanje' | 'izlov' | 'kontrola'
  const [activeForm, setActiveForm] = useState(null);

  // water level form state
  const [waterForm, setWaterForm] = useState(emptyWaterLevelForm);
  const [waterFormError, setWaterFormError] = useState('');
  const [waterFormSaving, setWaterFormSaving] = useState(false);

  function toggleForm(name) {
    setActiveForm((prev) => (prev === name ? null : name));
    setWaterFormError('');
  }

  async function loadAll() {
    setIsLoading(true);
    setLoadError('');
    try {
      const [
        pondResult, stockResult, levelsResult,
        entryResult, exitResult, controlResult,
        speciesResult, categoriesResult, waterObjectsResult,
        feedTypesResult, feedStockResult, feedingEventsResult
      ] = await Promise.all([
        getWaterObjectByIdRequest(token, id),
        listFishStockCurrentRequest(token, id),
        listWaterLevelMeasurementsRequest(token, id),
        listFishEntryEventsRequest(token, id),
        listFishExitEventsRequest(token, id),
        listFishControlEventsRequest(token, id),
        listFishSpeciesRequest(token),
        listFishCategoriesRequest(token),
        listWaterObjectsRequest(token),
        listFeedTypesRequest(token),
        listFeedStockRequest(token),
        listFeedingEventsRequest(token, { waterObjectId: id })
      ]);

      setPond(pondResult.item ?? null);
      setStock(stockResult.items ?? []);
      setWaterLevels(levelsResult.items ?? []);
      setEntryEvents(entryResult.items ?? []);
      setExitEvents(exitResult.items ?? []);
      setSpecies(speciesResult.items ?? []);
      setCategories(categoriesResult.items ?? []);
      setWaterObjects(waterObjectsResult.items ?? []);
      setControlEvents(controlResult.items ?? []);
      setFeedTypes(feedTypesResult.items ?? []);
      setFeedStock(feedStockResult.items ?? []);
      setFeedingEvents(feedingEventsResult.items ?? []);
    } catch (err) {
      setLoadError(err.message ?? 'Greška pri učitavanju ribnjaka.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [id]);

  // ── water level form handlers ──────────────────────────────────────────────

  function handleWaterFormChange(event) {
    const { name, value } = event.target;
    setWaterForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'water_level_full_cm' || name === 'water_level_current_cm') {
        const full = name === 'water_level_full_cm' ? value : prev.water_level_full_cm;
        const current = name === 'water_level_current_cm' ? value : prev.water_level_current_cm;
        next.water_level_missing_cm = calcMissing(full, current);
      }
      return next;
    });
  }

  async function handleWaterFormSubmit(event) {
    event.preventDefault();
    setWaterFormError('');

    if (!waterForm.water_level_current_cm && waterForm.water_level_current_cm !== 0) {
      setWaterFormError('Trenutni vodostaj je obavezan.');
      return;
    }

    setWaterFormSaving(true);
    try {
      await createWaterLevelMeasurementRequest(token, {
        water_object_id: Number(id),
        measurement_date: waterForm.measurement_date || null,
        water_level_current_cm: waterForm.water_level_current_cm !== '' ? Number(waterForm.water_level_current_cm) : null,
        water_level_full_cm: waterForm.water_level_full_cm !== '' ? Number(waterForm.water_level_full_cm) : null,
        water_level_missing_cm: waterForm.water_level_missing_cm !== '' ? Number(waterForm.water_level_missing_cm) : null,
        area_ha: waterForm.area_ha !== '' ? Number(waterForm.area_ha) : null,
        note: waterForm.note || null
      });
      setWaterForm({ ...emptyWaterLevelForm, measurement_date: todayIso() });
      setActiveForm(null);
      const levelsResult = await listWaterLevelMeasurementsRequest(token, id);
      setWaterLevels(levelsResult.items ?? []);
    } catch (err) {
      setWaterFormError(err.message ?? 'Greška pri spremanju mjerenja.');
    } finally {
      setWaterFormSaving(false);
    }
  }

  async function handleDeleteWaterLevel(measurementId) {
    if (!window.confirm('Obrisati ovo mjerenje vodostaja?')) return;
    try {
      await deleteWaterLevelMeasurementRequest(token, measurementId);
      setWaterLevels((prev) => prev.filter((m) => m.id !== measurementId));
    } catch (err) {
      alert(err.message ?? 'Greška pri brisanju.');
    }
  }

  // ── derived data ───────────────────────────────────────────────────────────

  const totalCount = stock.reduce((sum, row) => sum + Number(row.count_total ?? 0), 0);
  const totalWeight = stock.reduce((sum, row) => sum + Number(row.weight_total_kg ?? 0), 0);
  const latestLevel = waterLevels[0] ?? null;
  const unifiedHistory = buildUnifiedHistory(entryEvents, exitEvents, controlEvents);

  // ── render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <section className="card pond-detail-card">
        <p>Učitavanje ribnjaka…</p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="card pond-detail-card">
        <p className="error-text">{loadError}</p>
        <button type="button" onClick={() => navigate(-1)}>← Natrag</button>
      </section>
    );
  }

  if (!pond) {
    return (
      <section className="card pond-detail-card">
        <p className="error-text">Ribnjak nije pronađen.</p>
        <button type="button" onClick={() => navigate(-1)}>← Natrag</button>
      </section>
    );
  }

  return (
    <div className="pond-detail-layout">

      {/* ── header ── */}
      <section className="card pond-detail-header">
        <div className="pond-detail-back">
          <Link to="/app/map">← Karta</Link>
          <Link to="/app/water-objects">Vodni objekti</Link>
        </div>
        <div className="pond-detail-title-row">
          <h2>{pond.code}</h2>
          <span className="pond-type-badge">{OBJECT_TYPE_LABELS[pond.object_type] ?? pond.object_type}</span>
          {!pond.is_active && <span className="pond-type-badge pond-type-badge--inactive">Neaktivan</span>}
        </div>
        <dl className="pond-detail-meta">
          {pond.area_total_m2 ? <div><dt>Ukupna površina</dt><dd>{formatArea(pond.area_total_m2)}</dd></div> : null}
          {pond.area_productive_m2 ? <div><dt>Produktivna površina</dt><dd>{formatArea(pond.area_productive_m2)}</dd></div> : null}
          {pond.max_depth_m ? <div><dt>Maksimalna dubina</dt><dd>{formatDepth(pond.max_depth_m)}</dd></div> : null}
          {computeDisplayVolume(pond) !== null ? <div><dt>Maks. volumen</dt><dd>{formatVolume(computeDisplayVolume(pond))}</dd></div> : null}
          {pond.notes ? <div className="pond-notes"><dt>Napomena</dt><dd>{pond.notes}</dd></div> : null}
        </dl>
      </section>

      {/* ── summary cards ── */}
      <section className="card pond-detail-section">
        <h3>Pregled</h3>
        <PondSummaryCards
          stock={stock}
          waterLevels={waterLevels}
          controlEvents={controlEvents}
          feedingEvents={feedingEvents}
        />
      </section>

      {/* ── charts ── */}
      <section className="card pond-detail-section">
        <h3>Trendovi</h3>
        <PondCharts
          waterLevels={waterLevels}
          entryEvents={entryEvents}
          exitEvents={exitEvents}
          feedingEvents={feedingEvents}
        />
      </section>

      {/* ── quick actions ── */}
      <section className="card pond-detail-actions">
        <h3>Brze akcije</h3>
        <div className="pond-quick-actions">
          <button
            type="button"
            className={`pond-action-btn ${activeForm === 'water' ? 'pond-action-btn--active' : 'pond-action-btn--primary'}`}
            onClick={() => toggleForm('water')}
          >
            {activeForm === 'water' ? 'Odustani' : 'Razina vode'}
          </button>
          <button
            type="button"
            className={`pond-action-btn ${activeForm === 'poribljavanje' ? 'pond-action-btn--active' : ''}`}
            onClick={() => toggleForm('poribljavanje')}
          >
            {activeForm === 'poribljavanje' ? 'Odustani' : 'Poribljavanje'}
          </button>
          <button
            type="button"
            className={`pond-action-btn ${activeForm === 'izlov' ? 'pond-action-btn--active' : ''}`}
            onClick={() => toggleForm('izlov')}
          >
            {activeForm === 'izlov' ? 'Odustani' : 'Izlov'}
          </button>
          <button
            type="button"
            className={`pond-action-btn ${activeForm === 'kontrola' ? 'pond-action-btn--active' : ''}`}
            onClick={() => toggleForm('kontrola')}
          >
            {activeForm === 'kontrola' ? 'Odustani' : 'Kontrola'}
          </button>
          <button
            type="button"
            className={`pond-action-btn ${activeForm === 'hranjenje' ? 'pond-action-btn--active' : ''}`}
            onClick={() => toggleForm('hranjenje')}
          >
            {activeForm === 'hranjenje' ? 'Odustani' : 'Hranjenje'}
          </button>
        </div>

        {activeForm === 'water' && (
          <form className="pond-water-form" onSubmit={handleWaterFormSubmit}>
            <h4>Unos razine vode — {pond.code}</h4>
            {waterFormError ? <p className="error-text">{waterFormError}</p> : null}
            <div className="pond-water-form-grid">
              <label>
                Datum
                <input
                  type="date"
                  name="measurement_date"
                  value={waterForm.measurement_date}
                  onChange={handleWaterFormChange}
                />
              </label>
              <label>
                Trenutni vodostaj (cm) *
                <input
                  type="number"
                  name="water_level_current_cm"
                  value={waterForm.water_level_current_cm}
                  onChange={handleWaterFormChange}
                  inputMode="numeric"
                  placeholder="npr. 180"
                  required
                />
              </label>
              <label>
                Puni vodostaj (cm)
                <input
                  type="number"
                  name="water_level_full_cm"
                  value={waterForm.water_level_full_cm}
                  onChange={handleWaterFormChange}
                  inputMode="numeric"
                  placeholder="npr. 200"
                />
              </label>
              <label>
                Nedostaje (cm)
                <input
                  type="number"
                  name="water_level_missing_cm"
                  value={waterForm.water_level_missing_cm}
                  onChange={handleWaterFormChange}
                  inputMode="numeric"
                  placeholder="auto"
                />
              </label>
              <label>
                Površina (ha)
                <input
                  type="number"
                  name="area_ha"
                  value={waterForm.area_ha}
                  onChange={handleWaterFormChange}
                  inputMode="decimal"
                  placeholder="npr. 2.5"
                  step="0.01"
                />
              </label>
              <label className="pond-water-form-note">
                Napomena
                <textarea
                  name="note"
                  value={waterForm.note}
                  onChange={handleWaterFormChange}
                  placeholder="Opcionalna napomena…"
                  rows={2}
                />
              </label>
            </div>
            <button type="submit" className="pond-action-btn pond-action-btn--primary" disabled={waterFormSaving}>
              {waterFormSaving ? 'Sprema se…' : 'Spremi mjerenje'}
            </button>
          </form>
        )}

        {activeForm === 'poribljavanje' && (
          <PoribljavanjeForm
            pondId={pond.id}
            waterObjects={waterObjects}
            species={species}
            categories={categories}
            onSave={() => { setActiveForm(null); loadAll(); }}
            onCancel={() => setActiveForm(null)}
          />
        )}

        {activeForm === 'izlov' && (
          <IzlovForm
            pondId={pond.id}
            stock={stock}
            species={species}
            categories={categories}
            onSave={() => { setActiveForm(null); loadAll(); }}
            onCancel={() => setActiveForm(null)}
          />
        )}

        {activeForm === 'kontrola' && (
          <KontrolaForm
            pondId={pond.id}
            species={species}
            categories={categories}
            onSave={() => { setActiveForm(null); loadAll(); }}
            onCancel={() => setActiveForm(null)}
          />
        )}

        {activeForm === 'hranjenje' && (
          <FeedingEventForm
            pondId={pond.id}
            feedTypes={feedTypes}
            feedStock={feedStock}
            onSave={() => { setActiveForm(null); loadAll(); }}
            onCancel={() => setActiveForm(null)}
          />
        )}
      </section>

      {/* ── current fish stock ── */}
      <section className="card pond-detail-section">
        <h3>Riblji fond — trenutno stanje</h3>
        {stock.length === 0 ? (
          <p className="pond-empty-state">Nema evidentiranog fonda za ovaj objekt.</p>
        ) : (
          <>
            <div className="pond-stock-summary">
              <article>
                <h4>Ukupno (kom)</h4>
                <p>{formatInteger(totalCount)}</p>
              </article>
              <article>
                <h4>Ukupno (kg)</h4>
                <p>{formatDecimal(totalWeight, 2)}</p>
              </article>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Vrsta</th>
                    <th>Kategorija</th>
                    <th className="numeric-cell">Kom</th>
                    <th className="numeric-cell">Kg ukupno</th>
                    <th className="numeric-cell">Prosjek kg</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.map((row) => (
                    <tr key={row.id}>
                      <td>{row.species_label ?? row.species_code ?? '-'}</td>
                      <td>{row.category_label ?? row.category_code ?? '-'}</td>
                      <td className="numeric-cell">{formatInteger(row.count_total)}</td>
                      <td className="numeric-cell">{formatDecimal(row.weight_total_kg, 2)}</td>
                      <td className="numeric-cell">{formatDecimal(row.weight_avg_kg, 3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* ── water level history ── */}
      <section className="card pond-detail-section">
        <div className="pond-section-header">
          <h3>Razina vode — povijest</h3>
          {latestLevel && (
            <span className="pond-latest-badge">
              Zadnje: {formatDate(latestLevel.measurement_date)} — {formatCm(latestLevel.water_level_current_cm)}
            </span>
          )}
        </div>
        {waterLevels.length === 0 ? (
          <p className="pond-empty-state">Nema mjerenja vodostaja za ovaj objekt.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Datum</th>
                  <th className="numeric-cell">Trenutni (cm)</th>
                  <th className="numeric-cell">Puni (cm)</th>
                  <th className="numeric-cell">Nedostaje (cm)</th>
                  <th className="numeric-cell">Površina (ha)</th>
                  <th>Napomena</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {waterLevels.map((m) => (
                  <tr key={m.id}>
                    <td>{formatDate(m.measurement_date)}</td>
                    <td className="numeric-cell">{formatCm(m.water_level_current_cm)}</td>
                    <td className="numeric-cell">{formatCm(m.water_level_full_cm)}</td>
                    <td className="numeric-cell">{formatCm(m.water_level_missing_cm)}</td>
                    <td className="numeric-cell">{m.area_ha !== null && m.area_ha !== undefined ? `${formatDecimal(m.area_ha, 2)} ha` : '-'}</td>
                    <td>{m.note || '-'}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-delete-small"
                        onClick={() => handleDeleteWaterLevel(m.id)}
                      >
                        Obriši
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── unified event history ── */}
      <section className="card pond-detail-section">
        <h3>Povijest događaja</h3>
        {unifiedHistory.length === 0 ? (
          <p className="pond-empty-state">Nema evidentiranih događaja za ovaj objekt.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Vrsta događaja</th>
                  <th>Vrsta ribe</th>
                  <th>Kategorija</th>
                  <th className="numeric-cell">Kom</th>
                  <th className="numeric-cell">Kg</th>
                  <th>Napomena</th>
                </tr>
              </thead>
              <tbody>
                {unifiedHistory.map((row) => {
                  const style = EVENT_TYPE_STYLE[row._type];
                  return (
                    <tr key={`${row._type}-${row.id}`} className={`event-row event-row--${row._type}`}>
                      <td>{formatDate(row.date)}</td>
                      <td>
                        <span className={style.className}>{style.label}</span>
                        {' '}{row.typeLabel}
                      </td>
                      <td>{row.species ?? '—'}</td>
                      <td>{row.category ?? '—'}</td>
                      <td className="numeric-cell">{row.count !== null ? formatInteger(row.count) : '—'}</td>
                      <td className="numeric-cell">{row.weight !== null ? formatDecimal(row.weight, 2) : '—'}</td>
                      <td>{row.notes || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
}
