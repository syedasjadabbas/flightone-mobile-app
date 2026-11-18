import { useCallback, useEffect, useRef, useState } from "react";
import { AvaRequestError, streamAvaChat } from "../api/avaClient";
import type { AvaPhase, ChatMessage, SearchResultsPanel, TravelPlan } from "../types";

const MAX_HISTORY = 20;
const FALLBACK_REPLY = "Here are the best options for your trip.";
const FAILED_REPLY = "Sorry, I couldn't finish that. Please try again.";

let seq = 0;
const newId = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`;

/** Only a real trip (or a clarify carrying a draft) replaces the remembered one. */
function keepsPlan(plan: TravelPlan | null | undefined): plan is TravelPlan {
  return Boolean(plan && (plan.action === "search" || plan.action === "package" || (plan.action === "clarify" && plan.draft)));
}

/**
 * Chat state for Ava. Same flow as the web's `useAskAiChat`: stream events,
 * stage the reply + results, reveal them together when the stream ends, and
 * remember the travel plan so follow-ups ("make it business class") keep context.
 */
export function useAvaChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<AvaPhase | null>(null);
  const planRef = useRef<TravelPlan | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  useEffect(() => () => abortRef.current?.abort(), []);

  const patch = useCallback((id: string, change: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...change } : m)));
  }, []);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || busy) return;

      const history = messagesRef.current
        .filter((m) => !m.pending && !m.failed && m.content)
        .map(({ role, content }) => ({ role, content }))
        .slice(-MAX_HISTORY);

      const userMsg: ChatMessage = { id: newId(), role: "user", content: message };
      const assistantId = newId();
      setMessages((prev) => [...prev, userMsg, { id: assistantId, role: "assistant", content: "", pending: true }]);
      setBusy(true);
      setPhase("extract");

      const controller = new AbortController();
      abortRef.current = controller;

      const staged = {
        reply: "",
        panel: null as SearchResultsPanel | null,
        plan: undefined as TravelPlan | null | undefined,
        error: null as string | null,
      };

      try {
        await streamAvaChat(
          { message, history, previousTravelPlan: planRef.current },
          (event) => {
            switch (event.type) {
              case "status":
                setPhase(event.phase);
                break;
              case "searchResults":
                staged.panel = event.panel;
                if (event.meta?.travelPlan !== undefined) staged.plan = event.meta.travelPlan ?? null;
                break;
              case "token":
                staged.reply += event.delta;
                patch(assistantId, { content: staged.reply });
                break;
              case "done":
                if (event.result.reply) staged.reply = event.result.reply;
                if (event.result.searchPanel) staged.panel = event.result.searchPanel;
                if (event.result.meta?.travelPlan !== undefined) staged.plan = event.result.meta.travelPlan ?? null;
                break;
              case "error":
                staged.error = event.message;
                break;
            }
          },
          controller.signal,
        );

        if (staged.error) {
          patch(assistantId, { content: staged.error, pending: false, failed: true });
          return;
        }
        if (keepsPlan(staged.plan)) planRef.current = staged.plan;
        patch(assistantId, {
          content: staged.reply || FALLBACK_REPLY,
          panel: staged.panel,
          followUps: staged.panel?.followUpSuggestions ?? [],
          pending: false,
        });
      } catch (err) {
        if (controller.signal.aborted) {
          patch(assistantId, { content: staged.reply || "Stopped.", pending: false, failed: !staged.reply });
          return;
        }
        patch(assistantId, {
          content: err instanceof AvaRequestError ? err.message : FAILED_REPLY,
          pending: false,
          failed: true,
        });
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setBusy(false);
        setPhase(null);
      }
    },
    [busy, patch],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    planRef.current = null;
    setMessages([]);
  }, []);

  return { messages, busy, phase, send, stop, reset };
}
