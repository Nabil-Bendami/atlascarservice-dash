import type { City } from "@/types";
import { CityCard } from "@/components/cities/CityCard";

export function CityCardsGrid({ cities }: { cities: City[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {cities.map((city) => <CityCard key={city.id} city={city} />)}
    </div>
  );
}
