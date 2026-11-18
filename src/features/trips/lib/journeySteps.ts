// Copied from the web app's client/app/journey/_components/journeySteps.ts — keep the two in step.
/**
 * Pure view-model helpers for the My Journey card: the trip headline and the
 * vertical timeline. Everything here is derived from the journey watch the API
 * returns — no step is invented when its data is missing.
 */
import type {
  JourneyEvent,
  JourneyItineraryItem,
  JourneyPhase,
  JourneyWatch,
} from "../api/types";
import { airlineDisplayName } from "@/core/lib/airlines";
import { formatFlightNumber } from "@/features/checkout/lib/ticketDocument";
import { eventTone, type EventTone } from "./journeyFormat";

const HOUR_MS = 3_600_000;
/**
 * Most carriers open online check-in 24h before departure. The API carries no
 * per-airline window, so the step says "usually" rather than stating a fact.
 */
const CHECK_IN_LEAD_HOURS = 24;
/** Live events shown inline on the timeline (newest kept). */
const MAX_TIMELINE_EVENTS = 8;

const TICKETED_STATUSES = new Set(["TICKETED", "ACTIVE", "COMPLETED"]);
const CLOSED_STATUSES: Record<string, string> = {
  CANCELLED: "Booking cancelled",
  REFUNDED: "Booking refunded",
};

export type JourneyStep = {
  key: string;
  title: string;
  /** Display time, e.g. "Thu 26 Nov · 15:10". Null when the data has no time. */
  when: string | null;
  note?: string | null;
  tone: EventTone;
  done: boolean;
  /** The first step that is not done yet — rendered as the "next" marker. */
  next?: boolean;
  /** Link for steps whose detail lives on another page (e.g. the e-ticket). */
  href?: string;
  /** Instant in ms used only for ordering / done-ness. */
  at: number;
};

// ── Time helpers ────────────────────────────────────────────────────────────

const DAY_FMT: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" };

/** Airport-local wall clock as a pseudo-UTC instant (exact for display, approximate for ordering). */
function wallClock(date: string | null | undefined, time: string | null | undefined): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date ?? "");
  if (!m) return null;
  const t = /^(\d{1,2}):(\d{2})/.exec(time ?? "");
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), t ? Number(t[1]) : 0, t ? Number(t[2]) : 0);
}

function formatWallClock(ms: number, withTime: boolean): string {
  const d = new Date(ms);
  const day = d.toLocaleDateString("en-GB", { ...DAY_FMT, timeZone: "UTC" });
  if (!withTime) return day;
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${day} · ${hh}:${mm}`;
}

function parseInstant(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/** Instant in the viewer's own timezone (used for events, which are server timestamps). */
export function formatInstant(iso: string | null | undefined): string | null {
  const ms = parseInstant(iso);
  if (ms == null) return null;
  const d = new Date(ms);
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${d.toLocaleDateString("en-GB", DAY_FMT)} · ${time}`;
}

/** A local airport moment: display label from wall clock, ordering from the absolute instant when known. */
function moment(
  date: string | null | undefined,
  time: string | null | undefined,
  iso: string | null | undefined,
  shiftHours = 0,
): { label: string | null; at: number | null } {
  const shift = shiftHours * HOUR_MS;
  const wall = wallClock(date, time);
  const abs = parseInstant(iso);
  if (wall != null) {
    return { label: formatWallClock(wall - shift, Boolean(time)), at: (abs ?? wall) - shift };
  }
  if (abs != null) {
    const shifted = new Date(abs - shift).toISOString();
    return { label: formatInstant(shifted), at: abs - shift };
  }
  return { label: null, at: null };
}

// ── Headline ────────────────────────────────────────────────────────────────

export type JourneyHeadline = {
  /** "LHE → DXB", "LHE → DXB → IST", or the hotel name for a stay. */
  route: string;
  /** "Gulf Air · GF765 · Booking PAHETV" */
  sub: string;
  /** "26 Nov" — first travel day, for the refunds card. */
  shortDate: string | null;
  ref: string | null;
  isStay: boolean;
};

function flightsOf(w: JourneyWatch): JourneyItineraryItem[] {
  return (w.itinerary ?? []).filter((i) => i.kind === "FLIGHT");
}

