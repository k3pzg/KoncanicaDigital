import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../auth/state/AuthContext';
import { listFishStockAggregateRequest } from '../../fish/api/fishApi';
import {
  normalizeToFeatureOrCollection,
  parseGeoJsonValue
} from '../../water-objects/components/WaterObjectsMap';
import { listWaterObjectsRequest } from '../../water-objects/api/waterObjectsApi';

const SATELLITE_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const DEFAULT_CENTER = [45.637, 17.165];
const DEFAULT_ZOOM = 13;

const MAP_MODES = {
  water: { label: 'Voda' },
  fish: { label: 'Riba' }
};

const WATER_COLORS = {
  good: '#22c55e',
  warning: '#facc15',
  info: '#facc15',
  elevated: '#f97316',
  critical: '#dc2626',
  missing: '#94a3b8'
};

const FISH_COLORS = {
  missing: '#94a3b8',
  below: '#7dd3fc',
  optimal: '#22c55e',
  high: '#f97316',
  critical: '#dc2626'
};

const WATER_LEGEND = [
  { color: WATER_COLORS.good, label: 'Nedostaje do 25 cm' },
  { color: WATER_COLORS.warning, label: 'Nedostaje 25–75 cm / Potrebno / Punjenje' },
  { color: WATER_COLORS.elevated, label: 'Nedostaje 75–150 cm / Pražnjenje' },
  { color: WATER_COLORS.critical, label: 'Nedostaje više od 150 cm / Prazan' },
  { color: WATER_COLORS.missing, label: 'Nema vodostaja' }
];

const FISH_LEGEND = [
  { color: FISH_COLORS.below, label: 'Ispod 500 kg/ha' },
  { color: FISH_COLORS.optimal, label: '500–1000 kg/ha' },
  { color: FISH_COLORS.high, label: '1000–1200 kg/ha' },
  { color: FISH_COLORS.critical, label: 'Iznad 1200 kg/ha' },
  { color: FISH_COLORS.missing, label: 'Nema fonda ili površine' }
];


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


function formatKilograms(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return `${formatDecimal(value, 2)} kg`;
}

function formatKgPerHa(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return `${formatDecimal(value, 2)} kg/ha`;
}

function getAreaHa(item) {
  const waterLevelArea = Number(item?.latest_water_level_measurement?.area_ha);
  if (Number.isFinite(waterLevelArea) && waterLevelArea > 0) {
    return waterLevelArea;
  }

  const productiveAreaM2 = Number(item?.area_productive_m2);
  if (Number.isFinite(productiveAreaM2) && productiveAreaM2 > 0) {
    return productiveAreaM2 / 10000;
  }

  const totalAreaM2 = Number(item?.area_total_m2);
  if (Number.isFinite(totalAreaM2) && totalAreaM2 > 0) {
    return totalAreaM2 / 10000;
  }

  return null;
}

function getStockSpecies(row) {
  return row.species_name ?? row.species_label ?? row.species_code ?? '-';
}

function getStockCategory(row) {
  return row.category_label ?? row.category_name ?? row.category_code ?? 'Bez kategorije';
}

