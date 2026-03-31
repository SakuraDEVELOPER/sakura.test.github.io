create extension if not exists pgcrypto;

create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create sequence if not exists public.profile_id_seq
  as bigint
  start with 1
  increment by 1
  minvalue 1
  cache 1;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid()
);

alter table public.profiles
  add column if not exists auth_user_id uuid,
  add column if not exists firebase_uid text,
  add column if not exists profile_id bigint,
  add column if not exists email text,
  add column if not exists email_verified boolean,
  add column if not exists verification_required boolean,
  add column if not exists verification_email_sent boolean,
  add column if not exists login text,
  add column if not exists display_name text,
  add column if not exists photo_url text,
  add column if not exists avatar_path text,
  add column if not exists avatar_type text,
  add column if not exists avatar_size bigint,
  add column if not exists roles text[],
  add column if not exists is_banned boolean,
  add column if not exists banned_at timestamptz,
  add column if not exists provider_ids text[],
  add column if not exists login_history jsonb,
  add column if not exists visit_history jsonb,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz,
  add column if not exists last_sign_in_at timestamptz;

alter table public.profiles
  alter column id set default gen_random_uuid(),
  alter column profile_id set default nextval('public.profile_id_seq'),
  alter column email_verified set default false,
  alter column verification_required set default false,
  alter column verification_email_sent set default false,
  alter column roles set default array['user']::text[],
  alter column is_banned set default false,
  alter column provider_ids set default array[]::text[],
  alter column login_history set default '[]'::jsonb,
  alter column visit_history set default '[]'::jsonb,
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now());

update public.profiles
set
  profile_id = coalesce(profile_id, nextval('public.profile_id_seq')),
  email_verified = coalesce(email_verified, false),
  verification_required = coalesce(verification_required, false),
  verification_email_sent = coalesce(verification_email_sent, false),
  roles = coalesce(roles, array['user']::text[]),
  is_banned = coalesce(is_banned, false),
  provider_ids = coalesce(provider_ids, array[]::text[]),
  login_history = coalesce(login_history, '[]'::jsonb),
  visit_history = coalesce(visit_history, '[]'::jsonb),
  created_at = coalesce(created_at, timezone('utc', now())),
  updated_at = coalesce(updated_at, timezone('utc', now()))
where
  profile_id is null
  or email_verified is null
  or verification_required is null
  or verification_email_sent is null
  or roles is null
  or is_banned is null
  or provider_ids is null
  or login_history is null
  or visit_history is null
  or created_at is null
  or updated_at is null;

alter table public.profiles
  alter column profile_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_profile_id_key'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_profile_id_key unique (profile_id);
  end if;
end
$$;

create unique index if not exists profiles_auth_user_id_unique_idx
  on public.profiles (auth_user_id)
  where auth_user_id is not null;

create unique index if not exists profiles_firebase_uid_unique_idx
  on public.profiles (firebase_uid)
  where firebase_uid is not null;

create unique index if not exists profiles_login_lower_unique_idx
  on public.profiles ((lower(login)))
  where login is not null;

create index if not exists profiles_roles_gin_idx
  on public.profiles
  using gin (roles);

create index if not exists profiles_display_name_idx
  on public.profiles (display_name);

create index if not exists profiles_created_at_idx
  on public.profiles (created_at desc);

create table if not exists public.profile_presence (
  profile_id bigint primary key
);

alter table public.profile_presence
  add column if not exists auth_user_id uuid,
  add column if not exists firebase_uid text,
  add column if not exists status text,
  add column if not exists is_online boolean,
  add column if not exists current_path text,
  add column if not exists last_seen_at timestamptz,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.profile_presence
  alter column status set default 'offline',
  alter column is_online set default false,
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now());

update public.profile_presence
set
  status = coalesce(status, 'offline'),
  is_online = coalesce(is_online, false),
  created_at = coalesce(created_at, timezone('utc', now())),
  updated_at = coalesce(updated_at, timezone('utc', now()))
where
  status is null
  or is_online is null
  or created_at is null
  or updated_at is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profile_presence_profile_id_fkey'
      and conrelid = 'public.profile_presence'::regclass
  ) then
    alter table public.profile_presence
      add constraint profile_presence_profile_id_fkey
      foreign key (profile_id) references public.profiles(profile_id) on delete cascade;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profile_presence_status_chk'
      and conrelid = 'public.profile_presence'::regclass
  ) then
    alter table public.profile_presence
      add constraint profile_presence_status_chk
      check (status in ('online', 'offline'));
  end if;
end
$$;

create index if not exists profile_presence_is_online_idx
  on public.profile_presence (is_online, last_seen_at desc);

create index if not exists profile_presence_auth_user_id_idx
  on public.profile_presence (auth_user_id);

create table if not exists public.profile_comments (
  id uuid primary key default gen_random_uuid()
);

alter table public.profile_comments
  add column if not exists profile_id bigint,
  add column if not exists author_profile_id bigint,
  add column if not exists auth_user_id uuid,
  add column if not exists firebase_author_uid text,
  add column if not exists author_name text,
  add column if not exists author_photo_url text,
  add column if not exists author_accent_role text,
  add column if not exists message text,
  add column if not exists media_url text,
  add column if not exists media_type text,
  add column if not exists media_path text,
  add column if not exists media_size bigint,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.profile_comments
  alter column id set default gen_random_uuid(),
  alter column message set default '',
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now());

update public.profile_comments
set
  message = coalesce(message, ''),
  created_at = coalesce(created_at, timezone('utc', now())),
  updated_at = coalesce(updated_at, timezone('utc', now()))
where
  message is null
  or created_at is null
  or updated_at is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profile_comments_profile_id_fkey'
      and conrelid = 'public.profile_comments'::regclass
  ) then
    alter table public.profile_comments
      add constraint profile_comments_profile_id_fkey
      foreign key (profile_id) references public.profiles(profile_id) on delete cascade;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profile_comments_author_profile_id_fkey'
      and conrelid = 'public.profile_comments'::regclass
  ) then
    alter table public.profile_comments
      add constraint profile_comments_author_profile_id_fkey
      foreign key (author_profile_id) references public.profiles(profile_id) on delete set null;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profile_comments_message_length_chk'
      and conrelid = 'public.profile_comments'::regclass
  ) then
    alter table public.profile_comments
      add constraint profile_comments_message_length_chk
      check (char_length(message) <= 280);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profile_comments_content_required_chk'
      and conrelid = 'public.profile_comments'::regclass
  ) then
    alter table public.profile_comments
      add constraint profile_comments_content_required_chk
      check (
        nullif(trim(message), '') is not null
        or media_url is not null
      );
  end if;
end
$$;

create index if not exists profile_comments_profile_created_idx
  on public.profile_comments (profile_id, created_at desc);

create index if not exists profile_comments_author_profile_idx
  on public.profile_comments (author_profile_id, created_at desc);

create index if not exists profile_comments_auth_user_idx
  on public.profile_comments (auth_user_id, created_at desc);

create index if not exists profile_comments_firebase_author_uid_idx
  on public.profile_comments (firebase_author_uid, created_at desc);

create index if not exists profile_comments_media_path_idx
  on public.profile_comments (media_path)
  where media_path is not null;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_row_updated_at();

drop trigger if exists profile_presence_set_updated_at on public.profile_presence;
create trigger profile_presence_set_updated_at
before update on public.profile_presence
for each row
execute function public.set_row_updated_at();

drop trigger if exists profile_comments_set_updated_at on public.profile_comments;
create trigger profile_comments_set_updated_at
before update on public.profile_comments
for each row
execute function public.set_row_updated_at();
