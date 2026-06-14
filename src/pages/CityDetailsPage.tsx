import { useParams } from "react-router-dom";
import { AgencyCard } from "@/components/agencies/AgencyCard";
import { AsyncState } from "@/components/shared/AsyncState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntityNotFound } from "@/pages/NotFoundPage";
import { useAsyncData } from "@/hooks/useAsyncData";
import { cityService } from "@/services/cityService";

export function CityDetailsPage() {
  const { cityId = "" } = useParams();
  const cityQuery = useAsyncData(() => cityService.getCityById(cityId), [cityId]);
  const agenciesQuery = useAsyncData(() => cityService.getCityAgencies(cityId), [cityId]);
  const city = cityQuery.data;

  if (!cityId) {
    return <EntityNotFound entity="ressource" description="L'identifiant de la ville est manquant." />;
  }

  return (
    <AsyncState loading={cityQuery.loading} error={cityQuery.error}>
      {city ? (
        <div className="space-y-6">
          <PageHeader
            eyebrow="City details"
            title={`${city.name} agencies`}
            subtitle={`${city.region} · Explore every agency operating in this city with verified business metrics.`}
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
      ) : (
        <EntityNotFound entity="ressource" description="Cette ville n'existe pas ou n'est plus accessible." />
      )}
    </AsyncState>
  );
}
