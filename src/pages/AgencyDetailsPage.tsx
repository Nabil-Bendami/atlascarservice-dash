import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, ExternalLink, FileText, KeyRound, ShieldCheck, Slash } from "lucide-react";
import { useParams } from "react-router-dom";
import { AgencyDetailsPanel } from "@/components/agencies/AgencyDetailsPanel";
import { CarStatsCard } from "@/components/cars/CarStatsCard";
import { AsyncState } from "@/components/shared/AsyncState";
import { ChartCard } from "@/components/shared/ChartCard";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { ToastNotice } from "@/components/shared/ToastNotice";
import { Button } from "@/components/ui/button";
import { EntityNotFound } from "@/pages/NotFoundPage";
import { useAsyncData } from "@/hooks/useAsyncData";
import { supabase } from "@/lib/supabase";
import { agencyService } from "@/services/agencyService";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { AgencyDocument, OwnerReview } from "@/types";

function formatDocumentDate(value: string) {
  if (!value) return "Date inconnue";

  try {
    return new Date(value).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

const AGENCY_DOCUMENTS_BUCKET = "agency-documents";

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function resolveDocumentStorage(document: AgencyDocument) {
  const raw = document.raw ?? {};
  const fileUrl =
    readString(document.fileUrl) ||
    readString(raw.file_url) ||
    readString(raw.document_url) ||
    readString(raw.url) ||
    readString(raw.public_url);
  const storagePath =
    readString(document.storagePath) ||
    readString(raw.storage_path) ||
    readString(raw.file_path) ||
    readString(raw.path);
  const bucketName =
    readString(document.storageBucket) ||
    readString(raw.storage_bucket) ||
    readString(raw.bucket_name) ||
    readString(raw.bucket) ||
    AGENCY_DOCUMENTS_BUCKET;
  const filename =
    readString(document.fileName) ||
    readString(raw.filename) ||
    readString(raw.file_name) ||
    readString(raw.document_name) ||
    (storagePath ? storagePath.split("/").pop() || "" : "") ||
    (fileUrl ? fileUrl.split("/").pop() || "" : "") ||
    "document";

  return { bucketName, filename, fileUrl, storagePath };
}

async function verifyStorageObject(bucketName: string, storagePath: string) {
  const parts = storagePath.split("/");
  const fileName = parts.pop() ?? "";
  const folder = parts.join("/");

  const { data, error } = await supabase.storage.from(bucketName).list(folder, {
    limit: 100,
    search: fileName,
  });
  const exists = Boolean(data?.some((item) => item.name === fileName));

  console.log("DOCUMENT_STORAGE_VERIFY", {
    bucketName,
    storagePath,
    exists,
    error,
  });

  return { exists, error };
}

async function resolveDocumentUrl(document: AgencyDocument) {
  const { bucketName, filename, fileUrl, storagePath } = resolveDocumentStorage(document);

  console.log("STORAGE_PATH", storagePath);
  console.log("FILE_URL", fileUrl);

  if (fileUrl) {
    return { url: fileUrl, filename };
  }

  if (!storagePath) {
    throw new Error("Aucun chemin de fichier n'est disponible pour ce document.");
  }

  await verifyStorageObject(bucketName, storagePath);

  const signedResult = await supabase.storage.from(bucketName).createSignedUrl(storagePath, 3600);

  if (signedResult.error) {
    console.error("DOCUMENT_SIGNED_URL_ERROR", signedResult.error);
    const publicResult = supabase.storage.from(bucketName).getPublicUrl(storagePath);
    const publicUrl = publicResult.data.publicUrl;

    if (publicUrl) {
      return { url: publicUrl, filename };
    }

    throw new Error(signedResult.error.message || "Impossible de générer l'URL du document.");
  }

  if (!signedResult.data?.signedUrl) {
    throw new Error("Supabase n'a pas retourné d'URL signée pour ce document.");
  }

  return { url: signedResult.data.signedUrl, filename };
}

export function AgencyDetailsPage() {
  const params = useParams();
  const id = params.id ?? params.agencyId ?? "";
  const agencyId = id;
  const agencyQuery = useAsyncData(() => agencyService.getAgencyById(agencyId), [agencyId]);
  const carsQuery = useAsyncData(() => agencyService.getAgencyCars(agencyId), [agencyId]);
  const reservationsQuery = useAsyncData(() => agencyService.getAgencyReservations(agencyId), [agencyId]);
  const documentsQuery = useAsyncData(() => agencyService.getAgencyDocuments(agencyId), [agencyId]);
  const reviewsQuery = useAsyncData(() => agencyService.getAgencyReviews(agencyId), [agencyId]);
  const trafficQuery = useAsyncData(() => agencyService.getAgencyTrafficStats(agencyId), [agencyId]);

  useEffect(() => {
    console.log("OWNER_AGENCY_ID", id);
  }, [id]);

  useEffect(() => {
    if (agencyQuery.error) {
      console.error("OWNER_AGENCY_DETAILS_ERROR", agencyQuery.error);
      console.error("AGENCY_ID", agencyId);
    }
  }, [agencyId, agencyQuery.error]);

  useEffect(() => {
    console.log("OWNER_AGENCY_DATA", agencyQuery.data);
  }, [agencyQuery.data]);

  useEffect(() => {
    console.log("OWNER_AGENCY_DOCUMENTS", documentsQuery.data ?? []);
  }, [documentsQuery.data]);

  useEffect(() => {
    if (documentsQuery.error) {
      console.error("OWNER_AGENCY_DETAILS_ERROR", documentsQuery.error);
      console.error("AGENCY_ID", agencyId);
    }
  }, [agencyId, documentsQuery.error]);

  useEffect(() => {
    console.log("TRAFFIC_QUERY", trafficQuery.data ?? { totalEvents: 0 });
  }, [trafficQuery.data]);

  useEffect(() => {
    if (carsQuery.error) {
      console.error("OWNER_AGENCY_DETAILS_ERROR", carsQuery.error);
      console.error("AGENCY_ID", agencyId);
    }
  }, [agencyId, carsQuery.error]);

  useEffect(() => {
    if (reservationsQuery.error) {
      console.error("OWNER_AGENCY_DETAILS_ERROR", reservationsQuery.error);
      console.error("AGENCY_ID", agencyId);
    }
  }, [agencyId, reservationsQuery.error]);

  useEffect(() => {
    if (reviewsQuery.error) {
      console.error("OWNER_AGENCY_DETAILS_ERROR", reviewsQuery.error);
      console.error("AGENCY_ID", agencyId);
    }
  }, [agencyId, reviewsQuery.error]);

  useEffect(() => {
    if (trafficQuery.error) {
      console.error("OWNER_AGENCY_DETAILS_ERROR", trafficQuery.error);
      console.error("AGENCY_ID", agencyId);
    }
  }, [agencyId, trafficQuery.error]);

  const cars = carsQuery.error ? [] : carsQuery.data ?? [];
  const reservations = reservationsQuery.error ? [] : reservationsQuery.data ?? [];
  const documents = documentsQuery.error ? [] : documentsQuery.data ?? [];
  const reviews = reviewsQuery.error ? [] : reviewsQuery.data ?? [];
  const trafficEvents = trafficQuery.error ? 0 : trafficQuery.data?.totalEvents ?? agencyQuery.data?.views ?? 0;

  const totalDays = cars.reduce((sum, car) => sum + car.totalRentedDays, 0);
  const totalRevenue = cars.reduce((sum, car) => sum + car.estimatedRevenue, 0);
  const revenueSeries = cars.map((car) => ({
    name: `${car.brand} ${car.model}`,
    revenue: car.estimatedRevenue,
  }));

  if (!agencyId) {
    return <EntityNotFound entity="agence" description="L'identifiant de l'agence est manquant." />;
  }

  return (
    <AsyncState
      loading={agencyQuery.loading}
      error={agencyQuery.error}
    >
      {agencyQuery.data ? (
        <div className="space-y-6">
          <PageHeader
            eyebrow="Agency profile"
            title={agencyQuery.data.name}
            subtitle="A professional operational profile with commercial stats, vehicle performance, and direct management actions."
            actions={
              <>
                <Button variant="outline"><ShieldCheck className="mr-2 h-4 w-4" />Verify</Button>
                <Button variant="outline"><Slash className="mr-2 h-4 w-4" />Suspend</Button>
                <Button><KeyRound className="mr-2 h-4 w-4" />Reset password</Button>
              </>
            }
          />
          <AgencyDetailsPanel agency={agencyQuery.data} />

          <SectionError message={carsQuery.error} />

          <AgencyDocumentsCard documents={documents} loading={documentsQuery.loading} />

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Cars list" value={formatNumber(cars.length)} icon={ShieldCheck} />
            <StatCard title="Reservations" value={formatNumber(agencyQuery.data.reservationsCount)} icon={ShieldCheck} />
            <StatCard title="Rental days" value={formatNumber(totalDays)} icon={ShieldCheck} tone="secondary" />
            <StatCard title="Estimated revenue" value={formatCurrency(totalRevenue)} icon={ShieldCheck} tone="accent" />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
            <ChartCard title="Revenue by car" description="Top performing vehicles in this agency">
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueSeries}>
                    <CartesianGrid stroke="#EEF2F7" vertical={false} />
                    <XAxis dataKey="name" stroke="#94A3B8" hide />
                    <YAxis stroke="#94A3B8" />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#5B5FEF" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <Card>
              <CardContent className="grid gap-4 p-6">
                <Info label="Views" value={formatNumber(trafficEvents)} />
                <Info label="Conversion rate" value={`${agencyQuery.data.conversionRate}%`} />
                <Info label="Status" value={agencyQuery.data.status} />
                <Info label="Verification" value={agencyQuery.data.verified ? "Verified" : "Pending"} />
              </CardContent>
            </Card>
          </div>

          <DataTable
            title="Reservations"
            rows={reservations}
            columns={[
              { key: "customer", header: "Customer", render: (row) => <span className="font-semibold text-slate-900">{row.customerName}</span> },
              { key: "start", header: "Start date", render: (row) => row.startDate },
              { key: "end", header: "End date", render: (row) => row.endDate },
              { key: "days", header: "Days", render: (row) => row.days },
              { key: "total", header: "Total", render: (row) => formatCurrency(row.total) },
              { key: "status", header: "Status", render: (row) => row.status },
            ]}
          />

          <AgencyReviewsCard reviews={reviews} loading={reviewsQuery.loading} />

          <div className="grid gap-5 xl:grid-cols-2">
            {cars.map((car) => (
              <CarStatsCard key={car.id} car={car} />
            ))}
          </div>
        </div>
      ) : (
        <EntityNotFound entity="agence" description="Cette agence n'existe pas ou n'est pas visible avec votre compte." />
      )}
    </AsyncState>
  );
}

function SectionError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      Some agency details could not be loaded: {message}
    </div>
  );
}

