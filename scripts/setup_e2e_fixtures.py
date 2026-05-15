"""Setup E2E test fixtures for matching pipeline validation.

Creates (idempotently):
  - One synthetic test opportunity with future deadline, ngo_relevant=true,
    SDG [8,13] + DAC [11230] + populations [youth]
  - One test auth user (test-e2e-fwm@test.local / TestE2E2026!)
  - One organization for that user with onboarding_completed=true and
    overlapping taxonomy tags
  - Calls match_opportunities_for_org() to verify a match with taxo_score > 0

Safe to re-run.
"""
import os
from datetime import date, timedelta
from pathlib import Path
from dotenv import load_dotenv
import requests

load_dotenv(Path(__file__).resolve().parent.parent / '.env.local')
URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
H = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}

# -----------------------------------------------------------------------------
# 1. Verify the RPC works (post-v8)
# -----------------------------------------------------------------------------
ali = 'a8866183-333c-4d67-91a6-af1a0e3546ce'
r = requests.post(f'{URL}/rest/v1/rpc/match_opportunities_for_org',
                  headers=H, json={'p_org_id': ali, 'p_limit': 10})
print(f'[1] RPC sanity (ali) status={r.status_code}')
if not r.ok:
    print(' ERR:', r.text[:300])
    raise SystemExit('RPC still broken — abort')

# -----------------------------------------------------------------------------
# 2. Synthetic test opportunity (future deadline)
# -----------------------------------------------------------------------------
future = (date.today() + timedelta(days=30)).isoformat()
ext_id = 'test-e2e-fwm-fixture'

# Need a source_id — opportunities.source_id is NOT NULL. Pick first active source.
sources = requests.get(f'{URL}/rest/v1/sources', headers=H,
                      params={'select': 'id,name', 'active': 'eq.true', 'limit': '1'}).json()
if not sources:
    raise SystemExit('No active source found — seed_sources_v2.sql must be applied')
source_id = sources[0]['id']
print(f'[2a] using source: {sources[0]["name"]} ({source_id})')

# Pick a donor for the test opp (for donor intelligence widget visibility)
donors = requests.get(f'{URL}/rest/v1/donors', headers=H,
                      params={'select': 'id,name', 'limit': '1'}).json()
donor_id = donors[0]['id'] if donors else None
if donor_id:
    print(f'[2b] using donor: {donors[0]["name"]} ({donor_id})')

existing = requests.get(f'{URL}/rest/v1/opportunities', headers=H,
                        params={'external_id': f'eq.{ext_id}', 'select': 'id'}).json()
if existing:
    opp_id = existing[0]['id']
    refresh = {'deadline': future, 'status': 'published',
               'ngo_relevant': True, 'morocco_eligible': True}
    if donor_id:
        refresh['donor_id'] = donor_id
    requests.patch(f'{URL}/rest/v1/opportunities', headers=H,
                   params={'id': f'eq.{opp_id}'}, json=refresh)
    print(f'[2] test opp refreshed: {opp_id}')
else:
    desc = ("Cet appel cible les associations marocaines actives sur le developpement "
            "local, l'emploi des jeunes et l'egalite de genre. Subvention de 50 000 a 200 000 EUR.")
    payload = {
        'source_id': source_id,
        'donor_id': donor_id,
        'title': '[TEST E2E] Appel a projets associations marocaines - Developpement local',
        'summary': 'Appel a projets de test pour valider le pipeline matching. A supprimer apres verification.',
        'description': desc,
        'status': 'published', 'ngo_relevant': True, 'morocco_eligible': True,
        'deadline': future, 'language': 'fr', 'type': 'Appel a projets',
        'countries_eligible': ['MA'], 'external_id': ext_id,
        'official_url': 'https://example.test/e2e-fixture',
        'source_url': 'https://example.test/e2e-fixture',
    }
    r = requests.post(f'{URL}/rest/v1/opportunities', headers={**H, 'Prefer': 'return=representation'},
                      json=payload)
    if not r.ok:
        print(' ERR:', r.status_code, r.text[:500]); raise SystemExit('opp create failed')
    opp_id = r.json()[0]['id']
    print(f'[2] test opp created: {opp_id}  deadline={future}')

# Re-tag the opp (idempotent)
for tbl in ['opp_sdg_goals', 'opp_dac_sectors', 'opp_target_populations']:
    requests.delete(f'{URL}/rest/v1/{tbl}', headers=H,
                    params={'opportunity_id': f'eq.{opp_id}'})
for tbl, row in [
    ('opp_sdg_goals', {'opportunity_id': opp_id, 'sdg_id': 8}),
    ('opp_sdg_goals', {'opportunity_id': opp_id, 'sdg_id': 13}),
    ('opp_dac_sectors', {'opportunity_id': opp_id, 'sector_id': '11230'}),
    ('opp_target_populations', {'opportunity_id': opp_id, 'population_slug': 'youth'}),
]:
    rr = requests.post(f'{URL}/rest/v1/{tbl}', headers=H, json=row)
    if rr.status_code >= 400:
        print(f'  tag {tbl} err: {rr.text[:120]}')

