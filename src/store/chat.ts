import type { ChatMessage, ChatResponse } from "../api/types";
import { CHAT_LIMITS } from "../api/client";

// Conversa com o assistente. Fica SÓ em memória (nunca em localStorage): pode conter dados de saúde.

export interface ChatEntry {
  id: string;
  role: ChatMessage["role"];
  content: string;
  /** sent = faz parte do histórico enviado; pending = aguardando resposta; failed = NÃO enviada (fica fora do histórico). */
  status: "sent" | "pending" | "failed";
  error?: { message: string; retryable: boolean };
  meta?: Pick<ChatResponse, "source" | "routes_cited" | "out_of_scope">;
}

let seq = 0;
export const chatId = () => `msg-${Date.now().toString(36)}-${(seq++).toString(36)}`;

/**
 * Monta o `messages` do /v1/chat: só o que foi de fato trocado (status "sent") + a pergunta atual.
 * Perguntas que falharam ficam de fora, para não ficarem "órfãs" sem resposta no histórico.
 * Mantém as 20 mais recentes; a última é sempre a pergunta do usuário.
 */
export function buildChatMessages(history: ChatEntry[], question: string): ChatMessage[] {
  const msgs: ChatMessage[] = history
    .filter((e) => e.status === "sent")
    .map(({ role, content }) => ({ role, content }));
  msgs.push({ role: "user", content: question });
  return msgs.slice(-CHAT_LIMITS.maxMessages);
}
