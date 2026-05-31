import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { CarCard } from "@/components/cars/CarCard";
import { AsyncState } from "@/components/shared/AsyncState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { carService, type CarFilters } from "@/services/carService";
import { ownerService } from "@/services/ownerService";
import type { Agency, Car, City } from "@/types";

export function CarsPage() {
  const [filters, setFilters] = useState<CarFilters>({});
  const [cars, setCars] = useState<Car[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [carData, options] = await Promise.all([carService.listCars(filters), ownerService.getFilterOptions()]);
        setCars(carData);
        setCities(options.cities);
        setAgencies(options.agencies);
        setBrands(options.brands);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load cars");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [filters]);

  const filteredCars = cars.filter((car) => {
    const term = search.toLowerCase();
    if (!term) return true;
    return [car.brand, car.model, car.agencyName, car.cityName].some((value) => value.toLowerCase().includes(term));
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fleet"
        title="Cars management"
        subtitle="Filter and review inventory across all agencies with clean cards, availability states, and revenue performance."
      />

      <Card>
        <CardHeader>
          <CardTitle>All cars</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <FilterSelect
            label="City"
            value={filters.city}
            placeholder="All cities"
            items={cities.map((city) => ({ value: city.id, label: city.name }))}
            onChange={(value) => setFilters((current) => ({ ...current, city: value }))}
          />
          <FilterSelect
            label="Agency"
            value={filters.agency}
            placeholder="All agencies"
            items={agencies.map((agency) => ({ value: agency.id, label: agency.name }))}
            onChange={(value) => setFilters((current) => ({ ...current, agency: value }))}
          />
          <FilterSelect
            label="Brand"
            value={filters.brand}
            placeholder="All brands"
            items={brands.map((brand) => ({ value: brand, label: brand }))}
            onChange={(value) => setFilters((current) => ({ ...current, brand: value }))}
          />
          <FilterSelect
            label="Availability"
            value={filters.availability}
            placeholder="All statuses"
            items={[
              { value: "available", label: "Available" },
              { value: "rented", label: "Rented" },
              { value: "maintenance", label: "Maintenance" },
            ]}
            onChange={(value) => setFilters((current) => ({ ...current, availability: value }))}
          />
          <div className="space-y-2">
            <Label>Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Brand, agency, city" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Price min</Label>
            <Input
              type="number"
              onChange={(event) => setFilters((current) => ({ ...current, priceMin: Number(event.target.value) || undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Price max</Label>
            <Input
              type="number"
              onChange={(event) => setFilters((current) => ({ ...current, priceMax: Number(event.target.value) || undefined }))}
            />
          </div>
        </CardContent>
      </Card>

      <AsyncState loading={loading} error={error} isEmpty={!filteredCars.length} emptyMessage="No cars match these filters.">
        <div className="grid gap-5">
          {filteredCars.map((car) => (
            <CarCard key={car.id} car={car} />
          ))}
        </div>
      </AsyncState>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  placeholder,
  items,
  onChange,
}: {
  label: string;
  value?: string;
  placeholder: string;
  items: { value: string; label: string }[];
  onChange: (value: string | undefined) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={(selected) => onChange(selected === "all" ? undefined : selected)}>
        <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{placeholder}</SelectItem>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
