import { mockAgencies, mockCars, mockCities, mockTraffic } from "@/data/mock-data";

export const ownerService = {
  async getFilterOptions() {
    return {
      cities: mockCities,
      agencies: mockAgencies,
      brands: [...new Set(mockCars.map((car) => car.brand))],
      trafficCities: mockTraffic,
    };
  },
};
