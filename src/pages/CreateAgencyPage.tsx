import { PageHeader } from "@/components/shared/PageHeader";
import { AddAgencyForm } from "@/components/forms/AddAgencyForm";

export function CreateAgencyPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agencies"
        title="Create a new agency"
        subtitle="Set up account access, agency branding, contact details, location, and permissions in one clean onboarding form."
      />
      <AddAgencyForm />
    </div>
  );
}
