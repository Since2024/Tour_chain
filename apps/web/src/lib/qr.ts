import { createHmac } from "crypto";

export function generateDailyToken(placeId: string, secret: string): string {
  const today = new Date().toISOString().split("T")[0];
  return createHmac("sha256", secret)
    .update(`${placeId}:${today}`)
    .digest("hex")
    .substring(0, 16);
}

export function generateQRData(placeId: string, secret: string): string {
  const today = new Date().toISOString().split("T")[0];
  const token = generateDailyToken(placeId, secret);
  return `tcn:${placeId}:${today}:${token}`;
}

export function verifyToken(qrData: string, secret: string): boolean {
  const parts = qrData.split(":");
  if (parts[0] !== "tcn" || parts.length !== 4) return false;
  const [, placeId, date, token] = parts;

  const qrDate = new Date(date);
  const now = new Date();
  const diffDays = Math.abs((now.getTime() - qrDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 1) return false;

  const expected = createHmac("sha256", secret)
    .update(`${placeId}:${date}`)
    .digest("hex")
    .substring(0, 16);
  return token === expected;
}
