import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../auth/state/AuthContext';
import { listFishStockAggregateRequest } from '../../fish/api/fishApi';
import { listWaterObjectsRequest } from '../../water-objects/api/waterObjectsApi';

const SATELLITE_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const DEFAULT_CENTER = [45.45, 16.85];

function parseGeoJsonValue(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  return typeof value === 'object' ? value : null;
}

function normalizeToFeatureOrCollection(geojson) {
  if (!geojson || typeof geojson !== 'object') {
    return null;
  }

  if (geojson.type === 'Feature' || geojson.type === 'FeatureCollection') {
    return geojson;
  }

  if (typeof geojson.type === 'string' && geojson.coordinates) {
    return {
      type: 'Feature',
      properties: {},
      geometry: geojson
    };
  }

  return null;
}

function parseCentroidWkt(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const match = value.trim().match(/^POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)$/i);
  if (!match) {
    return null;
  }

  const longitude = Number(match[1]);
  const latitude = Number(match[2]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return [latitude, longitude];
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatInteger(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return '-';
  }

  return parsed.toLocaleString('hr-HR', { maximumFractionDigits: 0 });
}

function formatDecimal(value, digits = 2) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return '-';
  }

  return parsed.toLocaleString('hr-HR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function formatArea(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return `${formatDecimal(value, 2)} m²`;
}

function formatAreaHa(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return `${formatDecimal(value, 2)} ha`;
}

function formatCentimeters(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return '-';
  }

  return `${parsed.toLocaleString('hr-HR', { maximumFractionDigits: 0 })} cm`;
}

function formatDepth(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return `${formatDecimal(value, 2)} m`;
}

function formatVolume(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return `${formatDecimal(value, 2)} m³`;
}

function buildStockGroups(rows) {
  const groups = rows.reduce((acc, row) => {
    const key = `${row.species_code ?? row.species_label ?? 'unknown'}-${row.category_code ?? row.category_label ?? 'unknown'}`;

    if (!acc[key]) {
      acc[key] = {
        species: row.species_name ?? row.species_label ?? row.species_code ?? '-',
        category: row.category_label ?? row.category_name ?? row.category_code ?? 'Bez kategorije',
        count_total: 0,
        weight_total_kg: 0
      };
    }

    acc[key].count_total += toNumber(row.count_total);
    acc[key].weight_total_kg += toNumber(row.weight_total_kg);
    return acc;
  }, {});

  return Object.values(groups)
    .map((group) => ({
      ...group,
      weight_avg_kg: group.count_total > 0 ? group.weight_total_kg / group.count_total : 0
    }))
    .sort((left, right) => {
      const speciesComparison = left.species.localeCompare(right.species, 'hr-HR');
      return speciesComparison || left.category.localeCompare(right.category, 'hr-HR');
    });
}

function getObjectLabel(item) {
  return item.name ? `${item.code} — ${item.name}` : item.code;
}

function getWaterLevelStatus(note) {
  const normalized = String(note ?? '').toLowerCase();

  if (normalized.includes('prazan')) {
    return { label: 'Kritično', className: 'water-level-status critical' };
  }

  if (normalized.includes('potrebno') || normalized.includes('pražnjenje')) {
    return { label: 'Upozorenje', className: 'water-level-status warning' };
  }

  if (normalized.includes('punjenje')) {
    return { label: 'Info', className: 'water-level-status info' };
  }

  return { label: 'Bez statusa', className: 'water-level-status neutral' };
}

