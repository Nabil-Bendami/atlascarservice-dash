import { useEffect, useState } from "react";
import { AgencyCard } from "@/components/agencies/AgencyCard";
import { ImportWizardModal } from "@/components/import/ImportWizardModal";
import { ToastNotice } from "@/components/shared/ToastNotice";
import { AsyncState } from "@/components/shared/AsyncState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { useAsyncData } from "@/hooks/useAsyncData";
import { agencyService } from "@/services/agencyService";
import { authService } from "@/services/authService";
import type { Agency, OwnerProfile } from "@/types";

export function AgenciesPage() {
  const { data, loading, error, reload } = useAsyncData(() => agencyService.listAgencies(), []);
  const [updatingAgencyId, setUpdatingAgencyId] = useState<string | null>(null);
  const [deletingAgencyId, setDeletingAgencyId] = useState<string | null>(null);
  const [agencyToDelete, setAgencyToDelete] = useState<Agency | null>(null);
  const [deletedAgencyIds, setDeletedAgencyIds] = useState<Set<string>>(() => new Set());
  const [currentProfile, setCurrentProfile] = useState<OwnerProfile | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const canDeleteAgencies = currentProfile?.role === "super_owner" || currentProfile?.role === "admin";
  const visibleAgencies = (data ?? []).filter((agency) => !deletedAgencyIds.has(agency.id));

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    void authService
      .getSessionProfile()
      .then(setCurrentProfile)
      .catch((profileError) => {
        console.error("[agencies-page] profile load failed", profileError);
        setCurrentProfile(null);
      });
  }, []);

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

  async function handleDeleteAgency() {
    if (!agencyToDelete) return;

    setDeletingAgencyId(agencyToDelete.id);
    setNotice(null);

    try {
      await agencyService.deleteAgency(agencyToDelete);
      setDeletedAgencyIds((current) => {
        const next = new Set(current);
        next.add(agencyToDelete.id);
        return next;
      });
      setAgencyToDelete(null);
      setNotice({ tone: "success", message: "Agency deleted successfully" });
    } catch (deleteError) {
      console.error("[agencies-page] delete agency failed", deleteError);
      setNotice({
        tone: "error",
        message: deleteError instanceof Error ? deleteError.message : "Supabase failed to delete this agency.",
      });
    } finally {
      setDeletingAgencyId(null);
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
        isEmpty={!visibleAgencies.length}
        emptyMessage="No agencies found."
        onRetry={reload}
      >
        <div className="grid gap-5 xl:grid-cols-2">
          {visibleAgencies.map((agency) => (
            <AgencyCard
              key={agency.id}
              agency={agency}
              isUpdating={updatingAgencyId === agency.id}
              isDeleting={deletingAgencyId === agency.id}
              canDelete={canDeleteAgencies}
              onToggleBlocked={handleToggleBlocked}
              onDelete={setAgencyToDelete}
            />
          ))}
        </div>
      </AsyncState>

      {agencyToDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.24em] text-rose-600">Delete agency</p>
              <h2 className="text-2xl font-bold text-slate-900">Are you sure you want to permanently delete this agency?</h2>
              <p className="text-sm text-muted-foreground">
                This will permanently remove {agencyToDelete.name} and its linked cars, reservations, and reviews.
              </p>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={Boolean(deletingAgencyId)}
                onClick={() => setAgencyToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={Boolean(deletingAgencyId)}
                onClick={() => void handleDeleteAgency()}
              >
                {deletingAgencyId ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