export function journeyHeadline(w: JourneyWatch): JourneyHeadline {
  const flights = flightsOf(w);
  const stay = (w.itinerary ?? []).find((i) => i.kind === "HOTEL") ?? null;
  const isStay = flights.length === 0 && stay != null;
  const summary = w.summary;
  const first = flights[0];
  const last = flights[flights.length - 1];
  const ref = w.booking?.ticketRef || null;

  let route: string;
  if (isStay) {
    route = stay?.hotelName || stay?.city || "Hotel stay";
  } else if (summary?.tripType === "multi_city" && summary.stops.length > 2) {
    route = summary.stops.join(" → ");
  } else {
    const origin = first?.origin;
    // A round trip reads as its outbound leg; the return shows on the timeline.
    const destination = summary?.tripType === "round_trip" ? first?.destination : last?.destination;
    route = origin && destination ? `${origin} → ${destination}` : w.flightNumber || "Your trip";
  }

  const carrierCode = summary?.carrier || first?.carrier || null;
  const rawFlight = w.flightNumber || first?.flightNumber || null;
  const flightNo = rawFlight ? formatFlightNumber(first?.carrier ?? "", rawFlight) : null;
  const sub = [
    !isStay && carrierCode ? airlineDisplayName(carrierCode) : null,
    !isStay ? flightNo : stay?.city || null,
    ref ? `Booking ${ref}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const firstDay = isStay ? stay?.checkInDate?.slice(0, 10) : first?.departDate;
  const firstWall = wallClock(firstDay, null);
  const firstAbs = parseInstant(w.departAt);
  const shortDate =
    firstWall != null
      ? new Date(firstWall).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })
      : firstAbs != null
        ? new Date(firstAbs).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
        : null;

  return { route, sub, shortDate, ref, isStay };
}

// ── Status tag ──────────────────────────────────────────────────────────────

export type JourneyTag = { label: string; variant: "accent" | "success" | "muted" | "warn" };

export function journeyTag(phase: JourneyPhase | undefined, status: string): JourneyTag {
  switch (phase) {
    case "UPCOMING":
      return { label: "Upcoming", variant: "accent" };
    case "IN_PROGRESS":
      return { label: "Travelling", variant: "success" };
    case "COMPLETED":
      return { label: "Completed", variant: "muted" };
    case "CANCELLED":
      return { label: "Cancelled", variant: "warn" };
    case "PAUSED":
      return { label: "Paused", variant: "muted" };
    default:
      return { label: status.replace(/_/g, " ").toLowerCase(), variant: "muted" };
  }
}

// ── Timeline ────────────────────────────────────────────────────────────────

function liveNote(w: JourneyWatch): string | null {
  const snap = w.liveFlight?.confirmed ? w.liveFlight.snapshot : null;
  if (!snap) return null;
  return (
    [
      typeof snap.minutesDelayed === "number" && snap.minutesDelayed > 0
        ? `Delayed ${snap.minutesDelayed} min`
        : null,
      snap.terminal ? `Terminal ${String(snap.terminal)}` : null,
      snap.gate ? `Gate ${String(snap.gate)}` : null,
    ]
      .filter(Boolean)
      .join(" · ") || null
  );
}

function eventStep(ev: JourneyEvent): JourneyStep | null {
  const at = parseInstant(ev.createdAt);
  if (at == null) return null;
  return {
    key: `event-${ev.id}`,
    title: ev.title,
    when: formatInstant(ev.createdAt),
    note: ev.body ?? null,
    tone: eventTone(ev.type, ev.severity),
    done: true,
    at,
  };
}

/**
 * Ticket issued → (per flight leg) check-in opens, departs, lands → hotel check-in/out,
 * with recorded journey events (gate change, delay, …) merged in time order.
 */
export function buildJourneySteps(w: JourneyWatch, now: number = Date.now()): JourneyStep[] {
  const steps: JourneyStep[] = [];
  const bookingStatus = w.booking?.status ?? null;
  const ticketed = bookingStatus == null || TICKETED_STATUSES.has(bookingStatus) || bookingStatus in CLOSED_STATUSES;
  const cancelled = w.phase === "CANCELLED" || (bookingStatus != null && bookingStatus in CLOSED_STATUSES);

  steps.push({
    key: "ticketed",
    // The API carries no ticketing timestamp, so this step links to the e-ticket instead of a date.
    title: ticketed ? "Ticket issued" : "Awaiting ticket",
    when: null,
    note: ticketed ? null : "Your booking is not ticketed yet.",
    href: ticketed && w.bookingId ? `/checkout/${w.bookingId}` : undefined,
    tone: "calm",
    done: ticketed,
    at: Number.NEGATIVE_INFINITY,
  });

  const flights = flightsOf(w);
  const live = liveNote(w);

  if (flights.length > 0) {
    flights.forEach((leg, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === flights.length - 1;
      const departIso = leg.departAt ?? (isFirst ? w.departAt : null);
      const arriveIso = leg.arriveAt ?? (isLast ? w.arriveAt : null);
      const depart = moment(leg.departDate, leg.departTimeLocal, departIso);
      const arrive = moment(leg.arriveDate, leg.arriveTimeLocal, arriveIso);
      const checkIn = moment(leg.departDate, leg.departTimeLocal, departIso, CHECK_IN_LEAD_HOURS);
      const suffix = flights.length > 1 ? `-${idx}` : "";

      if (checkIn.at != null) {
        steps.push({
          key: `checkin${suffix}`,
          title: "Check-in opens",
          when: checkIn.label,
          note: isFirst ? "Usually 24h before departure — airline rules vary" : null,
          tone: "calm",
          done: checkIn.at <= now,
          at: checkIn.at,
        });
      }
      if (depart.at != null) {
        steps.push({
          key: `depart${suffix}`,
          title: leg.origin ? `Departs ${leg.origin}` : "Departs",
          when: depart.label,
          note: isFirst ? live : null,
          tone: isFirst && live?.startsWith("Delayed") ? "attention" : "calm",
          done: depart.at <= now,
          at: depart.at,
        });
      }
      if (arrive.at != null) {
        steps.push({
          key: `arrive${suffix}`,
          title: leg.destination ? `Lands ${leg.destination}` : "Lands",
          when: arrive.label,
          tone: "calm",
          done: arrive.at <= now,
          at: arrive.at,
        });
      }
    });
  } else if (!(w.itinerary ?? []).some((i) => i.kind === "HOTEL")) {
    // Older watches without itinerary detail: fall back to the watch's own instants.
    const depart = parseInstant(w.departAt);
    const arrive = parseInstant(w.arriveAt);
    if (depart != null) {
      steps.push({
        key: "depart",
        title: w.flightNumber ? `${w.flightNumber} departs` : "Departs",
        when: formatInstant(w.departAt),
        note: live,
        tone: "calm",
        done: depart <= now,
        at: depart,
      });
    }
    if (arrive != null) {
      steps.push({
        key: "arrive",
        title: "Lands",
        when: formatInstant(w.arriveAt),
        tone: "calm",
        done: arrive <= now,
        at: arrive,
      });
    }
  }

  (w.itinerary ?? [])
    .filter((i) => i.kind === "HOTEL")
    .forEach((stay, idx) => {
      const name = stay.hotelName || "hotel";
      const inAt = wallClock(stay.checkInDate?.slice(0, 10), null);
      const outAt = wallClock(stay.checkOutDate?.slice(0, 10), null);
      if (inAt != null) {
        steps.push({
          key: `hotel-in-${idx}`,
          title: `Check in at ${name}`,
          when: formatWallClock(inAt, false),
          tone: "calm",
          done: inAt <= now,
          at: inAt,
        });
      }
      if (outAt != null) {
        steps.push({
          key: `hotel-out-${idx}`,
          title: `Check out of ${name}`,
          when: formatWallClock(outAt, false),
          tone: "calm",
          done: outAt <= now,
          at: outAt,
        });
      }
    });

  // Server returns events newest-first; keep the most recent few.
  const events = [...(w.events ?? [])]
    .sort((a, b) => (parseInstant(b.createdAt) ?? 0) - (parseInstant(a.createdAt) ?? 0))
    .slice(0, MAX_TIMELINE_EVENTS);
  for (const ev of events) {
    const step = eventStep(ev);
    if (step) steps.push(step);
  }

  if (cancelled) {
    steps.push({
      key: "closed",
      title: (bookingStatus && CLOSED_STATUSES[bookingStatus]) || "Trip cancelled",
      when: null,
      tone: "critical",
      done: true,
      at: Number.POSITIVE_INFINITY,
    });
  }

  // Equal check avoids Infinity − Infinity = NaN for the pinned first/last steps.
  steps.sort((a, b) => (a.at === b.at ? 0 : a.at - b.at));

  if (!cancelled) {
    const next = steps.find((s) => !s.done);
    if (next) next.next = true;
  }
  return steps;
}
