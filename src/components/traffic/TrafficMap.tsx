import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import type { TrafficMetric } from "@/types";
import { formatCurrency, formatNumber } from "@/lib/utils";

const icon = L.divIcon({
  className: "custom-traffic-marker",
  html: `<div style="background:#5B5FEF;color:#fff;border-radius:9999px;padding:8px 10px;font-weight:700;box-shadow:0 10px 25px rgba(91,95,239,.28)">●</div>`,
});

function safeNumber(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

export function TrafficMap({
  data,
  selectedCityId,
  onSelectCity,
}: {
  data: TrafficMetric[];
  selectedCityId?: string;
  onSelectCity?: (metric: TrafficMetric) => void;
}) {
  const safeData = data
    .map((item) => ({
      ...item,
      cityId: String(item.cityId ?? ""),
      cityName: item.cityName || "All Morocco",
      region: item.region || "Morocco",
      latitude: safeNumber(item.latitude),
      longitude: safeNumber(item.longitude),
      visitors: safeNumber(item.visitors),
      reservations: safeNumber(item.reservations),
      revenue: safeNumber(item.revenue),
    }))
    .filter((item) => item.latitude >= -90 && item.latitude <= 90 && item.longitude >= -180 && item.longitude <= 180);

  return (
    <MapContainer center={[31.7917, -7.0926]} zoom={6} scrollWheelZoom className="h-[560px] rounded-[28px]">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {safeData.map((item) => (
        <Marker
          key={item.cityId}
          position={[item.latitude, item.longitude]}
          icon={icon}
          eventHandlers={{
            click: () => onSelectCity?.(item),
          }}
        >
          <Popup>
            <div className="space-y-2 text-sm text-slate-900">
              <h3 className="text-base font-bold">{item.cityName}{selectedCityId === item.cityId ? " · Selected" : ""}</h3>
              <p>{item.region}</p>
              <p>Visitors: {formatNumber(item.visitors)}</p>
              <p>Reservations: {formatNumber(item.reservations)}</p>
              <p>Revenue: {formatCurrency(item.revenue)}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
