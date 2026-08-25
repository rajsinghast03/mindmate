-- Mindmate: allow Presence on the conversation channel.
--
-- Migration 007 opened realtime.messages to the two people in a conversation, but
-- only for `extension = 'broadcast'` — which is all typing and read receipts
-- needed. Presence is a distinct extension on the same channel, so without this
-- the join succeeds and presence silently reports nobody, which looks exactly
-- like "the other person is offline".
--
-- Same membership function, same private topic. Nothing new is exposed: presence
-- payloads are readable only by someone already authorised for that topic.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'realtime' AND table_name = 'messages'
  ) THEN
    EXECUTE $p$DROP POLICY IF EXISTS "Conversation members receive broadcast" ON realtime.messages$p$;
    EXECUTE $p$
      CREATE POLICY "Conversation members receive broadcast"
        ON realtime.messages FOR SELECT
        TO authenticated
        USING (
          realtime.messages.extension IN ('broadcast', 'presence')
          AND public.is_conversation_topic_member((SELECT realtime.topic()))
        )
    $p$;

    EXECUTE $p$DROP POLICY IF EXISTS "Conversation members send broadcast" ON realtime.messages$p$;
    EXECUTE $p$
      CREATE POLICY "Conversation members send broadcast"
        ON realtime.messages FOR INSERT
        TO authenticated
        WITH CHECK (
          realtime.messages.extension IN ('broadcast', 'presence')
          AND public.is_conversation_topic_member((SELECT realtime.topic()))
        )
    $p$;
  END IF;
END $$;
