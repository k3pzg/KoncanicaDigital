import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';

export function parseGeoJsonValue(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return null; }
  }
  if (typeof value === 'object') return value;
  return null;
}

export function normalizeToFeatureOrCollection(geojson) {
  if (!geojson || typeof geojson !== 'object') return null;
  if (geojson.type === 'Feature' || geojson.type === 'FeatureCollection') return geojson;
  if (typeof geojson.type === 'string' && geojson.coordinates) {
    return { type: 'Feature', properties: {}, geometry: geojson };
  }
  return null;
}

function computeCentroidWkt(coordinates) {
  const ring = coordinates[0];
  if (!ring || ring.length === 0) return '';
  let sumLng = 0, sumLat = 0;
  for (const [lng, lat] of ring) { sumLng += lng; sumLat += lat; }
  const n = ring.length;
  return `POINT(${(sumLng / n).toFixed(6)} ${(sumLat / n).toFixed(6)})`;
}

export function WaterObjectsMap({ items, selectedObjectId, drawEnabled, onPolygonDrawn }) {
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const drawnItemsRef = useRef(null);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, { center: [45.1, 15.2], zoom: 7 });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      drawnItemsRef.current = null;
    };
  }, []);

  // Render existing polygons when items/selection changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const layers = [];

    items.forEach((item) => {
      const parsed = parseGeoJsonValue(item.polygon_geojson);
      const featureGeoJson = normalizeToFeatureOrCollection(parsed);
      if (!featureGeoJson) return;

      const layer = L.geoJSON(featureGeoJson, {
        style: {
          color: item.id === selectedObjectId ? '#dc2626' : '#1e40af',
          weight: item.id === selectedObjectId ? 3 : 2,
          fillOpacity: 0.2
        }
      }).addTo(map);

      layers.push({ item, layer });
    });

    if (layers.length) {
      const selected = layers.find((entry) => entry.item.id === selectedObjectId);
      const focusLayer = selected?.layer ?? layers[0].layer;
      const bounds = focusLayer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
    }

    return () => {
      layers.forEach(({ layer }) => map.removeLayer(layer));
    };
  }, [items, selectedObjectId]);

  // Draw control — shown only when form is visible
  useEffect(() => {
    const map = mapRef.current;
    const drawnItems = drawnItemsRef.current;
    if (!map || !drawnItems) return;

    if (!drawEnabled) return;

    drawnItems.clearLayers();

    const drawControl = new L.Control.Draw({
      position: 'topleft',
      draw: {
        polygon: {
          shapeOptions: { color: '#2563eb', fillOpacity: 0.25 },
          allowIntersection: false,
          showArea: true
        },
        polyline: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false
      },
      edit: { featureGroup: drawnItems }
    });

    map.addControl(drawControl);

    function onDrawCreated(e) {
      drawnItems.clearLayers();
      drawnItems.addLayer(e.layer);
      const geojson = e.layer.toGeoJSON();
      const centroidWkt = computeCentroidWkt(geojson.geometry.coordinates);
      onPolygonDrawn?.(JSON.stringify(geojson), centroidWkt);
    }

    function onDrawEdited() {
      const layers = drawnItems.getLayers();
      if (layers.length === 0) return;
      const geojson = layers[0].toGeoJSON();
      const centroidWkt = computeCentroidWkt(geojson.geometry.coordinates);
      onPolygonDrawn?.(JSON.stringify(geojson), centroidWkt);
    }

    map.on(L.Draw.Event.CREATED, onDrawCreated);
    map.on(L.Draw.Event.EDITED, onDrawEdited);

    return () => {
      map.removeControl(drawControl);
      map.off(L.Draw.Event.CREATED, onDrawCreated);
      map.off(L.Draw.Event.EDITED, onDrawEdited);
      drawnItems.clearLayers();
    };
  }, [drawEnabled, onPolygonDrawn]);

  const hasGeometry = items.some(
    (item) => normalizeToFeatureOrCollection(parseGeoJsonValue(item.polygon_geojson))
  );

  return (
    <section className="card map-card">
      <h3 style={{ marginTop: 0, marginBottom: '0.65rem', fontSize: '0.95rem', fontWeight: 700 }}>
        Karta vodnih objekata
        {drawEnabled && (
          <span style={{ marginLeft: '0.75rem', fontSize: '0.8rem', fontWeight: 400, color: 'var(--color-primary)' }}>
            — koristite alat olovke za crtanje poligona
          </span>
        )}
      </h3>
      <div ref={mapContainerRef} className="water-objects-map" role="img" aria-label="Karta vodnih objekata" />
      {!hasGeometry && !drawEnabled && (
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          Nema geometrije za prikaz.
        </p>
      )}
    </section>
  );
}