export function MapDashboardPage() {
  const { token } = useAuth();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const layerGroupRef = useRef(null);
  const [waterObjects, setWaterObjects] = useState([]);
  const [stockRows, setStockRows] = useState([]);
  const [selectedObjectId, setSelectedObjectId] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      setError('');

      try {
        const [waterObjectsResponse, stockResponse] = await Promise.all([
          listWaterObjectsRequest(token),
          listFishStockAggregateRequest(token)
        ]);

        const sortedObjects = [...(waterObjectsResponse.items ?? [])].sort((left, right) => (
          String(left.code ?? '').localeCompare(String(right.code ?? ''), 'hr-HR', { numeric: true })
        ));

        setWaterObjects(sortedObjects);
        setStockRows(Array.isArray(stockResponse) ? stockResponse : []);
        setSelectedObjectId((currentId) => currentId ?? sortedObjects[0]?.id ?? null);
      } catch (loadError) {
        setError(loadError.message || 'Neuspješno učitavanje karte ribnjaka.');
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, [token]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 13
    });

    L.tileLayer(SATELLITE_TILE_URL, {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri'
    }).addTo(map);

    layerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  const stockByWaterObjectId = useMemo(() => {
    return stockRows.reduce((acc, row) => {
      const id = Number(row.water_object_id);
      if (!Number.isFinite(id)) {
        return acc;
      }

      if (!acc[id]) {
        acc[id] = [];
      }

      acc[id].push(row);
      return acc;
    }, {});
  }, [stockRows]);

  const mapObjects = useMemo(() => {
    return waterObjects.map((item) => {
      const polygon = normalizeToFeatureOrCollection(parseGeoJsonValue(item.polygon_geojson));
      const centroid = parseCentroidWkt(item.centroid_wkt);
      const geometryKind = polygon ? 'polygon' : centroid ? 'centroid' : 'missing';

      return {
        item,
        polygon,
        centroid,
        geometryKind
      };
    });
  }, [waterObjects]);

  const drawableObjects = useMemo(() => mapObjects.filter((entry) => entry.geometryKind !== 'missing'), [mapObjects]);
  const skippedCount = mapObjects.length - drawableObjects.length;
  const selectedObject = waterObjects.find((item) => item.id === selectedObjectId) ?? waterObjects[0] ?? null;
  const selectedStockRows = selectedObject ? stockByWaterObjectId[selectedObject.id] ?? [] : [];
  const selectedWaterLevel = selectedObject?.latest_water_level_measurement ?? null;
  const selectedWaterLevelStatus = getWaterLevelStatus(selectedWaterLevel?.note);
  const selectedStockGroups = useMemo(() => buildStockGroups(selectedStockRows), [selectedStockRows]);
  const selectedTotals = useMemo(() => selectedStockRows.reduce(
    (acc, row) => {
      acc.count_total += toNumber(row.count_total);
      acc.weight_total_kg += toNumber(row.weight_total_kg);
      return acc;
    },
    { count_total: 0, weight_total_kg: 0 }
  ), [selectedStockRows]);

  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;

    if (!map || !layerGroup) {
      return;
    }

    layerGroup.clearLayers();
    const bounds = L.latLngBounds([]);

    drawableObjects.forEach(({ item, polygon, centroid, geometryKind }) => {
      const isSelected = item.id === selectedObjectId;
      let layer;

      if (geometryKind === 'polygon') {
        layer = L.geoJSON(polygon, {
          style: {
            color: isSelected ? '#f97316' : '#38bdf8',
            weight: isSelected ? 4 : 2,
            fillColor: isSelected ? '#f97316' : '#0ea5e9',
            fillOpacity: isSelected ? 0.32 : 0.22
          }
        });

        const layerBounds = layer.getBounds();
        if (layerBounds.isValid()) {
          bounds.extend(layerBounds);
        }
      } else {
        layer = L.circleMarker(centroid, {
          radius: isSelected ? 9 : 7,
          color: isSelected ? '#f97316' : '#38bdf8',
          fillColor: isSelected ? '#f97316' : '#0ea5e9',
          fillOpacity: 0.9,
          weight: 2
        });

        bounds.extend(centroid);
      }

      layer.on('click', () => setSelectedObjectId(item.id));
      layer.bindPopup(`<strong>${getObjectLabel(item)}</strong><br>${item.object_type ?? '-'}`);
      layer.addTo(layerGroup);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
    }
  }, [drawableObjects, selectedObjectId]);

  return (
    <div className="map-dashboard">
      <section className="card map-dashboard-header">
        <div>
          <h2>Karta ribnjaka</h2>
          <p>Operativni pregled vodnih objekata, geometrije i trenutnog stanja ribljeg fonda.</p>
        </div>
        <nav className="dashboard-actions" aria-label="Brze akcije">
          <Link to="/app/home">Početna</Link>
          <Link to="/app/fish-entry/new">Novo poribljavanje</Link>
          <Link to="/app/fish-stock">Novi izlov</Link>
          <Link to="/app/fish">Nova kontrola</Link>
          <Link to="/app/water-objects">Vodni objekti</Link>
        </nav>
      </section>

      <section className="card map-dashboard-map-card">
        {error ? <p className="error-text">{error}</p> : null}
        {isLoading ? <p>Učitavanje karte...</p> : null}
        <div ref={mapContainerRef} className="map-dashboard-map" role="img" aria-label="Satelitska karta vodnih objekata" />
        <p className="map-dashboard-note">
          Prikazano: {drawableObjects.length} · Preskočeno bez geometrije: {skippedCount}
        </p>
      </section>

      <aside className="card map-dashboard-side-panel">
        <h3>Detalji objekta</h3>
        {!selectedObject ? <p>Nema odabranog objekta.</p> : null}
        {selectedObject ? (
          <>
            <dl className="object-detail-list">
              <div><dt>Šifra/naziv</dt><dd>{getObjectLabel(selectedObject)}</dd></div>
              <div><dt>Tip</dt><dd>{selectedObject.object_type ?? '-'}</dd></div>
              <div><dt>Ukupna površina</dt><dd>{formatArea(selectedObject.area_total_m2)}</dd></div>
              <div><dt>Produktivna površina</dt><dd>{formatArea(selectedObject.area_productive_m2)}</dd></div>
              <div><dt>Maks. dubina</dt><dd>{formatDepth(selectedObject.max_depth_m)}</dd></div>
              <div><dt>Maks. volumen</dt><dd>{formatVolume(selectedObject.max_volume_m3 ?? selectedObject.water_volume_m3)}</dd></div>
            </dl>

            <section className="water-level-panel">
              <div className="water-level-panel-heading">
                <h4>Trenutni vodostaj</h4>
                <span className={selectedWaterLevelStatus.className}>{selectedWaterLevelStatus.label}</span>
              </div>
              {!selectedWaterLevel ? <p>Nema terenskog mjerenja vodostaja za ovaj objekt.</p> : null}
              {selectedWaterLevel ? (
                <dl className="object-detail-list">
                  <div><dt>Površina</dt><dd>{formatAreaHa(selectedWaterLevel.area_ha)}</dd></div>
                  <div><dt>Puni vodostaj</dt><dd>{formatCentimeters(selectedWaterLevel.water_level_full_cm)}</dd></div>
                  <div><dt>Trenutni vodostaj</dt><dd>{formatCentimeters(selectedWaterLevel.water_level_current_cm)}</dd></div>
                  <div><dt>Nedostaje</dt><dd>{formatCentimeters(selectedWaterLevel.water_level_missing_cm)}</dd></div>
                  <div><dt>Napomena</dt><dd>{selectedWaterLevel.note || '-'}</dd></div>
                </dl>
              ) : null}
            </section>

            <section className="fish-stock-summary compact-stock-summary">
              <article className="fish-stock-summary-card">
                <h4>Ukupno riba</h4>
                <p>{formatInteger(selectedTotals.count_total)}</p>
              </article>
              <article className="fish-stock-summary-card">
                <h4>Ukupna masa</h4>
                <p>{formatDecimal(selectedTotals.weight_total_kg, 2)} kg</p>
              </article>
            </section>

            <h4>Stanje po vrsti i kategoriji</h4>
            {selectedStockGroups.length === 0 ? <p>Nema evidentiranog fonda za ovaj objekt.</p> : null}
            {selectedStockGroups.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Vrsta</th>
                      <th>Kategorija</th>
                      <th className="numeric-cell">Kom</th>
                      <th className="numeric-cell">Kg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedStockGroups.map((row) => (
                      <tr key={`${row.species}-${row.category}`}>
                        <td>{row.species}</td>
                        <td>{row.category}</td>
                        <td className="numeric-cell">{formatInteger(row.count_total)}</td>
                        <td className="numeric-cell">{formatDecimal(row.weight_total_kg, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        ) : null}
      </aside>
    </div>
  );
}
