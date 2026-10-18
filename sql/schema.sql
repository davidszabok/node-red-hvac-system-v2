-- MySQL 8 / MariaDB compatible baseline schema for the archived flows.
-- Review data types and retention requirements before production use.

CREATE TABLE IF NOT EXISTS snap_weather (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ts DATETIME NOT NULL,
  temp DECIMAL(5,2) NULL,
  humidity DECIMAL(5,2) NULL,
  wind DECIMAL(6,2) NULL,
  gust DECIMAL(6,2) NULL,
  wx_code INT NULL,
  temp_min DECIMAL(5,2) NULL,
  temp_max DECIMAL(5,2) NULL,
  sunrise TIME NULL,
  sunset TIME NULL,
  PRIMARY KEY (id),
  KEY idx_snap_weather_ts (ts)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS snap_sensors_th (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ts DATETIME NOT NULL,
  room VARCHAR(64) NOT NULL,
  temp DECIMAL(5,2) NULL,
  humidity DECIMAL(5,2) NULL,
  battery DECIMAL(5,2) NULL,
  online TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_snap_sensors_th_ts (ts),
  KEY idx_snap_sensors_th_room_ts (room, ts)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS snap_ac (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ts DATETIME NOT NULL,
  power TINYINT(1) NOT NULL DEFAULT 0,
  room_temp DECIMAL(5,2) NULL,
  set_temp DECIMAL(5,2) NULL,
  mode_code VARCHAR(32) NULL,
  offline TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_snap_ac_ts (ts)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS snap_heating (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ts DATETIME NOT NULL,
  relay_name VARCHAR(128) NOT NULL,
  state TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_snap_heating_ts (ts),
  KEY idx_snap_heating_relay_ts (relay_name, ts)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS snap_shutters (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ts DATETIME NOT NULL,
  room VARCHAR(64) NOT NULL,
  label VARCHAR(128) NOT NULL,
  position_pct DECIMAL(5,2) NULL,
  motor VARCHAR(32) NULL,
  PRIMARY KEY (id),
  KEY idx_snap_shutters_ts (ts),
  KEY idx_snap_shutters_room_ts (room, ts)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS live_snapshot (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ts DATETIME(3) NOT NULL,
  payload JSON NOT NULL,
  PRIMARY KEY (id),
  KEY idx_live_snapshot_ts (ts)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
