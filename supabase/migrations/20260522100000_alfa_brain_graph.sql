-- ============================================================================
-- ALFA Brain — Graph Memory OS v2.0
-- Migration: 20260522100000
-- System-level graph: nodes are ALFA components, not per-user data.
-- RLS: authenticated users READ-ONLY; writes via service_role.
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE node_type AS ENUM (
  'SYSTEM',      -- Cerber, Guardian, Brain, Router, FILTRY, Lasuch
  'CAPABILITY',  -- DLP, Risk Scoring, Hallucination Detection
  'ASSET',       -- Repos, Builds, Models, Documents
  'DECISION',    -- HOLD, BLOCK, APPROVE, ESCALATE
  'TASK'         -- Sprints, Builds, Fixes, Deployments
);

CREATE TYPE node_status AS ENUM (
  'ACTIVE',
  'PRODUCTION',
  'ARCHIVED',
  'DISABLED',
  'EXPERIMENTAL',
  'FAILED'
);

CREATE TYPE memory_layer AS ENUM (
  'HOT',   -- Active sessions (minutes-hours)
  'WARM',  -- Architecture, procedures (weeks-months)
  'COLD'   -- Archives, deprecated (months-years)
);

CREATE TYPE relation_type AS ENUM (
  'USES',         -- Component A uses B
  'PROTECTS',     -- Security layer protects resource
  'DEPENDS_ON',   -- Requires another component
  'GENERATED_BY', -- Created by system/process
  'VERIFIED_BY',  -- Validated by authority
  'BLOCKED_BY',   -- Prevented by gate/policy
  'RELATED_TO'    -- Generic association
);

-- ============================================================================
-- CORE TABLES
-- ============================================================================

