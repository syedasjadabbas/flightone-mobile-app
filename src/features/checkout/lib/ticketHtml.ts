import { airlineDisplayName } from "@/core/lib/airlines";
import { airportLabel, iataToPlace } from "@/core/lib/places";
import { formatMinor } from "./checkoutDisplay";
import type { HotelStay } from "./hotelStay";
import { formatDuration, formatFlightNumber, formatTicketDate, type TicketDocument, type TicketSegment } from "./ticketDocument";

/**
 * Printable e-ticket / hotel voucher as one self-contained HTML page (no network
 * assets), turned into a PDF by expo-print. Laid out like the web's ticket
 * (`client/app/checkout/[bookingId]/_components/TicketDocumentView.tsx`):
 * brand header with PNR and status, route banner, flight sectors, passenger and
 * fare, a barcode strip and travel notes.
 */

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Deterministic barcode-style strip from the reference (decorative, like the web's). */
function barcode(code: string): string {
  const seed = (code || "FLIGHTONE").toUpperCase();
  const bars: string[] = [];
  Array.from(seed).forEach((ch, i) => {
    const v = ch.charCodeAt(0) + i * 7;
    for (const w of [(v % 3) + 1, ((v >> 1) % 4) + 1, ((v >> 2) % 2) + 1]) {
      bars.push(`<i style="width:${w * 1.6}px"></i><b></b>`);
    }
  });
  return `<div class="barcode"><div class="bars">${bars.slice(0, 120).join("")}</div><span>${esc(seed)}</span></div>`;
}

function sector(s: TicketSegment, last: boolean): string {
  const nextDay = s.arrivalDate && s.departureDate && s.arrivalDate !== s.departureDate;
  const layover = !last ? formatDuration(s.layoverMinutesAfter) : null;
  return `
  <div class="sector">
    <div class="sector-head">
      <div><strong>${esc(airlineDisplayName(s.carrier))}</strong> <span class="muted">${esc(formatFlightNumber(s.carrier, s.flightNumber))}</span></div>
      <span class="pill">${s.bookingClass ? `Class ${esc(s.bookingClass)}` : "Confirmed"}</span>
    </div>
    <div class="leg">
      <div class="stop">
        <div class="time">${esc(s.departTimeLocal)}</div>
        <div class="code">${esc(s.originCode)} <span class="city">${esc(iataToPlace(s.originCode))}</span></div>
        <div class="muted small">${esc(airportLabel(s.originCode))}</div>
        <div class="muted small">${esc(formatTicketDate(s.departureDate) ?? s.departureDate)}</div>
      </div>
      <div class="mid">
        <div class="track"><span class="dot"></span><span class="line"></span><span class="plane">&#9992;</span><span class="line"></span><span class="dot"></span></div>
        <div class="muted small">${esc(formatDuration(s.durationMinutes) ?? "")}</div>
      </div>
      <div class="stop right">
        <div class="time">${esc(s.arriveTimeLocal)}${nextDay ? ` <sup>+1</sup>` : ""}</div>
        <div class="code"><span class="city">${esc(iataToPlace(s.destinationCode))}</span> ${esc(s.destinationCode)}</div>
        <div class="muted small">${esc(airportLabel(s.destinationCode))}</div>
        <div class="muted small">${esc(formatTicketDate(s.arrivalDate) ?? s.arrivalDate)}</div>
      </div>
    </div>
    ${layover ? `<div class="layover">&#9201; Connection in ${esc(iataToPlace(s.destinationCode))} (${esc(s.destinationCode)}) · ${esc(layover)} layover</div>` : ""}
  </div>`;
}

const STYLE = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 28px; font-family: -apple-system, "Helvetica Neue", Roboto, Arial, sans-serif; color: #0b1219; background: #f2f6fa; }
  .ticket { max-width: 720px; margin: 0 auto; background: #fff; border-radius: 22px; overflow: hidden; border: 1px solid #e3e8ee; }
  .head { background: linear-gradient(135deg, #1d2a38 0%, #0b1219 60%, #10354a 100%); color: #fff; padding: 26px 28px; display: flex; justify-content: space-between; gap: 20px; }
  .brand { font-weight: 800; font-size: 24px; letter-spacing: 2px; }
  .brand span { color: #7fd3f7; }
  .brand-sub { color: rgba(255,255,255,.65); font-size: 12px; margin-top: 4px; letter-spacing: .5px; }
  .refs { text-align: right; }
  .label { font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase; color: rgba(255,255,255,.55); font-weight: 700; }
  .pnr { font-size: 30px; font-weight: 800; letter-spacing: 3px; margin: 2px 0 8px; }
  .status { display: inline-block; font-size: 10px; font-weight: 800; letter-spacing: 1px; padding: 3px 9px; border-radius: 999px; background: rgba(123,227,176,.16); color: #7be3b0; }
  .status.demo { background: rgba(255,210,122,.16); color: #ffd27a; }
  .tkt { font-size: 14px; font-weight: 700; margin-top: 6px; letter-spacing: 1px; }
  .perf { height: 22px; position: relative; border-bottom: 2px dashed #e3e8ee; margin: 0 22px; }
  .route { display: flex; align-items: center; gap: 16px; padding: 22px 28px 6px; }
  .route .end { flex: 0 0 auto; }
  .route .end.right { text-align: right; }
  .big { font-size: 40px; font-weight: 800; letter-spacing: 1px; }
  .route .mid { flex: 1; text-align: center; color: #0a86c0; }
  .route .rline { border-top: 2px dashed #b9d7e7; position: relative; margin: 8px 0; }
  .route .rplane { position: relative; top: -14px; background: #fff; padding: 0 8px; font-size: 18px; }
  .type { font-size: 11px; font-weight: 700; color: #0a86c0; background: #e6f3fa; padding: 3px 10px; border-radius: 999px; display: inline-block; }
  .muted { color: #55606e; }
  .small { font-size: 12px; }
  .section { padding: 14px 28px; }
  .section h3 { font-size: 11px; letter-spacing: 1.2px; text-transform: uppercase; color: #8a94a3; margin: 10px 0; }
  .sector { border: 1px solid #e3e8ee; border-radius: 14px; padding: 14px 16px; margin-bottom: 12px; }
  .sector-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 14px; }
  .pill { font-size: 10px; font-weight: 700; color: #11845b; background: #e7f5ee; padding: 3px 8px; border-radius: 999px; }
  .leg { display: flex; gap: 12px; align-items: flex-start; }
  .stop { flex: 0 0 34%; }
  .stop.right { text-align: right; }
  .time { font-size: 22px; font-weight: 800; }
  .time sup { font-size: 10px; color: #b26a00; }
  .code { font-size: 15px; font-weight: 700; margin: 2px 0; }
  .city { font-weight: 500; color: #55606e; }
  .leg .mid { flex: 1; text-align: center; padding-top: 8px; }
  .track { display: flex; align-items: center; gap: 4px; color: #0a86c0; }
  .track .line { flex: 1; border-top: 2px solid #b9d7e7; }
  .track .dot { width: 8px; height: 8px; border-radius: 50%; border: 2px solid #0a86c0; }
  .layover { margin-top: 10px; font-size: 12px; color: #8a5a00; background: #fdf1dc; border-radius: 10px; padding: 7px 10px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .card { background: #f6f9fc; border-radius: 12px; padding: 12px 14px; }
  .card .k { font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #8a94a3; font-weight: 700; }
  .card .v { font-size: 15px; font-weight: 700; margin-top: 3px; }
  .fare { display: flex; justify-content: space-between; font-size: 13px; color: #55606e; padding: 3px 0; }
  .fare.total { font-size: 18px; color: #0b1219; font-weight: 800; border-top: 1px solid #e3e8ee; margin-top: 6px; padding-top: 10px; }
  .barcode { text-align: center; padding: 6px 28px 4px; }
  .bars { display: flex; justify-content: center; height: 46px; }
  .bars i { display: block; background: #0b1219; height: 100%; }
  .bars b { display: block; width: 1.6px; }
  .barcode span { font-size: 11px; letter-spacing: 3px; color: #55606e; }
  .notes { font-size: 11px; color: #55606e; line-height: 1.55; padding: 8px 28px 22px; }
  .notes li { margin-bottom: 3px; }
  .demo-ribbon { margin: 14px 28px 0; background: #fdf1dc; color: #8a5a00; font-size: 12px; font-weight: 600; padding: 9px 12px; border-radius: 10px; }
  .foot { text-align: center; font-size: 10px; color: #8a94a3; padding: 0 0 22px; }
`;

function page(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${esc(title)}</title><style>${STYLE}</style></head><body>${body}</body></html>`;
}

/** Flight e-ticket. */
export function flightTicketHtml(t: TicketDocument, opts: { bookingRef: string; issuedAt?: string | null }): string {
  const origin = t.originCode || t.segments[0]?.originCode || "";
  const dest = t.destinationCode || t.segments[t.segments.length - 1]?.destinationCode || "";
  const tripType = t.isMultiCity ? "Multi-city" : t.isRoundTrip || t.returnSegments.length ? "Round trip" : "One way";
  const tickets = t.ticketNumbers.length ? t.ticketNumbers.join(" · ") : "Pending";
  const issued = t.issuedAt || opts.issuedAt;

  const bound = (label: string, segs: TicketSegment[]) =>
    segs.length ? `<div class="section"><h3>${esc(label)}</h3>${segs.map((s, i) => sector(s, i === segs.length - 1)).join("")}</div>` : "";

  const legs =
    t.legs && t.legs.length > 1
      ? t.legs.map((l) => bound(`${l.label} · ${l.originCode} → ${l.destinationCode}`, l.segments)).join("")
      : bound(t.returnSegments.length ? "Outbound" : "Flight", t.segments) + bound("Return", t.returnSegments);

  const body = `
  <div class="ticket">
    <div class="head">
      <div>
        <div class="brand">FLIGHT<span>ONE</span></div>
        <div class="brand-sub">Electronic ticket · ${esc(tripType)}</div>
        ${issued ? `<div class="brand-sub">Issued ${esc(new Date(issued).toLocaleString("en-GB"))}</div>` : ""}
      </div>
      <div class="refs">
        <div class="label">Booking ref / PNR</div>
        <div class="pnr">${esc(t.pnr ?? "—")}</div>
        <span class="status ${t.demo ? "demo" : ""}">${t.demo ? "DEMO TICKET" : "CONFIRMED"}</span>
        <div class="label" style="margin-top:12px">E-ticket number</div>
        <div class="tkt">${esc(tickets)}</div>
      </div>
    </div>
    ${t.demo ? `<div class="demo-ribbon">Demo fare: issued locally with a DEMO reference, not sent to an airline.</div>` : ""}
    <div class="route">
      <div class="end"><div class="big">${esc(origin)}</div><div class="muted">${esc(iataToPlace(origin))}</div></div>
      <div class="mid"><div class="rline"><span class="rplane">&#9992;</span></div><span class="type">${esc(tripType)}</span></div>
      <div class="end right"><div class="big">${esc(dest)}</div><div class="muted">${esc(iataToPlace(dest))}</div></div>
    </div>
    <div class="perf"></div>
    ${legs}
    <div class="section">
      <h3>Passenger & fare</h3>
      <div class="grid">
        <div class="card"><div class="k">Passenger</div><div class="v">${esc(t.passengerName || "—")}</div><div class="muted small">Adult</div></div>
        <div class="card"><div class="k">Cabin</div><div class="v">${esc(t.cabin ? t.cabin.charAt(0).toUpperCase() + t.cabin.slice(1) : "—")}</div>${t.baggage ? `<div class="muted small">Baggage ${esc(t.baggage)}</div>` : ""}</div>
      </div>
      <div style="margin-top:12px">
        ${t.baseMinor != null ? `<div class="fare"><span>Fare</span><span>${esc(formatMinor(t.baseMinor, t.currency))}</span></div>` : ""}
        ${t.taxesMinor != null ? `<div class="fare"><span>Taxes & fees</span><span>${esc(formatMinor(t.taxesMinor, t.currency))}</span></div>` : ""}
        <div class="fare total"><span>Total paid</span><span>${esc(formatMinor(t.totalMinor, t.currency))}</span></div>
      </div>
    </div>
    ${barcode(t.pnr || opts.bookingRef)}
    <ul class="notes">
      <li>Check in online with the airline 24–48 hours before departure, using the booking reference above.</li>
      <li>Arrive at the airport at least 3 hours before international departures. Carry a passport valid for 6 months and any visas needed.</li>
      <li>Names must match your passport exactly. Live flight updates are in the FlightOne app under Trips.</li>
    </ul>
    <div class="foot">FlightOne · Booking ${esc(opts.bookingRef)}</div>
  </div>`;
  return page(`FlightOne e-ticket ${t.pnr ?? opts.bookingRef}`, body);
}

/** Hotel booking voucher. */
export function hotelVoucherHtml(stay: HotelStay, opts: { bookingRef: string; confirmation: string | null; currency: string; amountMinor: number }): string {
  const body = `
  <div class="ticket">
    <div class="head">
      <div>
        <div class="brand">FLIGHT<span>ONE</span></div>
        <div class="brand-sub">Hotel voucher</div>
      </div>
      <div class="refs">
        <div class="label">Confirmation</div>
        <div class="pnr">${esc(opts.confirmation ?? opts.bookingRef)}</div>
        <span class="status">CONFIRMED</span>
      </div>
    </div>
    <div class="section">
      <h3>Stay</h3>
      <div class="sector">
        <div class="sector-head"><strong>${esc(stay.hotelName)}</strong><span class="pill">${esc(stay.nights ? `${stay.nights} night${stay.nights > 1 ? "s" : ""}` : "Confirmed")}</span></div>
        <div class="muted small">${esc([stay.area, stay.city].filter(Boolean).join(", "))}</div>
        <div class="grid" style="margin-top:12px">
          <div class="card"><div class="k">Check-in</div><div class="v">${esc(formatTicketDate(stay.checkInDate) ?? stay.checkInDate ?? "—")}</div></div>
          <div class="card"><div class="k">Check-out</div><div class="v">${esc(formatTicketDate(stay.checkOutDate) ?? stay.checkOutDate ?? "—")}</div></div>
        </div>
        ${stay.roomType ? `<div class="muted small" style="margin-top:10px">${esc(stay.roomType)}</div>` : ""}
      </div>
      <div class="fare total"><span>Total paid</span><span>${esc(formatMinor(opts.amountMinor, opts.currency))}</span></div>
    </div>
    ${barcode(opts.confirmation || opts.bookingRef)}
    <ul class="notes"><li>Show this voucher and a photo ID at check-in.</li></ul>
    <div class="foot">FlightOne · Booking ${esc(opts.bookingRef)}</div>
  </div>`;
  return page(`FlightOne hotel voucher ${opts.confirmation ?? opts.bookingRef}`, body);
}
