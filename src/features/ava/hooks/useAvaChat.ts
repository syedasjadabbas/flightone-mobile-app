import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useAuthStore } from "@/core/auth/auth.store";
import type { TravellerLocation } from "@/core/lib/geo/types";
import { AvaRequestError, streamAvaChat } from "../api/avaClient";
import {
  conversationsApi,
  useRecordMessagesMutation,
  useStartConversationMutation,
  type ConversationDetail,
} from "../api/conversationsApi";
import type { AvaPhase, ChatMessage, SearchResultsPanel, TravelPlan } from "../types";

const MAX_HISTORY = 20;
const MAX_SAVED_CONTENT = 8000;
const FALLBACK_REPLY = "Here are the best options for your trip.";
const FAILED_REPLY = "Sorry, I couldn't finish that. Please try again.";

let seq = 0;
const newId = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`;

/** Only a real trip (or a clarify carrying a draft) replaces the remembered one. */
function keepsPlan(plan: TravelPlan | null | undefined): plan is TravelPlan {
  return Boolean(plan && (plan.action === "search" || plan.action === "package" || (plan.action === "clarify" && plan.draft)));
}

/** Saved conversation → on-screen messages; the saved results attach to the last Ava reply. */
function messagesFromConversation(c: ConversationDetail): ChatMessage[] {
  const out: ChatMessage[] = (c.messages ?? [])
    .filter((m) => m.role === "USER" || m.role === "ASSISTANT")
    .map((m) => ({ id: m.id, role: m.role === "USER" ? "user" : "assistant", content: m.content }));
  const panel = c.metadata?.searchPanel;
  if (panel) {
    for (let i = out.length - 1; i >= 0; i--) {
      if (out[i].role === "assistant") {
        out[i] = { ...out[i], panel, followUps: panel.followUpSuggestions ?? [] };
        break;
      }
    }
  }
  return out;
}

/**
 * Chat state for Ava. Same flow as the web's `useAskAiChat`: stream events,
 * stage the reply + results, reveal them together when the stream ends, and
 * remember the travel plan so follow-ups ("make it business class") keep context.
 *
 * Signed-in chats are saved to /conversations (same as web): each turn is
 * recorded with the travel plan and results. Ava always opens on a new chat;
 * past chats reopen from the history list. Saving never blocks the chat —
 * failures are ignored.
 */
export function useAvaChat(location: TravellerLocation | null) {
  const dispatch = useDispatch();
  const signedIn = useAuthStore((s) => s.status === "signedIn");
  const [startConversation] = useStartConversationMutation();
  const [recordMessages] = useRecordMessagesMutation();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<AvaPhase | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const planRef = useRef<TravelPlan | null>(null);
  const conversationRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const locationRef = useRef(location);
  messagesRef.current = messages;
  locationRef.current = location;

  useEffect(() => () => abortRef.current?.abort(), []);

  const setConversation = useCallback((id: string | null) => {
    conversationRef.current = id;
    setConversationId(id);
  }, []);

  const patch = useCallback((id: string, change: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...change } : m)));
  }, []);

  /** Open a saved chat from the history list. */
  const open = useCallback(
    async (id: string) => {
      abortRef.current?.abort();
      setRestoring(true);
      try {
        const c = await dispatch(conversationsApi.endpoints.conversation.initiate(id, { forceRefetch: true }) as never) as unknown as {
          data?: ConversationDetail;
          unsubscribe?: () => void;
        };
        c.unsubscribe?.();
        if (!c.data) return false;
        setMessages(messagesFromConversation(c.data));
        planRef.current = c.data.metadata?.travelPlan ?? null;
        setConversation(c.data.id);
        return true;
      } finally {
        setRestoring(false);
      }
    },
    [dispatch, setConversation],
  );

  /** Save one turn; creates the conversation on the first turn. Best effort. */
  const save = useCallback(
    async (user: string, reply: string, provider: string | null, plan: TravelPlan | null | undefined, panel: SearchResultsPanel | null) => {
      if (!signedIn) return;
      try {
        let id = conversationRef.current;
        if (!id) {
          const c = await startConversation({ title: user.slice(0, 80) }).unwrap();
          id = c.id;
          setConversation(id);
        }
        await recordMessages({
          conversationId: id,
          messages: [
            { role: "USER", content: user.slice(0, MAX_SAVED_CONTENT) },
            { role: "ASSISTANT", content: reply.slice(0, MAX_SAVED_CONTENT), provider },
          ],
          ...(keepsPlan(plan) ? { travelPlan: plan } : {}),
          ...(panel ? { searchPanel: panel } : {}),
        }).unwrap();
      } catch {
        /* saving is best effort — the chat itself already worked */
      }
    },
    [signedIn, startConversation, recordMessages, setConversation],
  );

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
        provider: null as string | null,
        error: null as string | null,
      };

      try {
        await streamAvaChat(
          { message, history, previousTravelPlan: planRef.current, location: locationRef.current },
          (event) => {
            switch (event.type) {
              case "status":
                setPhase(event.phase);
                break;
              case "searchResults":
                staged.panel = event.panel;
                if (event.meta?.travelPlan !== undefined) staged.plan = event.meta.travelPlan ?? null;
                if (event.meta?.provider) staged.provider = event.meta.provider;
                break;
              case "token":
                staged.reply += event.delta;
                patch(assistantId, { content: staged.reply });
                break;
              case "done":
                if (event.result.reply) staged.reply = event.result.reply;
                if (event.result.searchPanel) staged.panel = event.result.searchPanel;
                if (event.result.meta?.travelPlan !== undefined) staged.plan = event.result.meta.travelPlan ?? null;
                if (event.result.meta?.provider) staged.provider = event.result.meta.provider;
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
        const reply = staged.reply || FALLBACK_REPLY;
        patch(assistantId, {
          content: reply,
          panel: staged.panel,
          followUps: staged.panel?.followUpSuggestions ?? [],
          pending: false,
        });
        void save(message, reply, staged.provider, staged.plan, staged.panel);
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
    [busy, patch, save],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  /** Start a fresh chat (the old one stays saved in the history list). */
  const reset = useCallback(() => {
    abortRef.current?.abort();
    planRef.current = null;
    setConversation(null);
    setMessages([]);
  }, [setConversation]);

  return { messages, busy, phase, send, stop, reset, open, conversationId, restoring };
}
