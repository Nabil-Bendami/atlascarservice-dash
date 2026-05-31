import { AgencyCard } from "@/components/agencies/AgencyCard";
import { AsyncState } from "@/components/shared/AsyncState";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAsyncData } from "@/hooks/useAsyncData";
import { agencyService } from "@/services/agencyService";

export function AgenciesPage() {
  const { data, loading, error, reload } = useAsyncData(() => agencyService.listAgencies(), []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agencies"
        title="Agency management"
        subtitle="A clean operational overview of all agencies, their activity, verification status, and commercial performance."
      />

      <AsyncState
        loading={loading}
        error={error}
        isEmpty={!data?.length}
        emptyMessage="No agencies found."
        onRetry={reload}
      >
        <div className="grid gap-5 xl:grid-cols-2">
          {(data ?? []).map((agency) => (
            <AgencyCard key={agency.id} agency={agency} />
          ))}
        </div>
      </AsyncState>
    </div>
  );
}
