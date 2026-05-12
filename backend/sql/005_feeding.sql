CREATE TABLE IF NOT EXISTS feed_types (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  is_active  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_feed_types_name (name)
);

CREATE TABLE IF NOT EXISTS feed_receipts (
  id           INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  feed_type_id INT UNSIGNED  NOT NULL,
  quantity_kg  DECIMAL(10,3) NOT NULL,
  supplier     VARCHAR(200)  NULL,
  receipt_date DATE          NOT NULL,
  note         TEXT          NULL,
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_feed_receipts_type FOREIGN KEY (feed_type_id) REFERENCES feed_types(id)
);

CREATE TABLE IF NOT EXISTS feeding_events (
  id              INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  feed_type_id    INT UNSIGNED  NOT NULL,
  water_object_id BIGINT UNSIGNED  NOT NULL,
  quantity_kg     DECIMAL(10,3) NOT NULL,
  event_date      DATE          NOT NULL,
  note            TEXT          NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_feeding_events_type FOREIGN KEY (feed_type_id)    REFERENCES feed_types(id),
  CONSTRAINT fk_feeding_events_wo   FOREIGN KEY (water_object_id) REFERENCES water_objects(id)
);

CREATE TABLE IF NOT EXISTS feed_stock_current (
  id              INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  feed_type_id    INT UNSIGNED  NOT NULL,
  quantity_kg     DECIMAL(10,3) NOT NULL DEFAULT 0,
  last_updated_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_feed_stock_type (feed_type_id),
  CONSTRAINT fk_feed_stock_type FOREIGN KEY (feed_type_id) REFERENCES feed_types(id)
);
