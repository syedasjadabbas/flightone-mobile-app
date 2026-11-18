import { fetch } from "expo/fetch";
import { API_BASE_URL } from "@/core/config/env";
import { clientHeaders } from "@/core/api/headers";
import { useAuthStore } from "@/core/auth/auth.store";
import { refreshSessionOnce } from "@/core/auth/refreshSession";
import { formatApiError } from "@/core/api/formatApiError";
import { createSseParser } from "../lib/sse";
import type { AvaStreamEvent, ChatTurn, TravelPlan } from "../types";

/**
 * Ava streams over SSE, which RTK Query can't model, so this one feature talks
 * to `POST /ava/chat` directly. It follows the same rules as baseApi:
 * Bearer + platform/device headers, one refresh-and-retry on 401.
 */

export interface AvaChatRequest {
  message: string;
  history: ChatTurn[];
  previousTravelPlan?: TravelPlan | null;
}

export class AvaRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AvaRequestError";
  }
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
    ...clientHeaders(),
  };
  const { accessToken } = useAuthStore.getState();
  if (accessToken) h.Authorization = `Bearer ${accessToken}`;
  return h;
}

async function post(body: AvaChatRequest, signal: AbortSignal) {
  return fetch(`${API_BASE_URL}/ava/chat`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ ...body, stream: true }),
    signal,
  });
}

/** Streams Ava's events to `onEvent`. Resolves when the stream ends. */
export async function streamAvaChat(
  body: AvaChatRequest,
  onEvent: (event: AvaStreamEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  let res;
  try {
    res = await post(body, signal);
    if (res.status === 401 && (await refreshSessionOnce())) {
      res = await post(body, signal);
    }
  } catch (err) {
    if (signal.aborted) throw err;
    throw new AvaRequestError(formatApiError({ status: "FETCH_ERROR" }));
  }

  if (!res.ok || !res.body) {
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      /* no body */
    }
    throw new AvaRequestError(formatApiError({ status: res.status, data }));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const push = createSseParser<AvaStreamEvent>();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const event of push(decoder.decode(value, { stream: true }))) onEvent(event);
  }
  for (const event of push(decoder.decode() + "\n\n")) onEvent(event);
}
