import { useParams } from "react-router-dom";
import { AgencyCard } from "@/components/agencies/AgencyCard";
import { AsyncState } from "@/components/shared/AsyncState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAsyncData } from "@/hooks/useAsyncData";
import { cityService } from "@/services/cityService";

export function CityDetailsPage() {
  const { cityId = "" } = useParams();
  const cityQuery = useAsyncData(() => cityService.getCityById(cityId), [cityId]);
  const agenciesQuery = useAsyncData(() => cityService.getCityAgencies(cityId), [cityId]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="City details"
        title={`${cityQuery.data?.name ?? "City"} agencies`}
        subtitle={`${cityQuery.data?.region ?? ""} · Explore every agency operating in this city with verified business metrics.`}
      />

      <AsyncState
        loading={agenciesQuery.loading}
        error={agenciesQuery.error}
        isEmpty={!agenciesQuery.data?.length}
        emptyMessage="No agencies found for this city."
        onRetry={agenciesQuery.reload}
      >
        <div className="grid gap-5 xl:grid-cols-2">
          {(agenciesQuery.data ?? []).map((agency) => (
            <AgencyCard key={agency.id} agency={agency} />
          ))}
        </div>
      </AsyncState>
    </div>
  );
}
