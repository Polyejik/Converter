-- 0002_portfolio.sql
-- Домeнная схема Портфеля для MVP (Cloudflare D1 / SQLite).
-- Расширяет таблицы, созданные в 0001_ai.sql (tenants, users, projects, project_members, audit).
-- Принципы: всё в границах арендатора (tenant_id), оптимистичные версии, аудит изменений.

-- ── дивизионы ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS divisions (
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  code      TEXT NOT NULL,                 -- international | americas | advisory
  name      TEXT NOT NULL,
  PRIMARY KEY (tenant_id, code)
);

-- ── сотрудники: профиль поверх users ─────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_profiles (
  tenant_id   TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  discipline  TEXT,                        -- engineer | geologist | petrophysicist | geophysicist | economist | analyst
  division    TEXT,
  office      TEXT,
  country     TEXT,
  capacity_pct INTEGER NOT NULL DEFAULT 100 CHECK(capacity_pct BETWEEN 0 AND 100),
  hourly_rate_usd REAL NOT NULL DEFAULT 0 CHECK(hourly_rate_usd >= 0),
  joined_on   TEXT,
  PRIMARY KEY (tenant_id, user_id),
  FOREIGN KEY (tenant_id, user_id) REFERENCES users(tenant_id, id)
);

-- ── расширение проектов доменными полями ─────────────────────────────
ALTER TABLE projects ADD COLUMN division TEXT;
ALTER TABLE projects ADD COLUMN country TEXT;
ALTER TABLE projects ADD COLUMN discipline TEXT;
ALTER TABLE projects ADD COLUMN coordinator_id TEXT;
ALTER TABLE projects ADD COLUMN contract_amount_usd REAL NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN stages_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE projects ADD COLUMN archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0,1));
ALTER TABLE projects ADD COLUMN archive_outcome TEXT;
ALTER TABLE projects ADD COLUMN archive_reason TEXT;
ALTER TABLE projects ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE projects ADD COLUMN updated_at TEXT;

CREATE INDEX IF NOT EXISTS projects_division ON projects(tenant_id, division, archived);
CREATE UNIQUE INDEX IF NOT EXISTS projects_code ON projects(tenant_id, code);

-- ── счета и поступления ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id          TEXT NOT NULL, tenant_id TEXT NOT NULL, project_id TEXT NOT NULL,
  invoice_no  TEXT NOT NULL, amount_usd REAL NOT NULL CHECK(amount_usd > 0),
  invoice_date TEXT NOT NULL, due_date TEXT NOT NULL,
  stage_code  TEXT, status TEXT NOT NULL DEFAULT 'issued' CHECK(status IN ('draft','issued','paid','void')),
  version     INTEGER NOT NULL DEFAULT 1, updated_at TEXT,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, invoice_no),
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS receipts (
  id         TEXT NOT NULL, tenant_id TEXT NOT NULL, invoice_id TEXT NOT NULL,
  amount_usd REAL NOT NULL CHECK(amount_usd > 0),
  kind       TEXT NOT NULL CHECK(kind IN ('receipt','refund')),
  paid_on    TEXT NOT NULL, note TEXT,
  version    INTEGER NOT NULL DEFAULT 1, updated_at TEXT,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, invoice_id) REFERENCES invoices(tenant_id, id)
);

CREATE INDEX IF NOT EXISTS invoices_project ON invoices(tenant_id, project_id);

-- ── трудозатраты ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS time_entries (
  id        TEXT NOT NULL, tenant_id TEXT NOT NULL, user_id TEXT NOT NULL, project_id TEXT,
  week_start TEXT NOT NULL,                -- всегда понедельник
  activity  TEXT NOT NULL CHECK(activity IN
            ('administration','coordination','technical','report_processing','client_meetings','economic','pto','vacation')),
  hours     REAL NOT NULL CHECK(hours >= 0 AND hours <= 168),
  note      TEXT NOT NULL DEFAULT '',
  status    TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','approved','returned')),
  rate_snapshot_usd REAL, review_reason TEXT, reviewed_by TEXT,
  version   INTEGER NOT NULL DEFAULT 1, updated_at TEXT,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, user_id) REFERENCES users(tenant_id, id),
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, id),
  CHECK (activity NOT IN ('pto','vacation') OR project_id IS NULL)
);

CREATE INDEX IF NOT EXISTS time_user_week ON time_entries(tenant_id, user_id, week_start);
CREATE INDEX IF NOT EXISTS time_project ON time_entries(tenant_id, project_id, week_start);

-- ── версионная защита и аудит (как в серверной модели) ───────────────
-- Клиент обязан прислать ожидаемую версию в WHERE (оптимистичная блокировка).
-- Версия может вырасти ровно на единицу: это и есть проверка на гонку.
CREATE TRIGGER IF NOT EXISTS projects_version_guard
BEFORE UPDATE ON projects FOR EACH ROW
WHEN NEW.version <> OLD.version + 1
BEGIN SELECT RAISE(ABORT, 'invalid_version'); END;

CREATE TRIGGER IF NOT EXISTS projects_audit
AFTER UPDATE ON projects FOR EACH ROW
BEGIN
  INSERT INTO audit(id, tenant_id, actor_id, entity_id, action, at, metadata_json)
  VALUES (lower(hex(randomblob(16))), NEW.tenant_id, '', NEW.id, 'update', datetime('now'),
          json_object('version', OLD.version + 1));
END;
