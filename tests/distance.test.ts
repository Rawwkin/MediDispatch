import { describe, expect, it } from "vitest";
import { haversineKm, sortByProximity } from "../src/app/utils/distance";

describe("haversineKm", () => {
  it("returns 0 for the same point", () => {
    expect(haversineKm(40.7128, -74.006, 40.7128, -74.006)).toBe(0);
  });

  it("computes the approximate distance between two well-known cities", () => {
    // New York to London ~ 5570 km
    const ny = { lat: 40.7128, lon: -74.006 };
    const london = { lat: 51.5074, lon: -0.1278 };
    const d = haversineKm(ny.lat, ny.lon, london.lat, london.lon);
    expect(d).toBeGreaterThan(5400);
    expect(d).toBeLessThan(5700);
  });

  it("sorts items by proximity to origin", () => {
    const items = [
      { id: "far", latitude: 51.5074, longitude: -0.1278 }, // London
      { id: "close", latitude: 40.7589, longitude: -73.9851 }, // near NY
      { id: "medium", latitude: 42.0, longitude: -71.0 }, // Boston
    ];
    const sorted = sortByProximity({ latitude: 40.7128, longitude: -74.006 }, items);
    expect(sorted[0]!.id).toBe("close");
    expect(sorted[sorted.length - 1]!.id).toBe("far");
  });
});