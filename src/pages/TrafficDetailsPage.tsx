import { useParams } from "react-router-dom";
import { AsyncState } from "@/components/shared/AsyncState";
import { CityTrafficDashboard } from "@/components/traffic/CityTrafficDashboard";
import { EntityNotFound } from "@/pages/NotFoundPage";
import { useAsyncData } from "@/hooks/useAsyncData";
import { trafficService } from "@/services/trafficService";

export function TrafficDetailsPage() {
  const { cityId = "" } = useParams();
  const metricQuery = useAsyncData(() => trafficService.getCityTraffic(cityId), [cityId]);
  const chartsQuery = useAsyncData(() => trafficService.getCityTrafficCharts(cityId), [cityId]);
  const metric = metricQuery.data;

  if (!cityId) {
    return <EntityNotFound entity="ressource" description="L'identifiant du trafic est manquant." />;
  }

  return (
    <AsyncState loading={metricQuery.loading || chartsQuery.loading} error={metricQuery.error ?? chartsQuery.error}>
      {metric && chartsQuery.data ? (
        <CityTrafficDashboard
          metric={metric}
          trend={chartsQuery.data.trend}
          channelMix={chartsQuery.data.channelMix}
        />
      ) : (
        <EntityNotFound entity="ressource" description="Ces données de trafic n'existent pas ou ne sont plus accessibles." />
      )}
    </AsyncState>
  );
}
