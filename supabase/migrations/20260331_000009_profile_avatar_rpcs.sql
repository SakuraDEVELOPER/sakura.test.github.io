create or replace function public.update_current_profile_avatar_rpc(
  target_photo_url text default null,
  target_avatar_path text default null,
  target_avatar_type text default null,
  target_avatar_size bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_auth_user_id uuid := auth.uid();
  actor_profile public.profiles%rowtype;
begin
  if actor_auth_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select *
  into actor_profile
  from public.profiles
  where auth_user_id = actor_auth_user_id
  limit 1;

  if actor_profile.profile_id is null then
    raise exception 'Actor profile not found.';
  end if;

  update public.profiles
  set
    photo_url = nullif(trim(coalesce(target_photo_url, '')), ''),
    avatar_path = nullif(trim(coalesce(target_avatar_path, '')), ''),
    avatar_type = nullif(trim(coalesce(target_avatar_type, '')), ''),
    avatar_size = target_avatar_size,
    updated_at = timezone('utc', now())
  where profile_id = actor_profile.profile_id
  returning * into actor_profile;

  return jsonb_build_object(
    'profileId', actor_profile.profile_id,
    'authUserId', actor_profile.auth_user_id,
    'firebaseUid', actor_profile.firebase_uid,
    'email', actor_profile.email,
    'emailVerified', actor_profile.email_verified,
    'verificationRequired', actor_profile.verification_required,
    'verificationEmailSent', actor_profile.verification_email_sent,
    'login', actor_profile.login,
    'displayName', actor_profile.display_name,
    'photoURL', actor_profile.photo_url,
    'avatarPath', actor_profile.avatar_path,
    'avatarType', actor_profile.avatar_type,
    'avatarSize', actor_profile.avatar_size,
    'roles', coalesce(actor_profile.roles, array[]::text[]),
    'isBanned', actor_profile.is_banned,
    'bannedAt', actor_profile.banned_at,
    'providerIds', coalesce(actor_profile.provider_ids, array[]::text[]),
    'loginHistory', coalesce(actor_profile.login_history, '[]'::jsonb),
    'visitHistory', coalesce(actor_profile.visit_history, '[]'::jsonb),
    'creationTime', actor_profile.created_at,
    'updatedAt', actor_profile.updated_at,
    'lastSignInTime', actor_profile.last_sign_in_at
  );
end;
$$;

create or replace function public.admin_update_profile_avatar_rpc(
  target_profile_id bigint,
  target_photo_url text default null,
  target_avatar_path text default null,
  target_avatar_type text default null,
  target_avatar_size bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_auth_user_id uuid := auth.uid();
  actor_profile public.profiles%rowtype;
  target_profile public.profiles%rowtype;
  actor_roles text[] := array[]::text[];
  target_roles text[] := array[]::text[];
  actor_is_root boolean := false;
  actor_is_co_owner boolean := false;
  target_is_root boolean := false;
begin
  if actor_auth_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if target_profile_id is null or target_profile_id <= 0 then
    raise exception 'Target profile id is required.';
  end if;

  select *
  into actor_profile
  from public.profiles
  where auth_user_id = actor_auth_user_id
  limit 1;

  if actor_profile.profile_id is null then
    raise exception 'Actor profile not found.';
  end if;

  select *
  into target_profile
  from public.profiles
  where profile_id = target_profile_id
  limit 1;

  if target_profile.profile_id is null then
    raise exception 'Target profile not found.';
  end if;

  actor_roles := coalesce(actor_profile.roles, array[]::text[]);
  target_roles := coalesce(target_profile.roles, array[]::text[]);
  actor_is_root := coalesce('root' = any(actor_roles), false);
  actor_is_co_owner := coalesce('co-owner' = any(actor_roles), false);
  target_is_root := coalesce('root' = any(target_roles), false);

  if actor_profile.profile_id <> target_profile.profile_id then
    if not actor_is_root and not actor_is_co_owner then
      raise exception 'Only the owner or a manager can update profile avatars.';
    end if;

    if actor_is_co_owner and not actor_is_root and target_is_root then
      raise exception 'Co-owner cannot manage a root account.';
    end if;
  end if;

  update public.profiles
  set
    photo_url = nullif(trim(coalesce(target_photo_url, '')), ''),
    avatar_path = nullif(trim(coalesce(target_avatar_path, '')), ''),
    avatar_type = nullif(trim(coalesce(target_avatar_type, '')), ''),
    avatar_size = target_avatar_size,
    updated_at = timezone('utc', now())
  where profile_id = target_profile.profile_id
  returning * into target_profile;

  return jsonb_build_object(
    'profileId', target_profile.profile_id,
    'authUserId', target_profile.auth_user_id,
    'firebaseUid', target_profile.firebase_uid,
    'email', target_profile.email,
    'emailVerified', target_profile.email_verified,
    'verificationRequired', target_profile.verification_required,
    'verificationEmailSent', target_profile.verification_email_sent,
    'login', target_profile.login,
    'displayName', target_profile.display_name,
    'photoURL', target_profile.photo_url,
    'avatarPath', target_profile.avatar_path,
    'avatarType', target_profile.avatar_type,
    'avatarSize', target_profile.avatar_size,
    'roles', coalesce(target_profile.roles, array[]::text[]),
    'isBanned', target_profile.is_banned,
    'bannedAt', target_profile.banned_at,
    'providerIds', coalesce(target_profile.provider_ids, array[]::text[]),
    'loginHistory', coalesce(target_profile.login_history, '[]'::jsonb),
    'visitHistory', coalesce(target_profile.visit_history, '[]'::jsonb),
    'creationTime', target_profile.created_at,
    'updatedAt', target_profile.updated_at,
    'lastSignInTime', target_profile.last_sign_in_at
  );
end;
$$;

grant execute on function public.update_current_profile_avatar_rpc(text, text, text, bigint) to authenticated;
grant execute on function public.admin_update_profile_avatar_rpc(bigint, text, text, text, bigint) to authenticated;
revoke all on function public.update_current_profile_avatar_rpc(text, text, text, bigint) from anon;
revoke all on function public.admin_update_profile_avatar_rpc(bigint, text, text, text, bigint) from anon;
