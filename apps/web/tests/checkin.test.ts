import { describe, it, expect } from "vitest";
import { haversineMeters } from "@/lib/geo";

describe("haversineMeters", () => {
  it("returns ~0 for identical points", () => {
    expect(haversineMeters(27.7172, 85.3240, 27.7172, 85.3240)).toBeCloseTo(0, 0);
  });

  it("returns ~111_195 for 1 degree latitude difference", () => {
    const dist = haversineMeters(0, 0, 1, 0);
    expect(dist).toBeGreaterThan(110_000);
    expect(dist).toBeLessThan(112_000);
  });

  it("flags GPS within 500 m of checkpoint as near", () => {
    // Everest Base Camp area — 400 m apart
    const userLat = 27.9881;
    const userLng = 86.9250;
    const checkpointLat = 27.9881;
    const checkpointLng = 86.9295; // ~400 m east
    const dist = haversineMeters(userLat, userLng, checkpointLat, checkpointLng);
    expect(dist).toBeLessThanOrEqual(500);
  });

  it("flags GPS more than 500 m away as too far", () => {
    // Kathmandu to a point ~1 km north
    const dist = haversineMeters(27.7172, 85.3240, 27.7262, 85.3240);
    expect(dist).toBeGreaterThan(500);
  });
});
