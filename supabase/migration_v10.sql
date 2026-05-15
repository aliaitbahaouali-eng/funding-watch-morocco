-- ============================================================
-- Funding Watch Morocco — Migration v10 (Sprint 3f : comptes équipe)
--
-- Permet d'inviter plusieurs utilisateurs sur une même organisation
-- avec rôles différenciés (admin / contributor / viewer). Le owner
-- d'une organisation reste celui défini par `organizations.user_id` —
-- il a implicitement le rôle admin. Cette migration AJOUTE des membres
-- supplémentaires via `organization_members`, et un flow d'invitation
-- par email via `organization_invitations`.
--
-- Idempotent (IF NOT EXISTS partout). À exécuter dans Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS organization_members (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin','contributor','viewer')),
  added_at timestamptz NOT NULL DEFAULT now(),
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (organization_id, user_id)
);
CREATE INDEX IF NOT EXISTS organization_members_user_idx ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS organization_members_org_idx ON organization_members(organization_id);

CREATE TABLE IF NOT EXISTS organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin','contributor','viewer')),
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (organization_id, email)
);
CREATE INDEX IF NOT EXISTS organization_invitations_email_idx ON organization_invitations(email);
CREATE INDEX IF NOT EXISTS organization_invitations_org_idx ON organization_invitations(organization_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- Members : l'owner ou un membre admin peut tout faire ; les autres membres
-- peuvent voir la liste de leur(s) org(s).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_members_select' AND tablename = 'organization_members') THEN
    CREATE POLICY org_members_select ON organization_members FOR SELECT USING (
      -- owner direct
      organization_id IN (SELECT id FROM organizations WHERE user_id = auth.uid())
      -- ou membre de l'org
      OR organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_members_manage' AND tablename = 'organization_members') THEN
    CREATE POLICY org_members_manage ON organization_members FOR ALL USING (
      organization_id IN (SELECT id FROM organizations WHERE user_id = auth.uid())
      OR organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin')
    );
  END IF;
END $$;

-- Invitations : owner + admins peuvent gérer ; un utilisateur peut voir
-- son propre token (pour acceptation).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_invites_manage' AND tablename = 'organization_invitations') THEN
    CREATE POLICY org_invites_manage ON organization_invitations FOR ALL USING (
      organization_id IN (SELECT id FROM organizations WHERE user_id = auth.uid())
      OR organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin')
    );
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
