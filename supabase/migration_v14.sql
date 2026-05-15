-- ============================================================
-- Funding Watch Morocco — Migration v14 (unsubscribe RGPD-compliant)
--
-- Audit Phase 1 #5 — digest matin :
-- Chaque email envoyé doit comporter un lien de désinscription
-- en 1 clic, conforme RGPD (pas de login requis pour se désabonner).
--
-- Cette migration :
--   1. Ajoute `organizations.unsubscribe_token` (uuid random, unique)
--   2. Backfill : génère un token pour les orgs existantes
--   3. Trigger : génère automatiquement un token à l'insert
--   4. SQL function `unsubscribe_org_by_token(token)` qui set
--      email_frequency='none' et retourne l'org_id (sécurisé)
-- ============================================================

-- 1. Colonne unsubscribe_token + index unique
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS unsubscribe_token uuid UNIQUE DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS organizations_unsubscribe_token_idx
  ON organizations(unsubscribe_token) WHERE unsubscribe_token IS NOT NULL;

-- 2. Backfill : génère un token pour les orgs qui n'en ont pas
UPDATE organizations
SET unsubscribe_token = gen_random_uuid()
WHERE unsubscribe_token IS NULL;

-- 3. Trigger : nouveau token auto à chaque INSERT (si NULL)
CREATE OR REPLACE FUNCTION organizations_ensure_unsubscribe_token()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.unsubscribe_token IS NULL THEN
    NEW.unsubscribe_token := gen_random_uuid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organizations_ensure_unsubscribe_token_trg ON organizations;
CREATE TRIGGER organizations_ensure_unsubscribe_token_trg
  BEFORE INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION organizations_ensure_unsubscribe_token();

-- 4. SQL function : désabonnement par token (SECURITY DEFINER → bypass RLS)
CREATE OR REPLACE FUNCTION unsubscribe_org_by_token(p_token uuid)
RETURNS TABLE (org_id uuid, org_name text, was_subscribed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
  v_org_name text;
  v_prev_freq text;
BEGIN
  SELECT id, name, email_frequency
  INTO v_org_id, v_org_name, v_prev_freq
  FROM organizations
  WHERE unsubscribe_token = p_token;

  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE organizations
  SET email_frequency = 'none',
      updated_at = now()
  WHERE id = v_org_id;

  -- Log dans email_logs pour audit RGPD
  BEGIN
    INSERT INTO email_logs (organization_id, recipient_email, subject, template, status, sent_at)
    VALUES (v_org_id, NULL, 'Unsubscribe RGPD', 'unsubscribe_event', 'unsubscribed', now());
  EXCEPTION WHEN OTHERS THEN
    -- table email_logs peut ne pas exister, ne pas bloquer
    NULL;
  END;

  org_id := v_org_id;
  org_name := v_org_name;
  was_subscribed := (v_prev_freq IS DISTINCT FROM 'none');
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION unsubscribe_org_by_token(uuid) TO anon;
GRANT EXECUTE ON FUNCTION unsubscribe_org_by_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION unsubscribe_org_by_token(uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
