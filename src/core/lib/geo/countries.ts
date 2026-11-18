// Copied from the web app's client/lib/geo/countries.ts — keep the two in step.
/**
 * ISO 3166-1 alpha-2 country options for nationality / passport pickers. Names come from the
 * runtime's Intl data, so there is no hand-maintained list of names to drift.
 */
const ISO2 =
  "AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW".split(" ");

/** Most FlightOne travellers' nationalities first, then everyone else A–Z. */
const PINNED = ["PK", "AE", "SA", "GB", "US"];

// Search matches the label, and travellers type the everyday name ("Turkey", not "Türkiye").
const ALSO_KNOWN_AS: Record<string, string> = {
  TR: "Turkey (Türkiye)",
  CZ: "Czech Republic (Czechia)",
  CI: "Ivory Coast (Côte d’Ivoire)",
  MM: "Myanmar (Burma)",
  SZ: "Eswatini (Swaziland)",
  CV: "Cape Verde (Cabo Verde)",
  MK: "North Macedonia",
  KR: "South Korea",
  KP: "North Korea",
};

let cached: { value: string; label: string }[] | null = null;

export function countryOptions(): { value: string; label: string }[] {
  if (cached) return cached;
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  const label = (code: string) => `${ALSO_KNOWN_AS[code] ?? names.of(code) ?? code} (${code})`;
  const rest = ISO2.filter((c) => !PINNED.includes(c)).sort((a, b) => label(a).localeCompare(label(b)));
  cached = [...PINNED, ...rest].map((code) => ({ value: code, label: label(code) }));
  return cached;
}