CREATE TABLE public.nodes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type        node_type   NOT NULL,
  status      node_status NOT NULL DEFAULT 'ACTIVE',
  layer       memory_layer NOT NULL DEFAULT 'HOT',
  name        TEXT        NOT NULL,
  slug        TEXT        UNIQUE,
  data        JSONB       NOT NULL DEFAULT '{}',
  accessed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE public.relations (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id  UUID          NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,
  target_id  UUID          NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,
  type       relation_type NOT NULL,
  weight     NUMERIC       NOT NULL DEFAULT 1.0,
  data       JSONB         NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (source_id, target_id, type)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Layer / status / type queries
CREATE INDEX idx_nodes_layer   ON public.nodes(layer)   WHERE deleted_at IS NULL;
CREATE INDEX idx_nodes_status  ON public.nodes(status)  WHERE deleted_at IS NULL;
CREATE INDEX idx_nodes_type    ON public.nodes(type)    WHERE deleted_at IS NULL;
CREATE INDEX idx_nodes_slug    ON public.nodes(slug)    WHERE deleted_at IS NULL;
CREATE INDEX idx_nodes_data    ON public.nodes USING GIN(data) WHERE deleted_at IS NULL;

-- Hot memory access pattern
CREATE INDEX idx_nodes_hot_accessed ON public.nodes(accessed_at DESC)
  WHERE layer = 'HOT' AND deleted_at IS NULL;

-- Graph traversal (most critical)
CREATE INDEX idx_relations_source ON public.relations(source_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_relations_target ON public.relations(target_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_relations_type   ON public.relations(type)      WHERE deleted_at IS NULL;

-- ============================================================================
-- AUTO-UPDATE TRIGGERS
-- ============================================================================

-- Reuse update_updated_at() if already exists (defined in earlier migration),
-- otherwise create it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'update_updated_at'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION public.update_updated_at()
      RETURNS TRIGGER AS $t$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $t$ LANGUAGE plpgsql;
    $func$;
  END IF;
END;
$$;

CREATE TRIGGER nodes_updated_at
  BEFORE UPDATE ON public.nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER relations_updated_at
  BEFORE UPDATE ON public.relations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- GRAPH QUERY FUNCTIONS
-- ============================================================================

-- Get neighbors (outgoing + incoming, with direction)
CREATE OR REPLACE FUNCTION public.get_neighbors(p_node_id UUID)
RETURNS TABLE (
  neighbor_id    UUID,
  relation_id    UUID,
  rel_type       relation_type,
  direction      TEXT,
  weight         NUMERIC,
  neighbor_type  node_type,
  neighbor_name  TEXT
) LANGUAGE SQL STABLE AS $$
  SELECT
    r.target_id,
    r.id,
    r.type,
    'OUT'::TEXT,
    r.weight,
    n.type,
    n.name
  FROM public.relations r
  JOIN public.nodes n ON n.id = r.target_id
  WHERE r.source_id = p_node_id
    AND r.deleted_at IS NULL
    AND n.deleted_at IS NULL

  UNION ALL

  SELECT
    r.source_id,
    r.id,
    r.type,
    'IN'::TEXT,
    r.weight,
    n.type,
    n.name
  FROM public.relations r
  JOIN public.nodes n ON n.id = r.source_id
  WHERE r.target_id = p_node_id
    AND r.deleted_at IS NULL
    AND n.deleted_at IS NULL

  ORDER BY weight DESC, neighbor_name;
$$;

-- Get dependency tree (recursive, max_depth guard against cycles)
CREATE OR REPLACE FUNCTION public.get_dependency_tree(
  p_root_id  UUID,
  p_max_depth INTEGER DEFAULT 5
)
RETURNS TABLE (
  id    UUID,
  name  TEXT,
  type  node_type,
  depth INTEGER,
  path  TEXT[]
) LANGUAGE SQL STABLE AS $$
WITH RECURSIVE tree AS (
  SELECT
    n.id,
    n.name,
    n.type,
    0 AS depth,
    ARRAY[n.name] AS path
  FROM public.nodes n
  WHERE n.id = p_root_id
    AND n.deleted_at IS NULL

  UNION ALL

  SELECT
    n.id,
    n.name,
    n.type,
    t.depth + 1,
    t.path || n.name
  FROM public.nodes n
  JOIN public.relations r ON n.id = r.target_id
  JOIN tree t ON r.source_id = t.id
  WHERE t.depth < p_max_depth
    AND r.type = 'DEPENDS_ON'
    AND r.deleted_at IS NULL
    AND n.deleted_at IS NULL
    AND n.id <> ALL(t.path::UUID[])  -- cycle guard
)
SELECT * FROM tree ORDER BY depth, name;
$$;

-- Get lineage (what generated this node, recursively)
CREATE OR REPLACE FUNCTION public.get_lineage(p_node_id UUID)
RETURNS TABLE (
  id         UUID,
  name       TEXT,
  type       node_type,
  generation INTEGER
) LANGUAGE SQL STABLE AS $$
WITH RECURSIVE lineage AS (
  SELECT
    n.id,
    n.name,
    n.type,
    0 AS generation
  FROM public.nodes n
  WHERE n.id = p_node_id
    AND n.deleted_at IS NULL

  UNION ALL

  SELECT
    n.id,
    n.name,
    n.type,
    l.generation + 1
  FROM public.nodes n
  JOIN public.relations r ON n.id = r.target_id
  JOIN lineage l ON r.source_id = l.id
  WHERE r.type = 'GENERATED_BY'
    AND r.deleted_at IS NULL
    AND n.deleted_at IS NULL
    AND l.generation < 10
)
SELECT * FROM lineage ORDER BY generation;
$$;

-- Graph health stats
CREATE OR REPLACE FUNCTION public.graph_health()
RETURNS TABLE (metric TEXT, value BIGINT)
LANGUAGE SQL STABLE AS $$
  SELECT 'total_nodes'::TEXT,      COUNT(*)::BIGINT FROM public.nodes WHERE deleted_at IS NULL
  UNION ALL
  SELECT 'hot_nodes',              COUNT(*) FROM public.nodes WHERE layer = 'HOT'  AND deleted_at IS NULL
  UNION ALL
  SELECT 'warm_nodes',             COUNT(*) FROM public.nodes WHERE layer = 'WARM' AND deleted_at IS NULL
  UNION ALL
  SELECT 'cold_nodes',             COUNT(*) FROM public.nodes WHERE layer = 'COLD' AND deleted_at IS NULL
  UNION ALL
  SELECT 'total_relations',        COUNT(*) FROM public.relations WHERE deleted_at IS NULL
  UNION ALL
  SELECT 'system_nodes',           COUNT(*) FROM public.nodes WHERE type = 'SYSTEM'     AND deleted_at IS NULL
  UNION ALL
  SELECT 'production_nodes',       COUNT(*) FROM public.nodes WHERE status = 'PRODUCTION' AND deleted_at IS NULL
  UNION ALL
  SELECT 'active_tasks',           COUNT(*) FROM public.nodes WHERE type = 'TASK' AND status = 'ACTIVE' AND deleted_at IS NULL;
$$;

-- ============================================================================
-- LAYER MIGRATION FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.migrate_hot_to_warm()
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  n INTEGER;
BEGIN
  UPDATE public.nodes
  SET layer = 'WARM'
  WHERE layer = 'HOT'
    AND accessed_at < NOW() - INTERVAL '1 hour'
    AND type IN ('DECISION', 'TASK')
    AND deleted_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.migrate_warm_to_cold()
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  n INTEGER;
BEGIN
  UPDATE public.nodes
  SET layer = 'COLD'
  WHERE layer = 'WARM'
    AND accessed_at < NOW() - INTERVAL '90 days'
    AND status != 'PRODUCTION'
    AND deleted_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.nodes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relations ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read the full graph
CREATE POLICY "nodes_read_authenticated"
  ON public.nodes FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "relations_read_authenticated"
  ON public.relations FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- Writes are service_role only (no direct client writes)
-- Application layer / edge functions handle mutations.

-- ============================================================================
-- SEED DATA — Core ALFA Components
-- ============================================================================

-- SYSTEM nodes
INSERT INTO public.nodes (type, layer, name, slug, status, data)
VALUES
  ('SYSTEM', 'WARM', 'Cerber',          'cerber',          'PRODUCTION',
   '{"version":"1.0","language":"Python","tests_passing":216}'::jsonb),

  ('SYSTEM', 'WARM', 'Guardian',         'guardian',        'PRODUCTION',
   '{"version":"1.0","language":"Python","role":"evidence_gate"}'::jsonb),

  ('SYSTEM', 'WARM', 'ALFA Brain',       'alfa-brain',      'PRODUCTION',
   '{"version":"2.0","type":"graph-memory","backend":"Supabase"}'::jsonb),

  ('SYSTEM', 'WARM', 'ALFA Router',      'alfa-router',     'PRODUCTION',
   '{"version":"2.0","language":"PowerShell","mode":"cascade"}'::jsonb),

  ('SYSTEM', 'WARM', 'Lasuch',           'lasuch',          'PRODUCTION',
   '{"version":"1.0","language":"Python","role":"injection_detector"}'::jsonb),

  ('SYSTEM', 'WARM', 'FILTRY TONOYANA',  'filtry-tonoyana', 'PRODUCTION',
   '{"version":"1.0","filters":7,"reliability":0.95}'::jsonb)

ON CONFLICT (slug) DO NOTHING;

-- CAPABILITY nodes
INSERT INTO public.nodes (type, layer, name, slug, status, data)
VALUES
  ('CAPABILITY', 'WARM', 'DLP Scanning',             'dlp',                'ACTIVE',
   '{"detects":["PII","credentials","financial"]}'::jsonb),

  ('CAPABILITY', 'WARM', 'Prompt Injection Detection','injection-detect',   'ACTIVE',
   '{"patterns":["null_byte","bidi","homoglyph","zero_width","mixed"]}'::jsonb),

  ('CAPABILITY', 'WARM', 'Risk Scoring',              'risk-score',         'ACTIVE',
   '{"scale":"0-1.0","threshold":0.65}'::jsonb),

  ('CAPABILITY', 'WARM', 'Hallucination Detection',   'hallucination-detect','ACTIVE',
   '{"method":"confidence-scoring"}'::jsonb),

  ('CAPABILITY', 'WARM', 'Execution Gating',          'execution-gate',     'ACTIVE',
   '{"modes":["PASS","HOLD","BLOCK"]}'::jsonb),

  ('CAPABILITY', 'WARM', 'Brain Compaction',          'brain-compaction',   'ACTIVE',
   '{"version":"1.1","dry_run_default":true}'::jsonb)

ON CONFLICT (slug) DO NOTHING;

-- ASSET node: ecosystem repo
INSERT INTO public.nodes (type, layer, name, slug, status, data)
VALUES
  ('ASSET', 'WARM', 'Alfa-Eco-System', 'ecosystem-repo', 'PRODUCTION',
   '{"github":"Karen86Tonoyan/Alfa-Eco-System-Open-claw-RIP-","tag":"v1.2-chaos-hardening","tests":670}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- RELATIONS (idempotent via ON CONFLICT DO NOTHING)
INSERT INTO public.relations (source_id, target_id, type, weight)
SELECT src.id, tgt.id, vals.rel::relation_type, vals.w
FROM (VALUES
  ('cerber',          'execution-gate',     'PROTECTS',     1.0),
  ('cerber',          'dlp',                'USES',         1.0),
  ('cerber',          'injection-detect',   'USES',         1.0),
  ('cerber',          'risk-score',         'USES',         1.0),
  ('risk-score',      'lasuch',             'GENERATED_BY', 1.0),
  ('injection-detect','lasuch',             'GENERATED_BY', 1.0),
  ('filtry-tonoyana', 'hallucination-detect','USES',        1.0),
  ('guardian',        'cerber',             'PROTECTS',     0.9),
  ('alfa-router',     'alfa-brain',         'DEPENDS_ON',   1.0),
  ('alfa-brain',      'brain-compaction',   'USES',         1.0),
  ('cerber',          'ecosystem-repo',     'GENERATED_BY', 0.8),
  ('guardian',        'ecosystem-repo',     'GENERATED_BY', 0.8),
  ('lasuch',          'ecosystem-repo',     'GENERATED_BY', 0.8)
) AS vals(src_slug, tgt_slug, rel, w)
JOIN public.nodes src ON src.slug = vals.src_slug AND src.deleted_at IS NULL
JOIN public.nodes tgt ON tgt.slug = vals.tgt_slug AND tgt.deleted_at IS NULL
ON CONFLICT (source_id, target_id, type) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- SELECT * FROM public.graph_health();
-- SELECT name, type, status, layer FROM public.nodes WHERE deleted_at IS NULL ORDER BY type, name;
-- SELECT * FROM public.get_neighbors((SELECT id FROM public.nodes WHERE slug = 'cerber'));
