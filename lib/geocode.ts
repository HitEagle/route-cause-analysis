export type GeocodeResult = { name: string; lat: number; lon: number };

export async function geocode(text: string): Promise<GeocodeResult> {
  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) throw new Error("Missing GEOAPIFY_API_KEY");
  const params = new URLSearchParams({ text, apiKey, limit: "1", lang: "en" });
  const res = await fetch(
    `https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`,
  );
  if (!res.ok) throw new Error("Geocoding failed");
  type GeoapifyAutocompleteResponse = {
    features?: Array<{
      properties?: {
        formatted?: string;
        lat?: number;
        lon?: number;
      };
    }>;
  };
  const data = (await res.json()) as GeoapifyAutocompleteResponse;
  const first = data?.features?.[0];
  if (!first?.properties?.lat || !first?.properties?.lon) {
    throw new Error(`No match for ${text}`);
  }
  return {
    name: (first.properties.formatted ?? text) as string,
    lat: first.properties.lat as number,
    lon: first.properties.lon as number,
  };
}
