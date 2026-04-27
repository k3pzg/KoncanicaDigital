CREATE TABLE IF NOT EXISTS fish_species (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  label VARCHAR(128) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fish_species_code (code)
);

CREATE TABLE IF NOT EXISTS fish_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  label VARCHAR(128) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fish_categories_code (code)
);

CREATE TABLE IF NOT EXISTS fish_entry_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  water_object_id BIGINT UNSIGNED NOT NULL,
  event_date DATE NOT NULL,
  event_type ENUM('nasad', 'dodatni_nasad', 'premjestaj_ulaz') NOT NULL,
  species_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  count_total DECIMAL(14,2) NOT NULL,
  weight_avg_kg DECIMAL(14,4) NULL,
  weight_total_kg DECIMAL(14,4) NOT NULL,
  source_kind ENUM('interni_objekt', 'mrijestiliste', 'uvoz', 'ostalo') NOT NULL,
  source_water_object_id BIGINT UNSIGNED NULL,
  source_label VARCHAR(255) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_fish_entry_events_water_object_id (water_object_id),
  KEY idx_fish_entry_events_species_id (species_id),
  KEY idx_fish_entry_events_category_id (category_id),
  KEY idx_fish_entry_events_source_water_object_id (source_water_object_id),
  CONSTRAINT fk_fish_entry_events_water_object FOREIGN KEY (water_object_id) REFERENCES water_objects(id),
  CONSTRAINT fk_fish_entry_events_species FOREIGN KEY (species_id) REFERENCES fish_species(id),
  CONSTRAINT fk_fish_entry_events_category FOREIGN KEY (category_id) REFERENCES fish_categories(id),
  CONSTRAINT fk_fish_entry_events_source_water_object FOREIGN KEY (source_water_object_id) REFERENCES water_objects(id)
);

CREATE TABLE IF NOT EXISTS fish_control_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  water_object_id BIGINT UNSIGNED NOT NULL,
  control_date DATE NOT NULL,
  sample_area_m2 DECIMAL(14,2) NULL,
  estimated_total_area_m2 DECIMAL(14,2) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_fish_control_events_water_object_id (water_object_id),
  CONSTRAINT fk_fish_control_events_water_object FOREIGN KEY (water_object_id) REFERENCES water_objects(id)
);

CREATE TABLE IF NOT EXISTS fish_control_lines (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  fish_control_event_id BIGINT UNSIGNED NOT NULL,
  species_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  sample_count DECIMAL(14,2) NOT NULL,
  sample_weight_total_kg DECIMAL(14,4) NULL,
  sample_weight_avg_kg DECIMAL(14,4) NOT NULL,
  estimated_count_total DECIMAL(14,2) NOT NULL,
  estimated_weight_total_kg DECIMAL(14,4) NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_fish_control_lines_event_id (fish_control_event_id),
  KEY idx_fish_control_lines_species_id (species_id),
  KEY idx_fish_control_lines_category_id (category_id),
  CONSTRAINT fk_fish_control_lines_event FOREIGN KEY (fish_control_event_id) REFERENCES fish_control_events(id) ON DELETE CASCADE,
  CONSTRAINT fk_fish_control_lines_species FOREIGN KEY (species_id) REFERENCES fish_species(id),
  CONSTRAINT fk_fish_control_lines_category FOREIGN KEY (category_id) REFERENCES fish_categories(id)
);

CREATE TABLE IF NOT EXISTS fish_exit_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  water_object_id BIGINT UNSIGNED NOT NULL,
  event_date DATE NOT NULL,
  event_type ENUM('izlov', 'premjestaj_izlaz') NOT NULL DEFAULT 'izlov',
  species_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  count_total DECIMAL(14,2) NOT NULL,
  weight_avg_kg DECIMAL(14,4) NULL,
  weight_total_kg DECIMAL(14,4) NOT NULL,
  destination_kind ENUM('interni_objekt', 'trziste', 'otpis', 'ostalo') NOT NULL DEFAULT 'ostalo',
  destination_water_object_id BIGINT UNSIGNED NULL,
  destination_label VARCHAR(255) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_fish_exit_events_water_object_id (water_object_id),
  KEY idx_fish_exit_events_species_id (species_id),
  KEY idx_fish_exit_events_category_id (category_id),
  KEY idx_fish_exit_events_destination_water_object_id (destination_water_object_id),
  CONSTRAINT fk_fish_exit_events_water_object FOREIGN KEY (water_object_id) REFERENCES water_objects(id),
  CONSTRAINT fk_fish_exit_events_species FOREIGN KEY (species_id) REFERENCES fish_species(id),
  CONSTRAINT fk_fish_exit_events_category FOREIGN KEY (category_id) REFERENCES fish_categories(id),
  CONSTRAINT fk_fish_exit_events_destination_water_object FOREIGN KEY (destination_water_object_id) REFERENCES water_objects(id)
);

CREATE TABLE IF NOT EXISTS fish_stock_current (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  water_object_id BIGINT UNSIGNED NOT NULL,
  species_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  count_total DECIMAL(14,2) NOT NULL,
  weight_avg_kg DECIMAL(14,4) NOT NULL,
  weight_total_kg DECIMAL(14,4) NOT NULL,
  last_refresh_type ENUM('entry', 'izlov', 'control', 'manual') NOT NULL,
  last_refresh_date DATE NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fish_stock_current_water_object_species_category (water_object_id, species_id, category_id),
  KEY idx_fish_stock_current_species_id (species_id),
  KEY idx_fish_stock_current_category_id (category_id),
  CONSTRAINT fk_fish_stock_current_water_object FOREIGN KEY (water_object_id) REFERENCES water_objects(id),
  CONSTRAINT fk_fish_stock_current_species FOREIGN KEY (species_id) REFERENCES fish_species(id),
  CONSTRAINT fk_fish_stock_current_category FOREIGN KEY (category_id) REFERENCES fish_categories(id)
);
