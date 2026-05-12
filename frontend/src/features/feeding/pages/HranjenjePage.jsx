import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/state/AuthContext';
import {
  listFeedStockRequest,
  listFeedTypesRequest,
  listFeedReceiptsRequest,
  listFeedingEventsRequest
} from '../api/feedingApi';
import { listWaterObjectsRequest } from '../../water-objects/api/waterObjectsApi';
import { FeedStockOverview } from '../components/FeedStockOverview';
import { FeedReceiptForm } from '../components/FeedReceiptForm';
import { FeedingEventForm } from '../components/FeedingEventForm';

// ── formatters ────────────────────────────────────────────────────────────────

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('hr-HR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatKg(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString('hr-HR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' kg';
}

// ── component ─────────────────────────────────────────────────────────────────

const TABS = ['Zalihe', 'Primitci', 'Hranjenja'];

export function HranjenjePage() {
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState('Zalihe');
  const [activeForm, setActiveForm] = useState(null); // null | 'receipt' | 'feeding'

  const [feedTypes, setFeedTypes] = useState([]);
  const [feedStock, setFeedStock] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [events, setEvents] = useState([]);
  const [waterObjects, setWaterObjects] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  async function loadAll() {
    setIsLoading(true);
    setLoadError('');
    try {
      const [typesRes, stockRes, receiptsRes, eventsRes, woRes] = await Promise.all([
        listFeedTypesRequest(token),
        listFeedStockRequest(token),
        listFeedReceiptsRequest(token),
        listFeedingEventsRequest(token),
        listWaterObjectsRequest(token)
      ]);
      setFeedTypes(typesRes.items ?? []);
      setFeedStock(stockRes.items ?? []);
      setReceipts(receiptsRes.items ?? []);
      setEvents(eventsRes.items ?? []);
      setWaterObjects(woRes.items ?? []);
    } catch (err) {
      setLoadError(err.message ?? 'Greška pri učitavanju podataka o hranjenju.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function handleFormSave() {
    setActiveForm(null);
    loadAll();
  }

  function toggleForm(name) {
    setActiveForm((prev) => (prev === name ? null : name));
  }

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="pond-detail-layout">

      {/* ── header ── */}
      <section className="card pond-detail-header">
        <div className="pond-detail-title-row">
          <h2>Hranjenje</h2>
        </div>
        <p className="pond-detail-subtitle">Upravljanje zalihama hrane i evidencija hranjenja</p>
      </section>

      {/* ── quick actions ── */}
      <section className="card pond-detail-actions">
        <h3>Brze akcije</h3>
        <div className="pond-quick-actions">
          <button
            type="button"
            className={`pond-action-btn ${activeForm === 'receipt' ? 'pond-action-btn--active' : 'pond-action-btn--primary'}`}
            onClick={() => toggleForm('receipt')}
          >
            {activeForm === 'receipt' ? 'Odustani' : 'Novi primitak hrane'}
          </button>
          <button
            type="button"
            className={`pond-action-btn ${activeForm === 'feeding' ? 'pond-action-btn--active' : ''}`}
            onClick={() => toggleForm('feeding')}
          >
            {activeForm === 'feeding' ? 'Odustani' : 'Evidentiraj hranjenje'}
          </button>
        </div>

        {activeForm === 'receipt' && (
          <FeedReceiptForm
            feedTypes={feedTypes}
            onSave={handleFormSave}
            onCancel={() => setActiveForm(null)}
          />
        )}

        {activeForm === 'feeding' && (
          <FeedingEventForm
            waterObjects={waterObjects}
            feedTypes={feedTypes}
            feedStock={feedStock}
            onSave={handleFormSave}
            onCancel={() => setActiveForm(null)}
          />
        )}
      </section>

      {/* ── tabs ── */}
      <section className="card pond-detail-section">
        <div className="feed-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`feed-tab-btn ${activeTab === tab ? 'feed-tab-btn--active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {isLoading && <p>Učitavanje…</p>}
        {loadError && <p className="error-text">{loadError}</p>}

        {!isLoading && !loadError && (
          <>
            {activeTab === 'Zalihe' && (
              <div className="feed-tab-content">
                <h3>Trenutno stanje zaliha</h3>
                <FeedStockOverview stock={feedStock} />
              </div>
            )}

            {activeTab === 'Primitci' && (
              <div className="feed-tab-content">
                <h3>Povijest primitaka hrane</h3>
                {receipts.length === 0 ? (
                  <p className="pond-empty-state">Nema evidentiranih primitaka hrane.</p>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Datum</th>
                          <th>Vrsta hrane</th>
                          <th className="numeric-cell">Kolicina (kg)</th>
                          <th>Dobavljac</th>
                          <th>Napomena</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receipts.map((r) => (
                          <tr key={r.id}>
                            <td>{formatDate(r.receipt_date)}</td>
                            <td>{r.feed_type_name}</td>
                            <td className="numeric-cell">{formatKg(r.quantity_kg)}</td>
                            <td>{r.supplier || '-'}</td>
                            <td>{r.note || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Hranjenja' && (
              <div className="feed-tab-content">
                <h3>Povijest hranjenja</h3>
                {events.length === 0 ? (
                  <p className="pond-empty-state">Nema evidentiranih hranjenja.</p>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Datum</th>
                          <th>Vodni objekt</th>
                          <th>Vrsta hrane</th>
                          <th className="numeric-cell">Kolicina (kg)</th>
                          <th>Napomena</th>
                        </tr>
                      </thead>
                      <tbody>
                        {events.map((ev) => (
                          <tr key={ev.id}>
                            <td>{formatDate(ev.event_date)}</td>
                            <td>{ev.water_object_code}</td>
                            <td>{ev.feed_type_name}</td>
                            <td className="numeric-cell">{formatKg(ev.quantity_kg)}</td>
                            <td>{ev.note || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
