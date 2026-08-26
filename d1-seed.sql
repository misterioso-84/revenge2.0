-- Cloudflare D1 SQL Migration Seed for Database: revenge
-- Generated on 2026-08-26T18:50:56.002Z

CREATE TABLE IF NOT EXISTS d1_app_state (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO d1_app_state (key, value, updated_at)
VALUES (global, , CURRENT_TIMESTAMP);

-- Table: profiles
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO profiles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO profiles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO profiles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO profiles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO profiles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO profiles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO profiles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO profiles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO profiles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO profiles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO profiles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO profiles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: user_roles
CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO user_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO user_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO user_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO user_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO user_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO user_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO user_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO user_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO user_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO user_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO user_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO user_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO user_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO user_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: custom_roles
CREATE TABLE IF NOT EXISTS custom_roles (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: user_custom_roles
CREATE TABLE IF NOT EXISTS user_custom_roles (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO user_custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO user_custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO user_custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO user_custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO user_custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO user_custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO user_custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO user_custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO user_custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO user_custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO user_custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO user_custom_roles (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: citizens
CREATE TABLE IF NOT EXISTS citizens (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO citizens (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO citizens (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO citizens (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO citizens (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO citizens (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO citizens (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO citizens (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO citizens (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO citizens (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO citizens (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO citizens (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO citizens (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO citizens (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO citizens (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO citizens (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO citizens (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO citizens (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO citizens (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO citizens (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO citizens (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO citizens (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO citizens (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO citizens (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO citizens (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO citizens (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO citizens (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO citizens (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO citizens (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO citizens (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: safe_boxes
CREATE TABLE IF NOT EXISTS safe_boxes (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO safe_boxes (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO safe_boxes (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO safe_boxes (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO safe_boxes (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO safe_boxes (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO safe_boxes (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO safe_boxes (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO safe_boxes (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO safe_boxes (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO safe_boxes (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: badge_weeks
CREATE TABLE IF NOT EXISTS badge_weeks (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO badge_weeks (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_weeks (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_weeks (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_weeks (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_weeks (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_weeks (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_weeks (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: badge_sessions
CREATE TABLE IF NOT EXISTS badge_sessions (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO badge_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: nights
CREATE TABLE IF NOT EXISTS nights (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO nights (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO nights (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO nights (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO nights (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO nights (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO nights (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO nights (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO nights (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO nights (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO nights (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO nights (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO nights (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO nights (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO nights (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO nights (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO nights (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO nights (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO nights (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO nights (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO nights (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO nights (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO nights (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO nights (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO nights (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO nights (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO nights (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO nights (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO nights (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: conversion_settings
CREATE TABLE IF NOT EXISTS conversion_settings (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO conversion_settings (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: conversions
CREATE TABLE IF NOT EXISTS conversions (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO conversions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO conversions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO conversions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO conversions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO conversions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO conversions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO conversions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO conversions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO conversions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO conversions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO conversions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO conversions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO conversions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO conversions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO conversions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO conversions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO conversions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO conversions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO conversions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO conversions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO conversions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO conversions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO conversions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO conversions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO conversions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO conversions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO conversions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO conversions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO conversions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: stables
CREATE TABLE IF NOT EXISTS stables (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO stables (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: horses
CREATE TABLE IF NOT EXISTS horses (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO horses (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO horses (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: services
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO services (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO services (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: service_categories
CREATE TABLE IF NOT EXISTS service_categories (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO service_categories (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO service_categories (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: sanctions
CREATE TABLE IF NOT EXISTS sanctions (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO sanctions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO sanctions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO sanctions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO sanctions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO sanctions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO sanctions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO sanctions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO sanctions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO sanctions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: leave_requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO leave_requests (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: night_items
CREATE TABLE IF NOT EXISTS night_items (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO night_items (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO night_items (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO night_items (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO night_items (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO audit_logs (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: eventi_tickets
CREATE TABLE IF NOT EXISTS eventi_tickets (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO eventi_tickets (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO eventi_tickets (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO eventi_tickets (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: eventi_qualificazioni
CREATE TABLE IF NOT EXISTS eventi_qualificazioni (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO eventi_qualificazioni (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO eventi_qualificazioni (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO eventi_qualificazioni (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO eventi_qualificazioni (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO eventi_qualificazioni (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: eventi_scommesse
CREATE TABLE IF NOT EXISTS eventi_scommesse (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO eventi_scommesse (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO eventi_scommesse (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: eventi_finalisti
CREATE TABLE IF NOT EXISTS eventi_finalisti (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO eventi_finalisti (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO eventi_finalisti (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO eventi_finalisti (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: applications
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO applications (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: user_sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO user_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO user_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO user_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO user_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO user_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO user_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO user_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO user_sessions (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: telegram_groups
CREATE TABLE IF NOT EXISTS telegram_groups (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO telegram_groups (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_groups (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_groups (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_groups (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_groups (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: telegram_group_members
CREATE TABLE IF NOT EXISTS telegram_group_members (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO telegram_group_members (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_group_members (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_group_members (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_group_members (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_group_members (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_group_members (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_group_members (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_group_members (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_group_members (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_group_members (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_group_members (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_group_members (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_group_members (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_group_members (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_group_members (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_group_members (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_group_members (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_group_members (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_group_members (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_group_members (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_group_members (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_group_members (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_group_members (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_group_members (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_group_members (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_group_members (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_group_members (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_group_members (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_group_members (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO telegram_group_members (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: telegram_chat_messages
CREATE TABLE IF NOT EXISTS telegram_chat_messages (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO telegram_chat_messages (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: membership_plans
CREATE TABLE IF NOT EXISTS membership_plans (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO membership_plans (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO membership_plans (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO membership_plans (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO membership_plans (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: maintenance_settings
CREATE TABLE IF NOT EXISTS maintenance_settings (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO maintenance_settings (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: master_settings
CREATE TABLE IF NOT EXISTS master_settings (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO master_settings (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: board_categories
CREATE TABLE IF NOT EXISTS board_categories (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO board_categories (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO board_categories (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO board_categories (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO board_categories (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO board_categories (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: board_subcategories
CREATE TABLE IF NOT EXISTS board_subcategories (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO board_subcategories (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO board_subcategories (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO board_subcategories (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO board_subcategories (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO board_subcategories (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO board_subcategories (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO board_subcategories (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO board_subcategories (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO board_subcategories (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO board_subcategories (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

-- Table: board_items
CREATE TABLE IF NOT EXISTS board_items (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO board_items (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO board_items (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO board_items (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO board_items (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO board_items (id, data, updated_at) VALUES (, , CURRENT_TIMESTAMP);

