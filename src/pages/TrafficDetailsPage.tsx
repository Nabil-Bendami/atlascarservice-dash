import { useParams } from "react-router-dom";
import { AsyncState } from "@/components/shared/AsyncState";
import { CityTrafficDashboard } from "@/components/traffic/CityTrafficDashboard";
import { useAsyncData } from "@/hooks/useAsyncData";
import { trafficService } from "@/services/trafficService";

export function TrafficDetailsPage() {
  const { cityId = "" } = useParams();
  const metricQuery = useAsyncData(() => trafficService.getCityTraffic(cityId), [cityId]);
  const chartsQuery = useAsyncData(() => trafficService.getCityTrafficCharts(cityId), [cityId]);

  return (
    <AsyncState loading={metricQuery.loading || chartsQuery.loading} error={metricQuery.error ?? chartsQuery.error}>
      {metricQuery.data && chartsQuery.data ? (
        <CityTrafficDashboard
          metric={metricQuery.data}
          trend={chartsQuery.data.trend}
          channelMix={chartsQuery.data.channelMix}
        />
      ) : null}
    </AsyncState>
  );
}
