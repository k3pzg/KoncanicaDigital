CREATE TABLE IF NOT EXISTS water_level_measurements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  water_object_id BIGINT UNSIGNED NOT NULL,
  measurement_date DATE NULL,
  area_ha DECIMAL(10,2) NULL,
  water_level_full_cm INT NULL,
  water_level_current_cm INT NULL,
  water_level_missing_cm INT NULL,
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_water_level_measurements_water_object_id (water_object_id),
  KEY idx_water_level_measurements_latest (water_object_id, measurement_date, id),
  CONSTRAINT fk_water_level_measurements_water_object FOREIGN KEY (water_object_id) REFERENCES water_objects(id)
);
