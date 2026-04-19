-- Evolution / CRM — tabelas base para webhook e página Mensagens
-- Executar no Supabase SQL Editor ou via CLI: supabase db push
-- Erro 42P01 "relation contacts does not exist": esta migration cria as tabelas.

-- ── CONTACTOS (webhook + sidebar merge) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  remote_jid text NOT NULL,
  phone text NOT NULL,
  name text,
  user_id text,
  source text DEFAULT 'evolution',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz,
  last_message_preview text,
  last_message_from_me boolean,
  CONSTRAINT contacts_remote_jid_key UNIQUE (remote_jid)
);

CREATE INDEX IF NOT EXISTS idx_contacts_last_message_at
  ON public.contacts (last_message_at DESC NULLS LAST);

COMMENT ON TABLE public.contacts IS 'Contactos WhatsApp (Evolution); remote_jid canónico único';

-- ── MENSAGENS (webhook + Realtime + loadMessages Supabase) ─────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id text PRIMARY KEY,
  message_id text NOT NULL,
  contact_id uuid REFERENCES public.contacts (id) ON DELETE SET NULL,
  remote_jid text NOT NULL,
  content text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'text',
  is_outgoing boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'delivered',
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  media_url text,
  mime_type text,
  caption text,
  push_name text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT messages_message_id_key UNIQUE (message_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_remote_jid_timestamp
  ON public.messages (remote_jid, "timestamp" DESC);

COMMENT ON TABLE public.messages IS 'Histórico WhatsApp; id e message_id = Evolution message id';

-- ── RLS (CRM interno: ajuste políticas se expuseres à Internet) ─────────────
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contacts_all_public" ON public.contacts;
CREATE POLICY "contacts_all_public"
  ON public.contacts FOR ALL TO public
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "messages_all_public" ON public.messages;
CREATE POLICY "messages_all_public"
  ON public.messages FOR ALL TO public
  USING (true) WITH CHECK (true);

-- Realtime: no Supabase → Database → Publications → supabase_realtime
-- Adicionar manualmente as tabelas `messages` e `contacts` se quiseres push instantâneo no browser.
