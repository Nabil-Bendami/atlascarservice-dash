import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { CarCard } from "@/components/cars/CarCard";
import { ImportWizardModal } from "@/components/import/ImportWizardModal";
import { AsyncState } from "@/components/shared/AsyncState";
import { PageHeader } from "@/components/shared/PageHeader";
import { ToastNotice } from "@/components/shared/ToastNotice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { carService, type CarFilters } from "@/services/carService";
import type { Agency, Car, City } from "@/types";

export function CarsPage() {
  const [filters, setFilters] = useState<CarFilters>({});
  const [allCars, setAllCars] = useState<Car[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const managementData = await carService.getCarsManagementData();
        setAllCars(managementData.cars);
        setCities(managementData.cities);
        setAgencies(managementData.agencies);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load cars");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const cityScopedAgencies = useMemo(() => {
    if (!filters.city) return agencies;
    return agencies.filter((agency) => agency.cityId === filters.city);
  }, [agencies, filters.city]);

  useEffect(() => {
    if (!filters.agency) return;
    if (!cityScopedAgencies.some((agency) => agency.id === filters.agency)) {
      setFilters((current) => ({ ...current, agency: undefined }));
    }
  }, [cityScopedAgencies, filters.agency]);

  const filterScopedCars = useMemo(() => {
    return carService.filterCars(allCars, filters);
  }, [allCars, filters]);

  const brandOptions = useMemo(() => {
    const scopedCars = allCars.filter((car) => {
      if (filters.city && car.cityId !== filters.city) return false;
      if (filters.agency && car.agencyId !== filters.agency) return false;
      return true;
    });

    return Array.from(new Set(scopedCars.map((car) => car.brand).filter(Boolean))).sort((left, right) => left.localeCompare(right));
  }, [allCars, filters.agency, filters.city]);

  useEffect(() => {
    if (!filters.brand) return;
    if (!brandOptions.includes(filters.brand)) {
      setFilters((current) => ({ ...current, brand: undefined }));
    }
  }, [brandOptions, filters.brand]);

  const filteredCars = filterScopedCars.filter((car) => {
    const term = search.toLowerCase();
    if (!term) return true;
    return [car.brand, car.model, car.agencyName, car.cityName].some((value) => value.toLowerCase().includes(term));
  });

  const emptyMessage = allCars.length === 0 ? "No cars yet." : "No cars match these filters.";

  return (
    <div className="space-y-6">
      {notice ? <ToastNotice tone={notice.tone} message={notice.message} /> : null}
      <PageHeader
        eyebrow="Fleet"
        title="Cars management"
        subtitle="Filter and review inventory across all agencies with clean cards, availability states, and revenue performance."
        actions={
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            Import Excel
          </Button>
        }
      />
      <ImportWizardModal
        entity="cars"
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={async (successCount, failedCount) => {
          try {
            setLoading(true);
            const managementData = await carService.getCarsManagementData();
            setAllCars(managementData.cars);
            setCities(managementData.cities);
            setAgencies(managementData.agencies);
            setNotice({
              tone: successCount > 0 ? "success" : "error",
              message:
                successCount > 0
                  ? `${successCount} cars imported successfully${failedCount ? ` (${failedCount} failed rows)` : ""}.`
                  : "No cars were imported.",
            });
          } catch (reloadError) {
            console.error("[cars-page] refresh after import failed", reloadError);
            setNotice({
              tone: "error",
              message: reloadError instanceof Error ? reloadError.message : "Unable to refresh cars after import.",
            });
          } finally {
            setLoading(false);
          }
        }}
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
            items={cityScopedAgencies.map((agency) => ({ value: agency.id, label: agency.name }))}
            onChange={(value) => setFilters((current) => ({ ...current, agency: value }))}
          />
          <FilterSelect
            label="Brand"
            value={filters.brand}
            placeholder="All brands"
            items={brandOptions.map((brand) => ({ value: brand, label: brand }))}
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

      <AsyncState loading={loading} error={error} isEmpty={!filteredCars.length} emptyMessage={emptyMessage}>
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
