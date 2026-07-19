-- Run this once in your leads-crm Supabase project's SQL Editor.

alter table leads add column if not exists email text;
alter table leads add column if not exists social_media_link text;
