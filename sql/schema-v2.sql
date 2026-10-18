-- Public reference schema for the two v2 audit tables.
-- On an existing database, inspect current schema and make a verified backup first.
-- No legacy table is altered.
-- Explicit UTC values supplied by writer; do not rely on session-local defaults.
-- If tables already exist, compare SHOW CREATE TABLE; do not assume compatibility.

CREATE TABLE snap_heating_decisions (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
 event_key VARCHAR(96) CHARACTER SET ascii NOT NULL,
 ts DATETIME(3) NOT NULL COMMENT 'Decision time UTC',
 recorded_at DATETIME(3) NOT NULL COMMENT 'UTC_TIMESTAMP(3) at INSERT',
 season_key VARCHAR(32) NOT NULL,
 building_state VARCHAR(64) NOT NULL,
 control_mode VARCHAR(16) NOT NULL,
 control_enabled TINYINT(1) NULL,
 floor_mode VARCHAR(16) NULL,
 strategy_mode VARCHAR(32) NULL,
 floor_allowed TINYINT(1) NULL,
 outdoor_temp DECIMAL(6,2) NULL,
 forecast_high DECIMAL(6,2) NULL,
 boiler_want TINYINT(1) NULL,
 boiler_on TINYINT(1) NULL,
 pump_want TINYINT(1) NULL,
 pump_on TINYINT(1) NULL,
 manual_override TINYINT(1) NULL,
 decision_json JSON NOT NULL,
 PRIMARY KEY(id),
 UNIQUE KEY uq_heating_decision_event(event_key),
 KEY idx_heating_decision_ts(ts),
 KEY idx_heating_decision_season(season_key,ts)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE snap_collection_cycles (
 cycle_id VARCHAR(96) CHARACTER SET ascii NOT NULL,
 sample_ts DATETIME(3) NOT NULL COMMENT 'Collection time UTC, not sensor measurement time',
 attempted_at DATETIME(3) NOT NULL COMMENT 'UTC',
 completed_at DATETIME(3) NULL COMMENT 'UTC; last terminal outcome',
 status VARCHAR(16) NOT NULL COMMENT 'pending/success/partial/failed/unknown',
 expected_tables SMALLINT UNSIGNED NOT NULL,
 succeeded_tables SMALLINT UNSIGNED NOT NULL DEFAULT 0,
 details_json JSON NOT NULL COMMENT 'Per-table expected/affected rows; source received times; errors',
 PRIMARY KEY(cycle_id),
 KEY idx_collection_sample_ts(sample_ts),
 KEY idx_collection_status(status,attempted_at)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- decision writer: INSERT ... VALUES (?, ?, UTC_TIMESTAMP(3), ...).
-- season_key='2026-2027'; building_state='post_insulation_2026'.
-- Store detailed state once in decision_json; do not duplicate a zone table yet.
-- Do not add automatic retention or rewrite older seasons.
-- A DB outage must also be recorded locally: this audit table is not sufficient.
