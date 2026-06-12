import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { ChartDatum, TrafficMetric } from "@/types";

export type TrafficSummary = {
  visitors: number;
  uniqueVisitors: number;
  searches: number;
  whatsappClicks: number;
  phoneClicks: number;
  reservations: number;
  revenue: number;
  conversion: number;
};

export type TrafficEvolutionDatum = {
  name: string;
  visitors: number;
  searches: number;
  reservations: number;
};

function safeNumber(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function safeString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function calculateConversion(reservations: number, visitors: number) {
  return visitors > 0 ? Number(((reservations / visitors) * 100).toFixed(1)) : 0;
}

function mapTrafficMetric(row: Record<string, unknown>): TrafficMetric {
  const visitors = safeNumber(row.visitors);
  const uniqueVisitors = safeNumber(row.unique_visitors ?? row.uniqueVisitors);
  const searches = safeNumber(row.searches);
  const whatsappClicks = safeNumber(row.whatsapp_clicks ?? row.whatsappClicks);
  const phoneClicks = safeNumber(row.phone_clicks ?? row.phoneClicks);
  const reservations = safeNumber(row.reservations);
  const agencies = safeNumber(row.agencies ?? row.agencies_count ?? row.agenciesCount);
  const cars = safeNumber(row.cars ?? row.cars_count ?? row.carsCount);
  const revenue = safeNumber(row.revenue);
  const conversion = safeNumber(row.conversion_rate ?? row.conversionRate) || calculateConversion(reservations, visitors);
  const selectedCity = row;

  console.log("TRAFFIC_DEBUG", {
    visitors,
    searches,
    whatsappClicks,
    phoneClicks,
    reservations,
    agencies,
    cars,
    revenue,
    conversion,
    selectedCity,
  });

  return {
    cityId: safeString(row.city_id ?? row.cityId ?? row.city_name ?? row.cityName ?? row.city, "Unknown"),
    cityName: safeString(row.city_name ?? row.cityName ?? row.name ?? row.city, "Unknown"),
    region: safeString(row.country ?? row.region, "Morocco"),
    latitude: safeNumber(row.latitude),
    longitude: safeNumber(row.longitude),
    visitors,
    uniqueVisitors,
    searches,
    carViews: safeNumber(row.car_views ?? row.carViews),
    whatsappClicks,
    phoneClicks,
    reservations,
    conversionRate: conversion,
    agenciesCount: agencies,
    carsCount: cars,
    revenue,
  };
}

function mapChartDatum(row: Record<string, unknown>): ChartDatum {
  return {
    name: safeString(row.name ?? row.month ?? row.label, "Unknown"),
    value: safeNumber(row.value ?? row.count ?? row.total),
  };
}

function mapChartData(rows: unknown): ChartDatum[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => mapChartDatum((row ?? {}) as Record<string, unknown>));
}

function mapEvolutionDatum(row: Record<string, unknown>): TrafficEvolutionDatum {
  return {
    name: safeString(row.name ?? row.date, "Unknown"),
    visitors: safeNumber(row.visitors),
    searches: safeNumber(row.searches),
    reservations: safeNumber(row.reservations),
  };
}

function emptySummary(): TrafficSummary {
  return {
    visitors: 0,
    uniqueVisitors: 0,
    searches: 0,
    whatsappClicks: 0,
    phoneClicks: 0,
    reservations: 0,
    revenue: 0,
    conversion: 0,
  };
}

export const trafficService = {
  async getSummary() {
    if (!isSupabaseConfigured) {
      return emptySummary();
    }

    console.log("TRAFFIC_DASHBOARD_QUERY", {
      rpc: "get_traffic_summary",
      source: "traffic_events",
    });

    const response = await supabase.rpc("get_traffic_summary");
    console.log("TRAFFIC_DASHBOARD_RAW_RESULT", response.data);
    if (response.error) throw response.error;

    const data = (response.data ?? {}) as Record<string, unknown>;
    const visitors = safeNumber(data.visitors);
    const reservations = safeNumber(data.reservations);

    return {
      visitors,
      uniqueVisitors: safeNumber(data.uniqueVisitors ?? data.unique_visitors),
      searches: safeNumber(data.searches),
      whatsappClicks: safeNumber(data.whatsappClicks ?? data.whatsapp_clicks),
      phoneClicks: safeNumber(data.phoneClicks ?? data.phone_clicks),
      reservations,
      revenue: safeNumber(data.revenue),
      conversion: safeNumber(data.conversion) || calculateConversion(reservations, visitors),
    } satisfies TrafficSummary;
  },

  async listTrafficByCity() {
    if (!isSupabaseConfigured) {
      return [];
    }

    console.log("TRAFFIC_DASHBOARD_QUERY", {
      rpc: "get_traffic_by_city",
      source: "traffic_events",
    });

    const response = await supabase.rpc("get_traffic_by_city");
    console.log("TRAFFIC_SUPABASE_RESPONSE", response);
    console.log("TRAFFIC_DASHBOARD_RAW_RESULT", response.data);
    console.log(
      "TRAFFIC_DASHBOARD_CITY_COUNTS",
      ((response.data ?? []) as Record<string, unknown>[]).map((row) => ({
        cityName: row.city_name ?? row.cityName ?? row.city ?? null,
        visitors: row.visitors ?? 0,
        uniqueVisitors: row.unique_visitors ?? row.uniqueVisitors ?? 0,
        searches: row.searches ?? 0,
        phoneClicks: row.phone_clicks ?? row.phoneClicks ?? 0,
        whatsappClicks: row.whatsapp_clicks ?? row.whatsappClicks ?? 0,
        reservations: row.reservations ?? 0,
        revenue: row.revenue ?? 0,
      })),
    );

    const { data, error } = response;
    if (error) throw error;
    return ((data ?? []) as Record<string, unknown>[]).map(mapTrafficMetric);
  },

  async getDailyEvolution() {
    if (!isSupabaseConfigured) {
      return [];
    }

    const response = await supabase.rpc("get_traffic_daily_evolution");
    console.log("TRAFFIC_DAILY_EVOLUTION_RESPONSE", response);
    if (response.error) throw response.error;
    return ((response.data ?? []) as Record<string, unknown>[]).map(mapEvolutionDatum);
  },

  async getCityTraffic(cityId: string) {
    const cities = await this.listTrafficByCity();
    return cities.find((item) => item.cityId === cityId || item.cityName === cityId) ?? null;
  },

  async getCityTrafficCharts(cityId: string) {
    if (!isSupabaseConfigured) {
      return {
        trend: [],
        channelMix: [],
      };
    }

    const response = await supabase.rpc("get_traffic_city_charts", { selected_city: cityId });
    console.log("TRAFFIC_CHARTS_SUPABASE_RESPONSE", response);
    const { data, error } = response;
    if (error) throw error;
    const charts = (data ?? {}) as { trend?: unknown; channelMix?: unknown; channel_mix?: unknown };
    return {
      trend: mapChartData(charts.trend),
      channelMix: mapChartData(charts.channelMix ?? charts.channel_mix),
    };
  },
};
