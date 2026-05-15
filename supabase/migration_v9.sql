-- ============================================================
-- Funding Watch Morocco — Migration v9 (Sprint 3c : WhatsApp alerts)
--
-- Ajoute le support pour les alertes WhatsApp Business sur les matches
-- haute compatibilité (par défaut >=90%).
--
-- Pas de DROP destructif — uniquement ADD COLUMN + CREATE TABLE IF NOT
-- EXISTS. Idempotent et sans risque sur les données existantes.
--
-- À exécuter dans Supabase SQL Editor.
-- ============================================================

-- 1. Préférences WhatsApp sur organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS whatsapp_phone text,
  ADD COLUMN IF NOT EXISTS whatsapp_alerts_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_threshold int NOT NULL DEFAULT 90
    CHECK (whatsapp_threshold BETWEEN 50 AND 100);

-- 2. Log table des messages WhatsApp envoyés (dédup + audit)
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE SET NULL,
  recipient_phone text NOT NULL,
  template text NOT NULL,
  match_score numeric,
  status text NOT NULL CHECK (status IN ('sent', 'failed', 'simulated')),
  provider_message_id text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  UNIQUE (organization_id, opportunity_id, template)
);
CREATE INDEX IF NOT EXISTS whatsapp_logs_org_idx ON whatsapp_logs(organization_id, created_at DESC);

-- 3. RLS : l'orga ne voit que ses propres logs
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'whatsapp_logs_owner' AND tablename = 'whatsapp_logs'
  ) THEN
    CREATE POLICY whatsapp_logs_owner ON whatsapp_logs
      FOR SELECT USING (
        organization_id IN (SELECT id FROM organizations WHERE user_id = auth.uid())
      );
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
