-- ============================================================
-- Funding Watch Morocco — Migration v22 (Sprint 4M : passage version bêta)
--
-- Crée la table beta_feedback qui collecte les retours utilisateurs
-- via le widget flottant in-app (FeedbackWidget). Chaque enregistrement
-- est associé à un user_id + organization_id si dispo + l'URL où le
-- feedback a été envoyé.
--
-- Workflow admin :
--   nouveau (new) → en cours (in_progress) → résolu (resolved) | rejeté (rejected)
--
-- RLS : owner_select (l'utilisateur voit ses propres feedbacks),
--       authenticated_insert (n'importe qui logged-in peut envoyer),
--       admin_all (les admins peuvent tout lire/modifier).
--
-- Idempotent.
-- ============================================================

CREATE TABLE IF NOT EXISTS beta_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('bug', 'idea', 'love', 'question', 'other')) DEFAULT 'idea',
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'blocker')) DEFAULT 'low',
  page_url text,
  message text NOT NULL CHECK (length(message) >= 5 AND length(message) <= 4000),
  user_agent text,
  status text NOT NULL CHECK (status IN ('new', 'in_progress', 'resolved', 'rejected')) DEFAULT 'new',
  resolved_at timestamptz,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS beta_feedback_user_idx ON beta_feedback(user_id);
CREATE INDEX IF NOT EXISTS beta_feedback_org_idx ON beta_feedback(organization_id);
CREATE INDEX IF NOT EXISTS beta_feedback_status_idx ON beta_feedback(status) WHERE status IN ('new', 'in_progress');
CREATE INDEX IF NOT EXISTS beta_feedback_created_idx ON beta_feedback(created_at DESC);

-- Trigger updated_at
DROP TRIGGER IF EXISTS beta_feedback_updated_at ON beta_feedback;
CREATE TRIGGER beta_feedback_updated_at BEFORE UPDATE ON beta_feedback
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE beta_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "beta_feedback owner select" ON beta_feedback;
CREATE POLICY "beta_feedback owner select" ON beta_feedback FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "beta_feedback authenticated insert" ON beta_feedback;
CREATE POLICY "beta_feedback authenticated insert" ON beta_feedback FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "beta_feedback admin update" ON beta_feedback;
CREATE POLICY "beta_feedback admin update" ON beta_feedback FOR UPDATE
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "beta_feedback admin delete" ON beta_feedback;
CREATE POLICY "beta_feedback admin delete" ON beta_feedback FOR DELETE
  USING (is_admin());

NOTIFY pgrst, 'reload schema';