function buildStockGroups(rows) {
  const groups = rows.reduce((acc, row) => {
    const key = `${row.species_id ?? row.species_code ?? row.species_label ?? 'unknown'}-${row.category_id ?? row.category_code ?? row.category_label ?? 'unknown'}`;

    if (!acc[key]) {
      acc[key] = {
        species: getStockSpecies(row),
        category: getStockCategory(row),
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
  return item?.name ? `${item.code} — ${item.name}` : item?.code ?? '-';
}

function getWaterStatus(item) {
  const measurement = item?.latest_water_level_measurement ?? null;
  const note = String(measurement?.note ?? '').toLocaleLowerCase('hr-HR');
  const missingCm = Number(measurement?.water_level_missing_cm);
  const hasMissingCm = Number.isFinite(missingCm);
  const isCriticalMissing = hasMissingCm && missingCm < -150;

  if (note.includes('prazan')) {
    return { label: 'Kritično / Prazan', key: 'critical', color: WATER_COLORS.critical };
  }

  if (note.includes('pražnjenje')) {
    return { label: 'Pražnjenje', key: 'elevated', color: WATER_COLORS.elevated };
  }

  if (isCriticalMissing) {
    return { label: 'Kritično', key: 'critical', color: WATER_COLORS.critical };
  }

  if (note.includes('punjenje')) {
    return { label: 'Punjenje', key: 'info', color: WATER_COLORS.info };
  }

  if (note.includes('potrebno')) {
    return { label: 'Potrebno', key: 'warning', color: WATER_COLORS.warning };
  }

  if (!measurement || !hasMissingCm) {
    return { label: 'Nema vodostaja', key: 'missing', color: WATER_COLORS.missing };
  }

  if (missingCm < -75) {
    return { label: 'Povišen manjak', key: 'elevated', color: WATER_COLORS.elevated };
  }

  if (missingCm < -25) {
    return { label: 'Upozorenje', key: 'warning', color: WATER_COLORS.warning };
  }

  return { label: 'Dobro', key: 'good', color: WATER_COLORS.good };
}

function getFishDensityStatus(stockSummary) {
  if (!stockSummary?.hasStock || !stockSummary.area_ha) {
    return { label: 'Nema podataka', key: 'missing', color: FISH_COLORS.missing };
  }

  if (stockSummary.kg_per_ha < 500) {
    return { label: 'Ispod norme', key: 'below', color: FISH_COLORS.below };
  }

  if (stockSummary.kg_per_ha <= 1000) {
    return { label: 'U normi', key: 'optimal', color: FISH_COLORS.optimal };
  }

  if (stockSummary.kg_per_ha <= 1200) {
    return { label: 'Iznad norme', key: 'high', color: FISH_COLORS.high };
  }

  return { label: 'Kritično iznad norme', key: 'critical', color: FISH_COLORS.critical };
}

function getModeStatusClass(statusKey) {
  if (statusKey === 'critical') {
    return 'water-level-status critical';
  }

  if (statusKey === 'warning' || statusKey === 'elevated' || statusKey === 'high' || statusKey === 'below') {
    return 'water-level-status warning';
  }

  if (statusKey === 'info') {
    return 'water-level-status info';
  }

  if (statusKey === 'good' || statusKey === 'optimal') {
    return 'water-level-status good';
  }

  return 'water-level-status neutral';
}

function getStockKeys(row) {
  return [
    row.water_object_id === null || row.water_object_id === undefined ? null : `id:${Number(row.water_object_id)}`,
    row.water_object_code ? `code:${String(row.water_object_code)}` : null,
    row.water_object_label ? `code:${String(row.water_object_label)}` : null
  ].filter(Boolean);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function MapDashboardPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const layerGroupRef = useRef(null);
  const [waterObjects, setWaterObjects] = useState([]);
  const [stockRows, setStockRows] = useState([]);
  const [selectedObjectId, setSelectedObjectId] = useState(null);
  const [mapMode, setMapMode] = useState('water');
  const [mapError, setMapError] = useState('');
  const [stockError, setStockError] = useState('');
  const [isLoadingWaterObjects, setIsLoadingWaterObjects] = useState(true);
  const [isLoadingStock, setIsLoadingStock] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadWaterObjects() {
      setIsLoadingWaterObjects(true);
      setMapError('');

      try {
        const waterObjectsResponse = await listWaterObjectsRequest(token);
        if (!isMounted) {
          return;
        }

        const sortedObjects = [...(waterObjectsResponse.items ?? [])].sort((left, right) => (
          String(left.code ?? '').localeCompare(String(right.code ?? ''), 'hr-HR', { numeric: true })
        ));

        setWaterObjects(sortedObjects);
        setSelectedObjectId((currentId) => (
          currentId && sortedObjects.some((item) => item.id === currentId)
            ? currentId
            : sortedObjects[0]?.id ?? null
        ));
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setWaterObjects([]);
        setSelectedObjectId(null);
        setMapError(loadError.message || 'Neuspješno učitavanje vodnih objekata.');
      } finally {
        if (isMounted) {
          setIsLoadingWaterObjects(false);
        }
      }
    }

    async function loadFishStock() {
      setIsLoadingStock(true);
      setStockError('');

      try {
        const stockResponse = await listFishStockAggregateRequest(token);
        if (!isMounted) {
          return;
        }

        setStockRows(Array.isArray(stockResponse) ? stockResponse : stockResponse.items ?? []);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setStockRows([]);
        setStockError(loadError.message || 'Neuspješno učitavanje ribljeg fonda.');
      } finally {
        if (isMounted) {
          setIsLoadingStock(false);
        }
      }
    }

    loadWaterObjects();
    loadFishStock();

    return () => {
      isMounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM
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

  const stockByWaterObjectKey = useMemo(() => {
    return stockRows.reduce((acc, row) => {
      getStockKeys(row).forEach((key) => {
        if (!acc[key]) {
          acc[key] = [];
        }

        acc[key].push(row);
      });

      return acc;
    }, {});
  }, [stockRows]);

  const stockSummaryByWaterObjectKey = useMemo(() => {
    return Object.entries(stockByWaterObjectKey).reduce((acc, [key, rows]) => {
      const totals = rows.reduce(
        (summary, row) => {
          summary.total_count += toNumber(row.count_total);
          summary.total_weight_kg += toNumber(row.weight_total_kg);
          return summary;
        },
        { total_count: 0, total_weight_kg: 0 }
      );

      acc[key] = {
        ...totals,
        hasStock: rows.length > 0,
        rows: buildStockGroups(rows)
      };

      return acc;
    }, {});
  }, [stockByWaterObjectKey]);

  function getStockSummaryForObject(item) {
    const baseSummary = stockSummaryByWaterObjectKey[`id:${Number(item.id)}`]
      ?? stockSummaryByWaterObjectKey[`code:${String(item.code)}`]
      ?? { total_count: 0, total_weight_kg: 0, hasStock: false, rows: [] };
    const areaHa = getAreaHa(item);
    const kgPerHa = baseSummary.hasStock && areaHa ? baseSummary.total_weight_kg / areaHa : null;
    const minAllowedKg = areaHa ? areaHa * 500 : null;
    const maxAllowedKg = areaHa ? areaHa * 1000 : null;
    const normDifferenceKg = kgPerHa === null
      ? null
      : baseSummary.total_weight_kg < minAllowedKg
        ? baseSummary.total_weight_kg - minAllowedKg
        : baseSummary.total_weight_kg > maxAllowedKg
          ? baseSummary.total_weight_kg - maxAllowedKg
          : 0;

    return {
      ...baseSummary,
      area_ha: areaHa,
      kg_per_ha: kgPerHa,
      min_allowed_kg: minAllowedKg,
      max_allowed_kg: maxAllowedKg,
      norm_difference_kg: normDifferenceKg
    };
  }

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

  const polygonObjects = useMemo(() => mapObjects.filter((entry) => entry.geometryKind === 'polygon'), [mapObjects]);
  const markerObjects = useMemo(() => mapObjects.filter((entry) => entry.geometryKind === 'centroid'), [mapObjects]);
  const drawableObjects = useMemo(() => [...polygonObjects, ...markerObjects], [polygonObjects, markerObjects]);
  const skippedCount = mapObjects.length - drawableObjects.length;
  const selectedObject = waterObjects.find((item) => item.id === selectedObjectId) ?? waterObjects[0] ?? null;
  const selectedWaterLevel = selectedObject?.latest_water_level_measurement ?? null;
  const selectedWaterLevelStatus = selectedObject ? getWaterStatus(selectedObject) : getWaterStatus(null);
  const selectedStockSummary = selectedObject
    ? getStockSummaryForObject(selectedObject)
    : { total_count: 0, total_weight_kg: 0, kg_per_ha: null, min_allowed_kg: null, max_allowed_kg: null, norm_difference_kg: null, rows: [] };
  const selectedFishStatus = getFishDensityStatus(selectedStockSummary);
  const selectedModeStatus = mapMode === 'water' ? selectedWaterLevelStatus : selectedFishStatus;
  const selectedStockGroups = selectedStockSummary.rows;
  const selectedTotals = {
    count_total: selectedStockSummary.total_count,
    weight_total_kg: selectedStockSummary.total_weight_kg
  };
  const waterLevelRowsAvailable = useMemo(
    () => waterObjects.filter((item) => item.latest_water_level_measurement).length,
    [waterObjects]
  );

  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;

    if (!map || !layerGroup) {
      return;
    }

    layerGroup.clearLayers();
    const polygonBounds = L.latLngBounds([]);
    const allBounds = L.latLngBounds([]);

    drawableObjects.forEach(({ item, polygon, centroid, geometryKind }) => {
      const isSelected = item.id === selectedObjectId;
      let layer;

      const waterStatus = getWaterStatus(item);
      const stockSummary = getStockSummaryForObject(item);
      const fishStatus = getFishDensityStatus(stockSummary);
      const modeStatus = mapMode === 'water' ? waterStatus : fishStatus;
      const fillColor = modeStatus.color;

      if (geometryKind === 'polygon') {
        layer = L.geoJSON(polygon, {
          style: {
            color: isSelected ? '#0f172a' : '#ffffff',
            weight: isSelected ? 4 : 2,
            fillColor,
            fillOpacity: isSelected ? 0.58 : 0.42
          }
        });

        const layerBounds = layer.getBounds();
        if (layerBounds.isValid()) {
          polygonBounds.extend(layerBounds);
          allBounds.extend(layerBounds);
        }
      } else {
        layer = L.circleMarker(centroid, {
          radius: isSelected ? 9 : 7,
          color: isSelected ? '#0f172a' : '#ffffff',
          fillColor,
          fillOpacity: 0.9,
          weight: 2
        });

        allBounds.extend(centroid);
      }

      layer.on('click', () => setSelectedObjectId(item.id));
      layer.bindPopup(`<strong>${escapeHtml(getObjectLabel(item))}</strong><br>${escapeHtml(MAP_MODES[mapMode].label)}: ${escapeHtml(modeStatus.label)}`);
      layer.addTo(layerGroup);
    });

    if (polygonBounds.isValid()) {
      map.fitBounds(polygonBounds, { padding: [30, 30], maxZoom: 16 });
    } else if (allBounds.isValid()) {
      map.fitBounds(allBounds, { padding: [30, 30], maxZoom: 16 });
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  }, [drawableObjects, mapMode, selectedObjectId, stockSummaryByWaterObjectKey]);

  return (
    <div className="map-dashboard">
      <section className="card map-dashboard-header">
        <div>
          <h2>Karta ribnjaka</h2>
          <p>Operativni pregled vodnih objekata, geometrije, vodostaja i trenutnog stanja ribljeg fonda.</p>
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
        {mapError ? <p className="error-text">{mapError}</p> : null}
        {isLoadingWaterObjects ? <p>Učitavanje vodnih objekata...</p> : null}
        <div className="map-mode-toolbar" aria-label="Način bojanja karte">
          {Object.entries(MAP_MODES).map(([modeKey, mode]) => (
            <button
              key={modeKey}
              type="button"
              className={mapMode === modeKey ? 'active' : ''}
              aria-pressed={mapMode === modeKey}
              onClick={() => setMapMode(modeKey)}
            >
              {mode.label}
            </button>
          ))}
        </div>
        <div ref={mapContainerRef} className="map-dashboard-map" role="img" aria-label="Satelitska karta vodnih objekata" />
        <div className="map-legend" aria-label={`Legenda: ${MAP_MODES[mapMode].label}`}>
          <strong>Legenda ({MAP_MODES[mapMode].label})</strong>
          <ul>
            {(mapMode === 'water' ? WATER_LEGEND : FISH_LEGEND).map((item) => (
              <li key={item.label}>
                <span style={{ backgroundColor: item.color }} aria-hidden="true" />
                {item.label}
              </li>
            ))}
          </ul>
        </div>
        <dl className="map-dashboard-diagnostics" aria-label="Dijagnostika učitavanja karte">
          <div><dt>Vodni objekti</dt><dd>{formatInteger(waterObjects.length)}</dd></div>
          <div><dt>Poligoni</dt><dd>{formatInteger(polygonObjects.length)}</dd></div>
          <div><dt>Markeri</dt><dd>{formatInteger(markerObjects.length)}</dd></div>
          <div><dt>Bez geometrije</dt><dd>{formatInteger(skippedCount)}</dd></div>
          <div><dt>Redovi fonda</dt><dd>{formatInteger(stockRows.length)}</dd></div>
          <div><dt>Redovi vodostaja</dt><dd>{formatInteger(waterLevelRowsAvailable)}</dd></div>
        </dl>
      </section>

      <aside className="card map-dashboard-side-panel">
        <h3>Detalji objekta</h3>
        {!selectedObject ? <p>Nema odabranog objekta.</p> : null}
        {selectedObject ? (
          <>
            <div className="side-panel-open-btn-row">
              <button
                type="button"
                className="pond-action-btn pond-action-btn--primary"
                onClick={() => navigate(`/app/ponds/${selectedObject.id}`)}
              >
                Otvori ribnjak →
              </button>
            </div>
            <dl className="object-detail-list">
              <div><dt>Šifra/naziv</dt><dd>{getObjectLabel(selectedObject)}</dd></div>
              <div><dt>Tip</dt><dd>{selectedObject.object_type ?? '-'}</dd></div>
              <div><dt>Ukupna površina</dt><dd>{formatArea(selectedObject.area_total_m2)}</dd></div>
              <div><dt>Produktivna površina</dt><dd>{formatArea(selectedObject.area_productive_m2)}</dd></div>
              <div><dt>Maks. dubina</dt><dd>{formatDepth(selectedObject.max_depth_m)}</dd></div>
              <div><dt>Maks. volumen</dt><dd>{formatVolume(selectedObject.max_volume_m3 ?? selectedObject.water_volume_m3)}</dd></div>
              <div><dt>Način prikaza</dt><dd>{MAP_MODES[mapMode].label} <span className={getModeStatusClass(selectedModeStatus.key)}>{selectedModeStatus.label}</span></dd></div>
            </dl>

            <section className="water-level-panel">
              <div className="water-level-panel-heading">
                <h4>Trenutni vodostaj</h4>
                <span className={getModeStatusClass(selectedWaterLevelStatus.key)}>{selectedWaterLevelStatus.label}</span>
              </div>
              {!selectedWaterLevel ? <p>Nema terenskog mjerenja vodostaja za ovaj objekt.</p> : null}
              {selectedWaterLevel ? (
                <dl className="object-detail-list">
                  <div><dt>Površina</dt><dd>{formatAreaHa(selectedWaterLevel.area_ha)}</dd></div>
                  <div><dt>Puni vodostaj</dt><dd>{formatCentimeters(selectedWaterLevel.water_level_full_cm)}</dd></div>
                  <div><dt>Trenutni vodostaj</dt><dd>{formatCentimeters(selectedWaterLevel.water_level_current_cm)}</dd></div>
                  <div><dt>Nedostaje</dt><dd>{formatCentimeters(selectedWaterLevel.water_level_missing_cm)}</dd></div>
                  <div><dt>Napomena/status</dt><dd>{selectedWaterLevel.note || '-'}</dd></div>
                </dl>
              ) : null}
            </section>

            <section className="fish-stock-panel">
              <div className="water-level-panel-heading">
                <h4>Riblji fond</h4>
                {isLoadingStock ? <span className="water-level-status neutral">Učitavanje</span> : null}
              </div>
              {stockError ? <p className="error-text">{stockError}</p> : null}

              <section className="fish-stock-summary compact-stock-summary">
                <article className="fish-stock-summary-card">
                  <h4>Ukupno riba</h4>
                  <p>{formatInteger(selectedTotals.count_total)}</p>
                </article>
                <article className="fish-stock-summary-card">
                  <h4>Ukupna masa</h4>
                  <p>{formatKilograms(selectedTotals.weight_total_kg)}</p>
                </article>
                <article className="fish-stock-summary-card">
                  <h4>Gustoća</h4>
                  <p>{formatKgPerHa(selectedStockSummary.kg_per_ha)}</p>
                </article>
                <article className="fish-stock-summary-card">
                  <h4>Status</h4>
                  <p><span className={getModeStatusClass(selectedFishStatus.key)}>{selectedFishStatus.label}</span></p>
                </article>
              </section>

              <dl className="object-detail-list fish-norm-list">
                <div><dt>Površina za normu</dt><dd>{formatAreaHa(selectedStockSummary.area_ha)}</dd></div>
                <div><dt>Min. dozvoljeno</dt><dd>{formatKilograms(selectedStockSummary.min_allowed_kg)}</dd></div>
                <div><dt>Maks. dozvoljeno</dt><dd>{formatKilograms(selectedStockSummary.max_allowed_kg)}</dd></div>
                <div><dt>Razlika od norme</dt><dd>{selectedStockSummary.norm_difference_kg === null ? '-' : formatKilograms(selectedStockSummary.norm_difference_kg)}</dd></div>
              </dl>

              <h4>Stanje po vrsti i kategoriji</h4>
              {!stockError && selectedStockGroups.length === 0 ? <p>Nema evidentiranog fonda za ovaj objekt.</p> : null}
              {selectedStockGroups.length > 0 ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Vrsta</th>
                        <th>Kategorija</th>
                        <th className="numeric-cell">Kom</th>
                        <th className="numeric-cell">Kg</th>
                        <th className="numeric-cell">Prosjek kg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedStockGroups.map((row) => (
                        <tr key={`${row.species}-${row.category}`}>
                          <td>{row.species}</td>
                          <td>{row.category}</td>
                          <td className="numeric-cell">{formatInteger(row.count_total)}</td>
                          <td className="numeric-cell">{formatDecimal(row.weight_total_kg, 2)}</td>
                          <td className="numeric-cell">{formatDecimal(row.weight_avg_kg, 3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          </>
        ) : null}
      </aside>
    </div>
  );
}
