import { useEffect, useState } from "react";
import { ArrowLeft, Home, LayoutDashboard, LockKeyhole, SearchX } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authService } from "@/services/authService";
import type { OwnerProfile } from "@/types";

type NotFoundPageProps = {
  title?: string;
  description?: string;
  variant?: "not-found" | "access-denied";
  showBackButton?: boolean;
};

export function NotFoundPage({
  title = "Page introuvable",
  description = "La page demandée n'existe pas ou a été déplacée.",
  variant = "not-found",
  showBackButton = true,
}: NotFoundPageProps) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<OwnerProfile | null>(null);

  useEffect(() => {
    let isMounted = true;

    void authService
      .getSessionProfile()
      .then((sessionProfile) => {
        if (isMounted) setProfile(sessionProfile);
      })
      .catch(() => {
        if (isMounted) setProfile(null);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const dashboardPath = profile?.role === "agency" ? "/dashboard/agence" : "/dashboard";
  const homePath = profile ? dashboardPath : "/login";
  const Icon = variant === "access-denied" ? LockKeyhole : SearchX;

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-2xl overflow-hidden">
        <CardContent className="relative p-8 text-center md:p-12">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-secondary" />
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
            <Icon className="h-8 w-8" />
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.28em] text-muted-foreground">
            {variant === "access-denied" ? "Accès" : "Erreur 404"}
          </p>
          <h1 className="mt-3 text-3xl font-extrabold text-slate-900 md:text-4xl">{title}</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-muted-foreground">{description}</p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild>
              <Link to={homePath}>
                <Home className="mr-2 h-4 w-4" />
                Retour à l'accueil
              </Link>
            </Button>
            {profile ? (
              <Button asChild variant="outline">
                <Link to={dashboardPath}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Retour au tableau de bord
                </Link>
              </Button>
            ) : null}
            {showBackButton ? (
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function EntityNotFound({
  entity = "ressource",
  description,
}: {
  entity?: "agence" | "voiture" | "réservation" | "document" | "ressource";
  description?: string;
}) {
  return (
    <NotFoundPage
      title="Page introuvable"
      description={description ?? `Cette ${entity} n'existe pas, a été supprimée ou n'est plus accessible.`}
    />
  );
}

export function AccessDeniedPage() {
  return (
    <NotFoundPage
      title="Accès refusé"
      description="Vous n'avez pas les autorisations nécessaires pour consulter cette page."
      variant="access-denied"
    />
  );
}
