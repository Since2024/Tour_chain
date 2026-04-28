import { z } from "zod";

export const BookingCreateInput = z.object({
  guideId: z.string().uuid(),
  serviceId: z.string().uuid(),
  routeId: z.string().uuid().optional().nullable(),
  startDate: z.string().min(1),
  endDate: z.string().optional().nullable(),
  totalPriceUsd: z.number().nonnegative(),
  milestonesTotal: z.number().int().min(1).max(10).optional(),
});

export const BookingStatusUpdateInput = z.object({
  status: z.enum(["pending", "confirmed", "active", "completed", "disputed", "refunded", "cancelled"]),
});

export const CheckinInput = z.object({
  booking_id: z.string().uuid(),
  place_id: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const ProofMintInput = z.object({
  bookingId: z.string().uuid(),
  name: z.string().min(1).max(64),
  symbol: z.string().min(1).max(16),
  uri: z.string().url(),
});