# -----------------------------------------------------------------------------
# 3. Test auth user
# -----------------------------------------------------------------------------
test_email = 'test-e2e-fwm@test.local'
test_pwd = 'TestE2E2026!'
admin_h = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}

r = requests.post(f'{URL}/auth/v1/admin/users', headers=admin_h,
                  json={'email': test_email, 'password': test_pwd, 'email_confirm': True})
if r.status_code in (200, 201):
    user_id = r.json()['id']
    print(f'[3] created test user: {user_id}')
else:
    lookup = requests.get(f'{URL}/auth/v1/admin/users', headers=admin_h,
                          params={'page': '1', 'per_page': '200'}).json()
    matches = [u for u in lookup.get('users', []) if u.get('email') == test_email]
    if matches:
        user_id = matches[0]['id']
        # reset password to known value
        requests.put(f'{URL}/auth/v1/admin/users/{user_id}', headers=admin_h,
                     json={'password': test_pwd, 'email_confirm': True})
        print(f'[3] test user existed, reset pwd: {user_id}')
    else:
        print(' ERR:', r.status_code, r.text[:200]); raise SystemExit('user create failed')

# -----------------------------------------------------------------------------
# 4. Organization for test user (onboarded, taggable)
# -----------------------------------------------------------------------------
org_payload = {
    'user_id': user_id,
    'name': 'Association Test E2E',
    'org_type': 'association',
    'description': "Association de test pour validation du matching IA",
    'action_summary': "Insertion economique des jeunes et developpement local au Maroc",
    'intervention_themes_text': "Emploi des jeunes, formation professionnelle, developpement local, egalite de genre",
    'city': 'Casablanca', 'region': 'ma-casablanca-settat',
    'preferred_language': 'fr',
    'onboarding_completed': True,
    'email_frequency': 'daily',
}
existing = requests.get(f'{URL}/rest/v1/organizations', headers=H,
                        params={'user_id': f'eq.{user_id}', 'select': 'id'}).json()
if existing:
    org_id = existing[0]['id']
    requests.patch(f'{URL}/rest/v1/organizations', headers=H,
                   params={'id': f'eq.{org_id}'}, json=org_payload)
    print(f'[4] org existed, updated: {org_id}')
else:
    r = requests.post(f'{URL}/rest/v1/organizations',
                      headers={**H, 'Prefer': 'return=representation'}, json=org_payload)
    if not r.ok:
        print(' ERR:', r.text[:300]); raise SystemExit('org create failed')
    org_id = r.json()[0]['id']
    print(f'[4] org created: {org_id}')

# -----------------------------------------------------------------------------
# 5. Org taxonomy tags (overlap test opp + AMI for taxo_score > 0)
# -----------------------------------------------------------------------------
for tbl in ['org_sdg_goals', 'org_dac_sectors', 'org_action_geographies', 'org_target_populations']:
    requests.delete(f'{URL}/rest/v1/{tbl}', headers=H, params={'org_id': f'eq.{org_id}'})
for tbl, row in [
    ('org_sdg_goals', {'org_id': org_id, 'sdg_id': 8, 'priority': 1}),
    ('org_sdg_goals', {'org_id': org_id, 'sdg_id': 13, 'priority': 2}),
    ('org_dac_sectors', {'org_id': org_id, 'sector_id': '11230'}),
    ('org_action_geographies', {'org_id': org_id, 'geography_slug': 'morocco'}),
    ('org_action_geographies', {'org_id': org_id, 'geography_slug': 'ma-casablanca-settat'}),
    ('org_target_populations', {'org_id': org_id, 'population_slug': 'youth'}),
]:
    rr = requests.post(f'{URL}/rest/v1/{tbl}', headers=H, json=row)
    if rr.status_code >= 400:
        print(f'  org tag {tbl} err: {rr.text[:120]}')

# -----------------------------------------------------------------------------
# 6. Final RPC verification for test org
# -----------------------------------------------------------------------------
r = requests.post(f'{URL}/rest/v1/rpc/match_opportunities_for_org',
                  headers=H, json={'p_org_id': org_id, 'p_limit': 10})
print(f'\n[6] RPC for test org status={r.status_code}')
if r.ok:
    matches = r.json()
    print(f'    matches returned: {len(matches)}')
    for m in matches:
        print(f"      final={m['final_score']}  taxo={m['taxonomy_score']}  sem={m['semantic_score']}  | {m['title'][:55]}")
        print(f"        reason: {m['reason']}")
else:
    print(' ERR:', r.text[:300])

print()
print('=== TEST FIXTURES READY ===')
print(f'  email:       {test_email}')
print(f'  password:    {test_pwd}')
print(f'  user_id:     {user_id}')
print(f'  org_id:      {org_id}')
print(f'  test_opp_id: {opp_id}')
