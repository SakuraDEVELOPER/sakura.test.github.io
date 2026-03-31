create or replace view public.public_profiles as
select
  null::uuid as auth_user_id,
  coalesce(p.firebase_uid, p.auth_user_id::text) as firebase_uid,
  p.profile_id,
  null::text as email,
  p.email_verified,
  p.verification_required,
  p.login,
  p.display_name,
  p.photo_url,
  p.avatar_path,
  p.avatar_type,
  p.avatar_size,
  p.roles,
  p.is_banned,
  p.banned_at,
  array[]::text[] as provider_ids,
  '[]'::jsonb as login_history,
  '[]'::jsonb as visit_history,
  p.created_at,
  p.last_sign_in_at
from public.profiles as p;

create or replace view public.public_profile_presence as
select
  pp.profile_id,
  pp.status,
  pp.is_online,
  pp.current_path,
  pp.last_seen_at
from public.profile_presence as pp;

create or replace view public.public_profile_comments as
select
  pc.id,
  pc.profile_id,
  pc.author_profile_id,
  null::uuid as auth_user_id,
  pc.firebase_author_uid,
  pc.author_name,
  pc.author_photo_url,
  pc.author_accent_role,
  pc.message,
  pc.media_url,
  pc.media_type,
  pc.media_path,
  pc.media_size,
  pc.created_at,
  pc.updated_at
from public.profile_comments as pc;

grant select on public.public_profiles to anon, authenticated;
grant select on public.public_profile_presence to anon, authenticated;
grant select on public.public_profile_comments to anon, authenticated;
