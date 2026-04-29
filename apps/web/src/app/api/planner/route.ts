import { z } from "zod";
import { handle } from "@/lib/api/handle";
import { jsonOk } from "@/lib/api/response";

const PlannerInput = z.object({
  nfts: z.array(z.object({
    name: z.string(),
    altitude: z.number(),
  })).default([]),
  xpBalance: z.number().nonnegative().default(0),
});

export const POST = handle(PlannerInput, async (body) => {
  const { nfts, xpBalance } = body;

  let recommendation: string;
  let nextDifficulty: string;

  if (nfts.length === 0) {
    recommendation = "Langtang Valley Trek";
    nextDifficulty = "Easy";
  } else {
    const highestAltitude = Math.max(...nfts.map((n) => n.altitude));
    if (highestAltitude > 6000) {
      recommendation = "Manaslu Expedition";
      nextDifficulty = "Expert";
    } else if (highestAltitude > 5000) {
      recommendation = "Annapurna Circuit (High Pass Edition)";
      nextDifficulty = "Challenging";
    } else {
      recommendation = "Everest Base Camp via Gokyo Lakes";
      nextDifficulty = "Moderate";
    }
  }

  const topPeak = nfts[0]?.name ?? "a regional peak";
  const topAlt = nfts[0]?.altitude ?? 3000;

  return jsonOk({
    message: `Based on your ${nfts.length} completed treks and your recent summit of ${topPeak}, I've designed your next odyssey.`,
    recommendation,
    difficulty: nextDifficulty,
    reasoning: `You have shown strong acclimatization up to ${topAlt}m. Your ${xpBalance} XP qualifies you for priority guide matching on this route.`,
    itinerary: [
      "Day 1: Arrival in Kathmandu",
      "Day 3: Heli-shuttle to Lukla",
      "Day 7: Acclimatization at Namche",
      "Day 12: High Pass Crossing",
      "Day 14: Verification & Proof Minting",
    ],
  });
});
