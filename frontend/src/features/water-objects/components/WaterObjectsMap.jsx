function extractPolygonCoordinates(feature) {
  if (!feature || feature.type !== 'Polygon') {
    return [];
  }

  return feature.coordinates?.[0] ?? [];
}

function parsePolygon(geojsonText) {
  if (!geojsonText) {
    return [];
  }

  try {
    const feature = JSON.parse(geojsonText);
    return extractPolygonCoordinates(feature);
  } catch {
    return [];
  }
}

function getBounds(polygons) {
  const points = polygons.flat();
  if (!points.length) {
    return null;
  }

  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys)
  };
}

function toSvgPoints(points, bounds, width, height) {
  const xRange = bounds.maxX - bounds.minX || 1;
  const yRange = bounds.maxY - bounds.minY || 1;

  return points
    .map(([x, y]) => {
      const px = ((x - bounds.minX) / xRange) * (width - 20) + 10;
      const py = height - (((y - bounds.minY) / yRange) * (height - 20) + 10);
      return `${px},${py}`;
    })
    .join(' ');
}

export function WaterObjectsMap({ items }) {
  const width = 520;
  const height = 320;
  const polygons = items.map((item) => parsePolygon(item.polygon_geojson)).filter((coords) => coords.length > 2);
  const bounds = getBounds(polygons);

  return (
    <section className="card map-card">
      <h3>Karta (polygon_geojson)</h3>
      {!polygons.length ? (
        <p>Nema geometrije za prikaz.</p>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="map-svg" role="img" aria-label="Water objects map preview">
          <rect x="0" y="0" width={width} height={height} fill="#f8fafc" stroke="#cbd5e1" />
          {polygons.map((polygon, index) => (
            <polygon
              key={index}
              points={toSvgPoints(polygon, bounds, width, height)}
              fill="rgba(30, 64, 175, 0.25)"
              stroke="#1e40af"
              strokeWidth="1.5"
            />
          ))}
        </svg>
      )}
    </section>
  );
}
