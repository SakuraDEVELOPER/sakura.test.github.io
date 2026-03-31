create or replace function public.sync_current_profile_presence_rpc(
  target_status text default 'online',
  target_is_online boolean default true,
  target_current_path text default null,
  target_last_seen_at timestamptz default null,
  target_source text default 'activity',
  target_force_visit boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_auth_user_id uuid := auth.uid();
  actor_profile public.profiles%rowtype;
  next_last_seen timestamptz := coalesce(target_last_seen_at, timezone('utc', now()));
  normalized_status text := case
    when target_status = 'online' and coalesce(target_is_online, false) = true then 'online'
    else 'offline'
  end;
  normalized_is_online boolean := normalized_status = 'online';
  normalized_current_path text := left(nullif(trim(coalesce(target_current_path, '')), ''), 512);
  normalized_source text := left(coalesce(nullif(trim(coalesce(target_source, '')), ''), 'activity'), 64);
  previous_visit_history jsonb := case
    when jsonb_typeof(coalesce(actor_profile.visit_history, '[]'::jsonb)) = 'array'
      then coalesce(actor_profile.visit_history, '[]'::jsonb)
    else '[]'::jsonb
  end;
  next_visit_history jsonb := '[]'::jsonb;
  next_visit_entry jsonb := null;
  visit_entry jsonb;
  last_visit jsonb := null;
  should_record_visit boolean := coalesce(target_force_visit, false);
  visit_count integer := 0;
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

  previous_visit_history := case
    when jsonb_typeof(coalesce(actor_profile.visit_history, '[]'::jsonb)) = 'array'
      then coalesce(actor_profile.visit_history, '[]'::jsonb)
    else '[]'::jsonb
  end;
  last_visit := previous_visit_history -> 0;

  if not should_record_visit then
    if last_visit is null then
      should_record_visit := true;
    elsif coalesce(last_visit ->> 'path', '') is distinct from coalesce(normalized_current_path, '') then
      should_record_visit := true;
    elsif coalesce(last_visit ->> 'status', '') is distinct from normalized_status then
      should_record_visit := true;
    elsif coalesce(last_visit ->> 'source', '') is distinct from normalized_source then
      should_record_visit := true;
    end if;
  end if;

  if should_record_visit then
    next_visit_entry := jsonb_build_object(
      'timestamp', next_last_seen,
      'path', normalized_current_path,
      'source', normalized_source,
      'status', normalized_status
    );

    next_visit_history := jsonb_build_array(next_visit_entry);
    visit_count := 1;

    for visit_entry in
      select value
      from jsonb_array_elements(previous_visit_history)
    loop
      exit when visit_count >= 12;

      if jsonb_typeof(visit_entry) <> 'object' then
        continue;
      end if;

      if visit_entry = next_visit_entry then
        continue;
      end if;

      next_visit_history := next_visit_history || jsonb_build_array(visit_entry);
      visit_count := visit_count + 1;
    end loop;
  else
    next_visit_history := previous_visit_history;
  end if;

  insert into public.profile_presence (
    profile_id,
    auth_user_id,
    firebase_uid,
    status,
    is_online,
    current_path,
    last_seen_at
  )
  values (
    actor_profile.profile_id,
    actor_auth_user_id,
    nullif(trim(coalesce(actor_profile.firebase_uid, '')), ''),
    normalized_status,
    normalized_is_online,
    normalized_current_path,
    next_last_seen
  )
  on conflict (profile_id) do update
  set
    auth_user_id = excluded.auth_user_id,
    firebase_uid = excluded.firebase_uid,
    status = excluded.status,
    is_online = excluded.is_online,
    current_path = excluded.current_path,
    last_seen_at = excluded.last_seen_at,
    updated_at = timezone('utc', now());

  update public.profiles
  set
    visit_history = next_visit_history,
    updated_at = timezone('utc', now())
  where profile_id = actor_profile.profile_id
  returning * into actor_profile;

  return jsonb_build_object(
    'profileId', actor_profile.profile_id,
    'authUserId', actor_profile.auth_user_id,
    'firebaseUid', actor_profile.firebase_uid,
    'visitHistory', coalesce(actor_profile.visit_history, '[]'::jsonb),
    'presence', jsonb_build_object(
      'status', normalized_status,
      'isOnline', normalized_is_online,
      'currentPath', normalized_current_path,
      'lastSeenAt', next_last_seen
    )
  );
end;
$$;

grant execute on function public.sync_current_profile_presence_rpc(text, boolean, text, timestamptz, text, boolean) to authenticated;
revoke all on function public.sync_current_profile_presence_rpc(text, boolean, text, timestamptz, text, boolean) from anon;
