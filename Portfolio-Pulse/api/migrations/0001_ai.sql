PRAGMA foreign_keys = ON;
CREATE TABLE tenants (id TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE users (
  id TEXT NOT NULL, tenant_id TEXT NOT NULL REFERENCES tenants(id), email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('ceo','division','coordinator','specialist','accountant','contracts')),
  access_subject TEXT, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), PRIMARY KEY(tenant_id,id)
);
CREATE TABLE projects (
  id TEXT NOT NULL, tenant_id TEXT NOT NULL REFERENCES tenants(id), code TEXT NOT NULL,
  client TEXT NOT NULL, name TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY(tenant_id,id), UNIQUE(tenant_id,code)
);
CREATE TABLE project_members (
  tenant_id TEXT NOT NULL, project_id TEXT NOT NULL, user_id TEXT NOT NULL,
  PRIMARY KEY(tenant_id,project_id,user_id),
  FOREIGN KEY(tenant_id,project_id) REFERENCES projects(tenant_id,id),
  FOREIGN KEY(tenant_id,user_id) REFERENCES users(tenant_id,id)
);
CREATE TABLE inbox (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, owner_id TEXT NOT NULL, dedupe_key TEXT NOT NULL,
  sender TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, message_id TEXT NOT NULL,
  received_at TEXT NOT NULL, source TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'review',
  project_id TEXT, suggestion_json TEXT, version INTEGER NOT NULL DEFAULT 1,
  UNIQUE(tenant_id,dedupe_key),
  FOREIGN KEY(tenant_id,owner_id) REFERENCES users(tenant_id,id),
  FOREIGN KEY(tenant_id,project_id) REFERENCES projects(tenant_id,id)
);
CREATE INDEX inbox_owner ON inbox(tenant_id,owner_id,received_at);
CREATE TABLE audit (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, actor_id TEXT NOT NULL,
  entity_id TEXT NOT NULL, action TEXT NOT NULL, at TEXT NOT NULL, metadata_json TEXT NOT NULL
);
CREATE INDEX audit_tenant ON audit(tenant_id,at);
CREATE TABLE quotas (
  tenant_id TEXT NOT NULL, actor_id TEXT NOT NULL, day TEXT NOT NULL, used INTEGER NOT NULL,
  PRIMARY KEY(tenant_id,actor_id,day)
);
CREATE TABLE mailboxes (
  address TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, owner_id TEXT NOT NULL,
  FOREIGN KEY(tenant_id,owner_id) REFERENCES users(tenant_id,id)
);
CREATE TABLE sender_allowlist (
  tenant_id TEXT NOT NULL REFERENCES tenants(id), sender TEXT NOT NULL,
  PRIMARY KEY(tenant_id,sender)
);
