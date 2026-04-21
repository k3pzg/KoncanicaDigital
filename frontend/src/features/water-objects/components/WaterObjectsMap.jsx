import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

  if (typeof value === 'object') {
    return value;
  }

  return null;
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

export function WaterObjectsMap({ items, selectedObjectId }) {
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(mapContainerRef.current, {
      center: [45.1, 15.2],
      zoom: 7
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const layers = [];

    items.forEach((item) => {
      const parsed = parseGeoJsonValue(item.polygon_geojson);
      const featureGeoJson = normalizeToFeatureOrCollection(parsed);

      if (!featureGeoJson) {
        return;
      }

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

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }

    return () => {
      layers.forEach(({ layer }) => {
        map.removeLayer(layer);
      });
    };
  }, [items, selectedObjectId]);

  return (
    <section className="card map-card">
      <h3>Karta (GeoJSON poligoni)</h3>
      <div ref={mapContainerRef} className="water-objects-map" role="img" aria-label="Karta vodnih objekata" />
      {!items.some((item) => normalizeToFeatureOrCollection(parseGeoJsonValue(item.polygon_geojson))) ? (
        <p>Nema geometrije za prikaz.</p>
      ) : null}
    </section>
  );
}
