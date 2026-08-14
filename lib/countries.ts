export const COUNTRIES = [
  { code: 'PH', name: 'Philippines', city: 'Manila', flag: '🇵🇭' },
  { code: 'US', name: 'United States', city: 'New York', flag: '🇺🇸' },
  { code: 'AE', name: 'UAE', city: 'Dubai', flag: '🇦🇪' },
  { code: 'SG', name: 'Singapore', city: 'Singapore', flag: '🇸🇬' },
  { code: 'GB', name: 'United Kingdom', city: 'London', flag: '🇬🇧' },
  { code: 'AU', name: 'Australia', city: 'Sydney', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', city: 'Toronto', flag: '🇨🇦' },
  { code: 'JP', name: 'Japan', city: 'Tokyo', flag: '🇯🇵' },
  { code: 'DE', name: 'Germany', city: 'Berlin', flag: '🇩🇪' },
  { code: 'MY', name: 'Malaysia', city: 'Kuala Lumpur', flag: '🇲🇾' },
  { code: 'TH', name: 'Thailand', city: 'Bangkok', flag: '🇹🇭' },
  { code: 'NG', name: 'Nigeria', city: 'Lagos', flag: '🇳🇬' },
  { code: 'BR', name: 'Brazil', city: 'São Paulo', flag: '🇧🇷' },
  { code: 'KR', name: 'South Korea', city: 'Seoul', flag: '🇰🇷' },
  { code: 'IN', name: 'India', city: 'Mumbai', flag: '🇮🇳' },
] as const;

export type Country = (typeof COUNTRIES)[number];

export function getCountry(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

export function getCorridorLabel(country: Country): string {
  return `India → ${country.name}`;
}

export function getCorridorShort(country: Country): string {
  return `IN → ${country.code}`;
}
