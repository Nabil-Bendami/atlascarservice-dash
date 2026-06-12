import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { AppLayout } from "@/layouts/AppLayout";

const LoginPage = lazy(() => import("@/pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const AgencyDashboardPage = lazy(() =>
  import("@/pages/AgencyDashboardPage").then((module) => ({ default: module.AgencyDashboardPage })),
);
const DashboardPage = lazy(() => import("@/pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const OwnerReservationsPage = lazy(() =>
  import("@/pages/OwnerReservationsPage").then((module) => ({ default: module.OwnerReservationsPage })),
);
const NotificationsPage = lazy(() =>
  import("@/pages/NotificationsPage").then((module) => ({ default: module.NotificationsPage })),
);
const ReviewsPage = lazy(() => import("@/pages/ReviewsPage").then((module) => ({ default: module.ReviewsPage })));
const CreateAgencyPage = lazy(() =>
  import("@/pages/CreateAgencyPage").then((module) => ({ default: module.CreateAgencyPage })),
);
const AgenciesPage = lazy(() => import("@/pages/AgenciesPage").then((module) => ({ default: module.AgenciesPage })));
const CitiesPage = lazy(() => import("@/pages/CitiesPage").then((module) => ({ default: module.CitiesPage })));
const CityDetailsPage = lazy(() =>
  import("@/pages/CityDetailsPage").then((module) => ({ default: module.CityDetailsPage })),
);
const AgencyDetailsPage = lazy(() =>
  import("@/pages/AgencyDetailsPage").then((module) => ({ default: module.AgencyDetailsPage })),
);
const CarsPage = lazy(() => import("@/pages/CarsPage").then((module) => ({ default: module.CarsPage })));
const CarDetailsPage = lazy(() =>
  import("@/pages/CarDetailsPage").then((module) => ({ default: module.CarDetailsPage })),
);
const TrafficPage = lazy(() => import("@/pages/TrafficPage").then((module) => ({ default: module.TrafficPage })));
const TrafficDetailsPage = lazy(() =>
  import("@/pages/TrafficDetailsPage").then((module) => ({ default: module.TrafficDetailsPage })),
);
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const SupabaseDebugPage = lazy(() =>
  import("@/pages/SupabaseDebugPage").then((module) => ({ default: module.SupabaseDebugPage })),
);

export function App() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading page…</div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard/agence" element={<AgencyDashboardPage />} />
          <Route
            element={
              <RoleGuard allowedRoles={["super_owner"]}>
                <AppLayout />
              </RoleGuard>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/reservations" element={<OwnerReservationsPage />} />
            <Route path="/dashboard/notifications" element={<NotificationsPage />} />
            <Route path="/dashboard/reviews" element={<ReviewsPage />} />
            <Route path="/agencies" element={<AgenciesPage />} />
            <Route path="/agencies/create" element={<CreateAgencyPage />} />
            <Route path="/cities" element={<CitiesPage />} />
            <Route path="/cities/:cityId" element={<CityDetailsPage />} />
            <Route path="/agencies/:agencyId" element={<AgencyDetailsPage />} />
            <Route path="/cars" element={<CarsPage />} />
            <Route path="/cars/:carId" element={<CarDetailsPage />} />
            <Route path="/traffic" element={<TrafficPage />} />
            <Route path="/traffic/:cityId" element={<TrafficDetailsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/debug/supabase" element={<SupabaseDebugPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
