import { useEffect, useState } from "react";
import { AgencyCard } from "@/components/agencies/AgencyCard";
import { ImportWizardModal } from "@/components/import/ImportWizardModal";
import { ToastNotice } from "@/components/shared/ToastNotice";
import { AsyncState } from "@/components/shared/AsyncState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { useAsyncData } from "@/hooks/useAsyncData";
import { agencyService } from "@/services/agencyService";
import type { Agency } from "@/types";

export function AgenciesPage() {
  const { data, loading, error, reload } = useAsyncData(() => agencyService.listAgencies(), []);
  const [updatingAgencyId, setUpdatingAgencyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  async function handleToggleBlocked(agency: Agency, nextBlockedState: boolean) {
    setUpdatingAgencyId(agency.id);
    setNotice(null);

    try {
      await agencyService.setAgencyBlockedState(agency.id, nextBlockedState);
      setNotice({
        tone: "success",
        message: nextBlockedState ? "Agency blocked successfully" : "Agency unblocked successfully",
      });
      await reload();
    } catch (toggleError) {
      console.error("[agencies-page] toggle block failed", toggleError);
      setNotice({
        tone: "error",
        message: toggleError instanceof Error ? toggleError.message : "Supabase failed to update this agency.",
      });
    } finally {
      setUpdatingAgencyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {notice ? <ToastNotice tone={notice.tone} message={notice.message} /> : null}
      <PageHeader
        eyebrow="Agencies"
        title="Agency management"
        subtitle="A clean operational overview of all agencies, their activity, verification status, and commercial performance."
        actions={
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            Import Excel
          </Button>
        }
      />
      <ImportWizardModal
        entity="agencies"
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={async (successCount, failedCount) => {
          await reload();
          setNotice({
            tone: successCount > 0 ? "success" : "error",
            message:
              successCount > 0
                ? `${successCount} agencies imported successfully${failedCount ? ` (${failedCount} failed rows)` : ""}.`
                : "No agencies were imported.",
          });
        }}
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
            <AgencyCard
              key={agency.id}
              agency={agency}
              isUpdating={updatingAgencyId === agency.id}
              onToggleBlocked={handleToggleBlocked}
            />
          ))}
        </div>
      </AsyncState>
    </div>
  );
}