function AgencyDocumentsCard({ documents, loading }: { documents: AgencyDocument[]; loading: boolean }) {
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  async function handleViewDocument(document: AgencyDocument) {
    console.log("VIEW_DOCUMENT", document);
    setActiveDocumentId(document.id);
    setNotice(null);
    const openedWindow = window.open("", "_blank", "noopener,noreferrer");

    try {
      const { url } = await resolveDocumentUrl(document);
      if (openedWindow) {
        openedWindow.location.href = url;
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      openedWindow?.close();
      console.error("VIEW_DOCUMENT_ERROR", error);
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Impossible d'ouvrir ce document.",
      });
    } finally {
      setActiveDocumentId(null);
    }
  }

  async function handleDownloadDocument(document: AgencyDocument) {
    console.log("DOWNLOAD_DOCUMENT", document);
    setActiveDocumentId(document.id);
    setNotice(null);

    try {
      const { filename, url } = await resolveDocumentUrl(document);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = filename;
      link.rel = "noopener noreferrer";
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    } catch (error) {
      console.error("DOWNLOAD_DOCUMENT_ERROR", error);
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Impossible de télécharger ce document.",
      });
    } finally {
      setActiveDocumentId(null);
    }
  }

  return (
    <Card>
      {notice ? <ToastNotice tone={notice.tone} message={notice.message} /> : null}
      <CardContent className="p-6">
        <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Documents</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Documents de l'agence</h2>
            <p className="mt-1 text-sm text-muted-foreground">Fichiers administratifs ajoutés par cette agence.</p>
          </div>
          <span className="rounded-full border border-border bg-slate-50 px-3 py-1 text-xs font-semibold text-muted-foreground">
            {documents.length} document(s)
          </span>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Chargement des documents...
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Aucun document ajouté par cette agence.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <th className="px-5 py-4">Nom</th>
                  <th className="px-5 py-4">Type</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Statut</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => {
                  console.log("DOCUMENT_RECORD", document);
                  const isActive = activeDocumentId === document.id;

                  return (
                    <tr key={document.id} className="border-b border-border/60 last:border-0">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-semibold text-slate-900">{document.documentName}</p>
                            <p className="text-xs text-muted-foreground">{document.fileName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{document.documentType}</td>
                      <td className="px-5 py-4 text-muted-foreground">{formatDocumentDate(document.createdAt)}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-full border border-border bg-slate-50 px-3 py-1 text-xs font-semibold text-muted-foreground">
                          {document.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isActive}
                            onClick={() => void handleViewDocument(document)}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Voir
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isActive}
                            onClick={() => void handleDownloadDocument(document)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Télécharger
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AgencyReviewsCard({ reviews, loading }: { reviews: OwnerReview[]; loading: boolean }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Reviews</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Agency reviews</h2>
            <p className="mt-1 text-sm text-muted-foreground">Customer reviews linked to this agency.</p>
          </div>
          <span className="rounded-full border border-border bg-slate-50 px-3 py-1 text-xs font-semibold text-muted-foreground">
            {reviews.length} review(s)
          </span>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Loading reviews...
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No reviews for this agency.
          </div>
        ) : (
          <div className="grid gap-3">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-2xl border border-border bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{review.rating}/5</p>
                  <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{review.status}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{review.comment || "No comment."}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
