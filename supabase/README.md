# Supabase Comment Media Setup

This project keeps auth in Firebase and uses Supabase Storage only for comment media.

## 1. Create a bucket

Create a public bucket named `comment-media`.

Recommended bucket settings:

- Public bucket: `enabled`
- Allowed MIME types:
  - `image/jpeg`
  - `image/png`
  - `image/webp`
  - `image/gif`
- Max file size: `50 MB`

Also set the global project storage limit to `50 MB` in Storage settings.

## 2. Add Edge Function secrets

In Supabase Dashboard -> Edge Functions -> Secrets, add:

- `FIREBASE_PROJECT_ID=sakura-bfa74`
- `SUPABASE_STORAGE_BUCKET=comment-media`
- `SUPABASE_SERVICE_ROLE_KEY=<your service role key>`

`SUPABASE_URL` is available to hosted Edge Functions by default.

## 3. Browser env

Create `.env.local` from `.env.example` and fill:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`

## 4. Deploy the functions

Deploy these functions:

- `comment-media-upload`
- `comment-media-delete`

Example with Supabase CLI:

```bash
supabase functions deploy comment-media-upload
supabase functions deploy comment-media-delete
```

The next step in the app code is:

1. Ask Firebase for the current user's ID token.
2. Call the Edge Function with that token.
3. Receive a signed upload token + object path.
4. Upload the file to Supabase Storage.
5. Save only the public URL and metadata in Firestore `profileComments`.
