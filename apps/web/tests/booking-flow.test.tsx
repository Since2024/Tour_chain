import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import BookingDetailPage from "@/app/booking/[bookingId]/page";

vi.mock("next/navigation", () => ({
  useParams: () => ({ bookingId: "booking-abc-123" }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

const mockBooking = {
  id: "booking-abc-123",
  status: "confirmed",
  start_date: "2026-05-01",
  end_date: "2026-05-07",
  total_price_usd: 450,
};

describe("BookingDetailPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders booking details after fetch succeeds", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ booking: mockBooking, checkins: [] }),
    } as unknown as Response);

    render(<BookingDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/booking-abc-123/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Status: confirmed/i)).toBeInTheDocument();
    expect(screen.getByText(/Total: \$450/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open active trek view/i })).toHaveAttribute(
      "href",
      "/trek/booking-abc-123",
    );
  });

  it("renders checkin timeline items", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        booking: mockBooking,
        checkins: [
          {
            id: "ci-1",
            place_id: "place-xyz-9999",
            verified: true,
            created_at: "2026-05-02T08:00:00Z",
          },
        ],
      }),
    } as unknown as Response);

    render(<BookingDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/Checkpoint verified \(place-xy/i)).toBeInTheDocument();
    });
  });

  it("shows error message when fetch fails", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: "Booking not found" } }),
    } as unknown as Response);

    render(<BookingDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/Booking not found/i)).toBeInTheDocument();
    });
  });
});
