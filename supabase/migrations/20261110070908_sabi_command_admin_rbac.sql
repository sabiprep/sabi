BEGIN;

-- SABI COMMAND delegated administration foundation.
-- No existing profile is elevated and no existing role is rewritten.
CREATE TABLE IF NOT EXISTS public.admin_permission_catalogue (
  permission_key TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  module_key TEXT NOT NULL,
  risk_tier TEXT NOT NULL CHECK (risk_tier IN ('low','medium','high','critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_role_permission_grants (
  role_key TEXT NOT NULL CHECK (role_key IN ('SUPPORT','ANALYST','CONTENT_MANAGER','ADMIN','MASTER_ADMIN')),
  permission_key TEXT NOT NULL REFERENCES public.admin_permission_catalogue(permission_key) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_key, permission_key)
);

CREATE TABLE IF NOT EXISTS public.admin_user_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_key TEXT NOT NULL CHECK (role_key IN ('SUPPORT','ANALYST','CONTENT_MANAGER','ADMIN')),
  scope_type TEXT NOT NULL DEFAULT 'platform' CHECK (scope_type IN ('platform','institution','resource')),
  scope_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','revoked')),
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (length(trim(reason)) >= 8),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((scope_type = 'platform' AND scope_id IS NULL) OR (scope_type <> 'platform' AND scope_id IS NOT NULL)),
  CHECK (expires_at IS NULL OR expires_at > starts_at)
);
CREATE INDEX IF NOT EXISTS admin_user_role_assignments_user_status_idx
  ON public.admin_user_role_assignments(user_id, status, starts_at, expires_at);
CREATE INDEX IF NOT EXISTS admin_user_role_assignments_scope_idx
  ON public.admin_user_role_assignments(scope_type, scope_id, status);

ALTER TABLE public.admin_permission_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_permission_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_role_assignments ENABLE ROW LEVEL SECURITY;

-- All access is through authenticated server routes using the service role.
REVOKE ALL ON public.admin_permission_catalogue FROM anon, authenticated;
REVOKE ALL ON public.admin_role_permission_grants FROM anon, authenticated;
REVOKE ALL ON public.admin_user_role_assignments FROM anon, authenticated;

INSERT INTO public.admin_permission_catalogue(permission_key, description, module_key, risk_tier) VALUES
('command.overview.read','View operational overview and platform status','overview','low'),
('learners.read','View learner support records','students','medium'),
('learners.support_action','Perform approved learner support actions','students','high'),
('content.read','View question bank and source records','content','low'),
('content.create','Create and edit question drafts','content','medium'),
('content.review','Review and verify question content','content','medium'),
('content.publish','Publish approved question content','content','high'),
('syllabus.read','View syllabus and exam configuration','academics','low'),
('syllabus.manage','Manage syllabus and exam configuration','academics','high'),
('ai.read','View AI provider readiness and usage','ai','low'),
('ai.configure','Configure AI providers and routing','ai','high'),
('ai.activate','Activate AI provider routing','ai','critical'),
('ai.budget.manage','Change AI spending limits','ai','critical'),
('ai_agent.observe','Run read-only AI operations investigations','agent','low'),
('ai_agent.prepare','Prepare non-production patches and tests','agent','medium'),
('ai_agent.approve','Approve prepared operational changes','agent','critical'),
('ai_agent.execute','Execute an approved operational change','agent','critical'),
('billing.read','View commercial and payment records','revenue','medium'),
('billing.manage','Manage subscription plans and billing settings','revenue','high'),
('billing.refund','Issue or approve payment refunds','revenue','critical'),
('credits.read','View credit and entitlement ledgers','credits','medium'),
('credits.grant','Grant or adjust learner credits','credits','high'),
('institutions.read','View school and parent operations','institutions','medium'),
('institutions.manage','Manage institutions and memberships','institutions','high'),
('communications.read','View notification and campaign activity','communications','low'),
('communications.manage','Manage templates and audiences','communications','medium'),
('communications.send','Dispatch communications','communications','high'),
('configuration.read','View managed configuration','configuration','low'),
('configuration.propose','Propose configuration changes','configuration','medium'),
('configuration.approve','Approve configuration changes','configuration','critical'),
('configuration.rollback','Rollback a configuration version','configuration','critical'),
('platform.health.read','View platform health and incidents','platform','low'),
('platform.incident.manage','Manage platform incidents','platform','high'),
('security.audit.read','View security and audit information','security','high'),
('security.access.manage','Manage delegated admin access','security','critical'),
('reports.read','View operational reports','reports','low'),
('reports.export','Export operational reports','reports','medium'),
('integrations.read','View integration readiness','integrations','low'),
('integrations.manage','Manage integration settings','integrations','critical'),
('release.prepare','Prepare release plans','releases','medium'),
('release.approve','Approve release plans','releases','critical'),
('release.execute','Execute approved releases','releases','critical')
ON CONFLICT (permission_key) DO NOTHING;

-- Conservative defaults: delegated roles receive read-only/module-scoped capabilities.
-- Higher-risk actions remain unavailable until an explicit policy change is reviewed.
INSERT INTO public.admin_role_permission_grants(role_key, permission_key)
SELECT 'MASTER_ADMIN', permission_key FROM public.admin_permission_catalogue
ON CONFLICT DO NOTHING;

INSERT INTO public.admin_role_permission_grants(role_key, permission_key) VALUES
('SUPPORT','command.overview.read'),('SUPPORT','learners.read'),('SUPPORT','communications.read'),
('ANALYST','command.overview.read'),('ANALYST','reports.read'),('ANALYST','ai.read'),('ANALYST','platform.health.read'),
('CONTENT_MANAGER','command.overview.read'),('CONTENT_MANAGER','content.read'),('CONTENT_MANAGER','content.create'),('CONTENT_MANAGER','content.review'),('CONTENT_MANAGER','syllabus.read'),
('ADMIN','command.overview.read'),('ADMIN','learners.read'),('ADMIN','content.read'),('ADMIN','content.create'),('ADMIN','content.review'),('ADMIN','syllabus.read'),('ADMIN','ai.read'),('ADMIN','billing.read'),('ADMIN','credits.read'),('ADMIN','institutions.read'),('ADMIN','communications.read'),('ADMIN','configuration.read'),('ADMIN','platform.health.read'),('ADMIN','reports.read'),('ADMIN','integrations.read')
ON CONFLICT DO NOTHING;

COMMIT;
