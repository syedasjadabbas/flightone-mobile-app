/**
 * Trending destinations — same picks and photos as the web's Flights page
 * (`client/app/flights/_components/flightsData.ts` POPULAR_DESTINATIONS).
 * Prices there are recent quotes, shown with "from" and never as a guarantee.
 */
export type HomeDestination = {
  code: string;
  city: string;
  country: string;
  priceFrom: string;
  image: string;
};

export const TRENDING: HomeDestination[] = [
  {
    code: "DXB",
    city: "Dubai",
    country: "United Arab Emirates",
    priceFrom: "PKR 88,500",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=900&q=80",
  },
  {
    code: "IST",
    city: "Istanbul",
    country: "Turkey",
    priceFrom: "PKR 142,000",
    image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=900&q=80",
  },
  {
    code: "LHR",
    city: "London",
    country: "United Kingdom",
    priceFrom: "PKR 195,000",
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=900&q=80",
  },
  {
    code: "BKK",
    city: "Bangkok",
    country: "Thailand",
    priceFrom: "PKR 76,000",
    image: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=900&q=80",
  },
];

/** What a destination card asks Ava, starting from the traveller's city. */
export function destinationPrompt(origin: string, city: string): string {
  return `Best flights from ${origin} to ${city} next month`;
}
