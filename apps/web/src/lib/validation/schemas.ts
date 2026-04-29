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

export const BookingPrepareInput = z.object({
  service_id: z.string().uuid(),
  milestones: z.number().int().min(1).max(10).optional(),
});

export const CheckinInput = z.object({
  booking_id: z.string().uuid(),
  place_id: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const QrVerifyInput = z.object({
  token: z.string().min(1).max(512),
  booking_id: z.string().uuid(),
  place_id: z.string().uuid(),
});

export const ProofMintInput = z.object({
  bookingId: z.string().uuid(),
  leaf_owner: z.string().min(32).max(44),
  name: z.string().min(1).max(32),
  symbol: z.string().min(1).max(10),
  uri: z.string().url().max(200),
});

export const WalletLinkInput = z.object({
  walletAddress: z.string().min(32).max(44),
  signature: z.string().min(1).max(512),
  nonce: z.string().min(1).max(128),
});

export const DisputeInput = z.object({
  bookingId: z.string().uuid(),
  category: z.enum(["no_show", "safety", "billing", "quality", "other"]),
  description: z.string().min(10).max(2000),
  evidenceUrls: z.array(z.string().url().max(512)).max(5).default([]),
});
