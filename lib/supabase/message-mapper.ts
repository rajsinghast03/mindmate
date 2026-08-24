import { Message } from '@/types';

export type DbMessage = {
  id: string;
  conversation_id: string;
  sender_profile_id: string;
  body: string;
  created_at: string;
};

/** Shared by the API routes and the client's Realtime subscription payloads. */
export function dbMessageToMessage(row: DbMessage): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderProfileId: row.sender_profile_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

/** Matches the messages_body_check constraint in migration 001. */
export const MESSAGE_MAX_LENGTH = 4000;
