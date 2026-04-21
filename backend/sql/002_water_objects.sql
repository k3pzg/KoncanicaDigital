CREATE TABLE IF NOT EXISTS water_objects (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  object_type ENUM('ribnjak', 'bazen', 'kanal', 'zimovnik', 'rastiliste', 'maticnjak') NOT NULL,
  area_total_m2 DECIMAL(14,2) NULL,
  area_productive_m2 DECIMAL(14,2) NULL,
  max_depth_m DECIMAL(10,2) NULL,
  max_volume_m3 DECIMAL(14,2) NULL,
  centroid_wkt TEXT NULL,
  polygon_geojson JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_water_objects_code (code)
);
