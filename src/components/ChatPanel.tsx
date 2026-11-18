import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { api, ApiError, CHAT_LIMITS } from "../api/client";
import { profileLabel } from "../data/catalog";
import { useApp, type LastSearch } from "../store/AppStore";
import { buildChatMessages, chatId, type ChatEntry } from "../store/chat";

const DEFAULT_NOTICE =
  "Assistente com IA: as respostas podem conter erros. Confirme a situação de elevadores e acessos nos canais oficiais. Não informe dados pessoais na conversa.";

const SUGGESTIONS = [
  "Qual rota tem menos caminhada?",
  "Alguma rota tem elevador com problema?",
  "Qual rota você evitaria no meu perfil?",
];

// Depois deste tempo esperando, avisa que o serviço pode estar "acordando" (plano free do Render).
const SLOW_AFTER_MS = 4000;

function describeError(err: unknown): NonNullable<ChatEntry["error"]> {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 503) return { message: "Assistente indisponível no momento.", retryable: true };
    if (err.status === 422) {
      return { message: `Não consegui enviar esta mensagem. Confira se ela tem entre 1 e ${CHAT_LIMITS.maxChars} caracteres.`, retryable: false };
    }
    if (err.status === 429) return { message: err.message, retryable: true };
  }
  return { message: "Não consegui falar com o assistente.", retryable: true };
}

interface Props {
  search: LastSearch;
  onClose: () => void;
  /** Toque em um chip de rota citada: fecha o chat e leva até o card. */
  onShowRoute: (routeId: string) => void;
}

export function ChatPanel({ search, onClose, onShowRoute }: Props) {
  const { chat, updateChat } = useApp();
  const [text, setText] = useState("");
  const [notice, setNotice] = useState(DEFAULT_NOTICE);
  const [slow, setSlow] = useState(false);
  const [waking, setWaking] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const pending = chat.some((e) => e.status === "pending");
  const profile = search.result.profile;
  const routeName = (id: string) => search.result.routes.find((r) => r.route_id === id)?.summary ?? id;

  // Foco no campo ao abrir; trava a rolagem da página por trás do painel.
  useEffect(() => {
    inputRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [chat.length, pending]);

  useEffect(() => {
    if (!pending) return setSlow(false);
    const t = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(t);
  }, [pending]);

  async function send(question: string, retryId?: string) {
    const q = question.trim();
    if (!q || q.length > CHAT_LIMITS.maxChars || pending) return;

    const id = retryId ?? chatId();
    // Reenvio: a pergunta volta para o fim da conversa, na ordem em que será enviada.
    const history = chat.filter((e) => e.id !== id);
    updateChat(search, (entries) => [...entries.filter((e) => e.id !== id), { id, role: "user", content: q, status: "pending" }]);
    if (!retryId) setText("");

    setWaking(false);
    try {
      // 502/504 na 1ª tentativa: o cliente espera 5 s e tenta de novo uma vez.
      const res = await api.sendChatMessage(profile, buildChatMessages(history, q), search.candidates, search.reports, {
        onWaking: () => setWaking(true),
      });
      setNotice(res.notice || DEFAULT_NOTICE);
      updateChat(search, (entries) => [
        ...entries.map((e) => (e.id === id ? { ...e, status: "sent" as const, error: undefined } : e)),
        {
          id: chatId(),
          role: "assistant",
          content: res.reply,
          status: "sent",
          meta: { source: res.source, routes_cited: res.routes_cited, out_of_scope: res.out_of_scope },
        },
      ]);
    } catch (err) {
      updateChat(search, (entries) => entries.map((e) => (e.id === id ? { ...e, status: "failed" as const, error: describeError(err) } : e)));
    } finally {
      setWaking(false);
      inputRef.current?.focus();
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void send(text);
  }

  function onInputKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(text);
    }
  }

  // Esc fecha; Tab fica preso dentro do painel (é um diálogo modal).
  function onPanelKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !panelRef.current) return;
    const focusables = panelRef.current.querySelectorAll<HTMLElement>("button:not(:disabled), textarea, [href]");
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="chat-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panelRef} className="chat-panel" role="dialog" aria-modal="true" aria-labelledby="chat-title" onKeyDown={onPanelKey}>
        <header className="chat-header">
          <div>
            <h2 id="chat-title">Dúvidas sobre as rotas</h2>
            <p className="small muted">
              {profileLabel(profile)} · {search.result.routes.length} rotas
            </p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar o chat">
            ✕
          </button>
        </header>
        <p className="chat-notice small">{notice}</p>

        <div className="chat-messages" role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversa com o assistente">
          {chat.length === 0 && (
            <div className="chat-empty stack-sm">
              <p className="muted">Pergunte sobre as rotas desta busca ou sobre acessibilidade no transporte. Sugestões:</p>
              {SUGGESTIONS.map((s) => (
                <button key={s} className="btn suggestion" onClick={() => void send(s)} disabled={pending}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {chat.map((e) => (
            <div key={e.id} className={`chat-msg ${e.role} ${e.status}`}>
              <span className="sr-only">{e.role === "user" ? "Você disse:" : "Assistente respondeu:"}</span>
              <p className="chat-bubble">{e.content}</p>

              {e.role === "assistant" && e.meta && (
                <>
                  <span className={`chat-source ${e.meta.source === "llm" ? "llm" : "auto"}`}>
                    {e.meta.source === "llm" ? "✨ Resposta gerada por IA" : "⚙️ Resposta automática"}
                  </span>
                  {e.meta.routes_cited.length > 0 && (
                    <div className="chat-cited" aria-label="Rotas citadas na resposta">
                      {e.meta.routes_cited.map((id) => (
                        <button key={id} className="chip-btn" onClick={() => onShowRoute(id)}>
                          <span aria-hidden>📍</span> {routeName(id)}
                          <span className="sr-only"> — mostrar na lista de rotas</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {e.status === "failed" && e.error && (
                <div className="chat-error" role="alert">
                  <span>⚠️ Não enviada. {e.error.message}</span>
                  {e.error.retryable && (
                    <button className="btn small-btn" onClick={() => void send(e.content, e.id)} disabled={pending}>
                      Tentar de novo
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {pending && (
            <div className="chat-msg assistant">
              <p className="chat-bubble typing" role="status">
                <span className="dots" aria-hidden>
                  <i />
                  <i />
                  <i />
                </span>
                {waking
                  ? "Acordando o assistente…"
                  : slow
                    ? "Acordando o assistente, isso pode levar alguns segundos…"
                    : "Assistente digitando…"}
              </p>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form className="chat-form" onSubmit={submit}>
          <label htmlFor="chat-input" className="sr-only">
            Sua pergunta sobre as rotas
          </label>
          <textarea
            id="chat-input"
            ref={inputRef}
            rows={2}
            maxLength={CHAT_LIMITS.maxChars}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Ex.: e se o elevador da Sé estiver quebrado?"
            aria-describedby="chat-counter"
          />
          <div className="chat-form-row">
            <span id="chat-counter" className="small muted">
              {text.length}/{CHAT_LIMITS.maxChars}
            </span>
            <button className="btn primary" disabled={!text.trim() || pending} aria-label="Enviar pergunta">
              Enviar ➤
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
