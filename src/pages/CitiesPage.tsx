import { CityCardsGrid } from "@/components/cities/CityCardsGrid";
import { PageHeader } from "@/components/shared/PageHeader";
import { AsyncState } from "@/components/shared/AsyncState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { cityService } from "@/services/cityService";

export function CitiesPage() {
  const { data, loading, error, reload } = useAsyncData(() => cityService.listCities(), []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Coverage"
        title="Moroccan cities"
        subtitle="Compare city-level supply, reservations, and traffic with a clean card view designed for quick scanning."
      />
      <AsyncState
        loading={loading}
        error={error}
        isEmpty={!data?.length}
        emptyMessage="No cities found yet."
        onRetry={reload}
      >
        <CityCardsGrid cities={data ?? []} />
      </AsyncState>
    </div>
  );
}
