-- ============================================================
-- Funding Watch Morocco — Migration v27 (Sprint 4P)
--
-- Co-soumission matchmaking : permet aux assos d'opt-in à un signal
-- "je suis intéressée pour co-soumettre sur cette opp", puis voir
-- la liste des autres assos opted-in et demander une mise en relation.
--
-- 1. Étend saved_opportunities :
--      intent_co_submit boolean DEFAULT false
--      co_submit_message text (pitch court 0-600 chars)
--      co_submit_opt_in_at timestamptz (timestamp opt-in)
--
-- 2. Crée table co_submission_requests pour tracking des demandes
--    de mise en relation. Workflow : sent → viewed → accepted/declined/expired.
--
-- Idempotent (ADD COLUMN IF NOT EXISTS + CREATE TABLE IF NOT EXISTS).
-- ============================================================

-- ============================================================
-- 1. Extension saved_opportunities
-- ============================================================
ALTER TABLE saved_opportunities
  ADD COLUMN IF NOT EXISTS intent_co_submit boolean NOT NULL DEFAULT false;

ALTER TABLE saved_opportunities
  ADD COLUMN IF NOT EXISTS co_submit_message text CHECK (length(co_submit_message) <= 600);

ALTER TABLE saved_opportunities
  ADD COLUMN IF NOT EXISTS co_submit_opt_in_at timestamptz;

-- Index pour récupérer rapidement les assos qui veulent co-soumettre sur une opp donnée
CREATE INDEX IF NOT EXISTS saved_co_submit_idx
  ON saved_opportunities(opportunity_id)
  WHERE intent_co_submit = true;

-- ============================================================
-- 2. Table co_submission_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS co_submission_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  requester_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requester_org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  target_org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  message text NOT NULL CHECK (length(message) >= 30 AND length(message) <= 2000),
  contact_email text,
  status text NOT NULL CHECK (status IN ('sent', 'viewed', 'accepted', 'declined', 'expired')) DEFAULT 'sent',
  responded_at timestamptz,
  response_note text,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Une asso ne peut pas spammer la même cible 2x sur la même opp
  UNIQUE (opportunity_id, requester_org_id, target_org_id)
);

CREATE INDEX IF NOT EXISTS co_submission_target_idx ON co_submission_requests(target_org_id);
CREATE INDEX IF NOT EXISTS co_submission_requester_idx ON co_submission_requests(requester_org_id);
CREATE INDEX IF NOT EXISTS co_submission_opp_idx ON co_submission_requests(opportunity_id);

ALTER TABLE co_submission_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "co_submission select participants" ON co_submission_requests;
CREATE POLICY "co_submission select participants" ON co_submission_requests FOR SELECT
  USING (
    -- L'utilisateur peut voir les demandes où son org est requester ou target
    EXISTS (
      SELECT 1 FROM organizations
      WHERE user_id = auth.uid()
        AND id IN (requester_org_id, target_org_id)
    )
    OR is_admin()
  );

DROP POLICY IF EXISTS "co_submission insert requester" ON co_submission_requests;
CREATE POLICY "co_submission insert requester" ON co_submission_requests FOR INSERT
  WITH CHECK (
    requester_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM organizations
      WHERE user_id = auth.uid() AND id = requester_org_id
    )
  );

DROP POLICY IF EXISTS "co_submission update target" ON co_submission_requests;
CREATE POLICY "co_submission update target" ON co_submission_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE user_id = auth.uid() AND id = target_org_id
    )
    OR is_admin()
  );

NOTIFY pgrst, 'reload schema';
