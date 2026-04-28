export async function mintCompletionProof(params: {
  bookingId: string;
  leafOwner: string;
  name: string;
  symbol: string;
  uri: string;
}): Promise<{ txSignature: string }> {
  const res = await fetch("/api/proof/mint", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Proof mint failed: ${body}`);
  }
  return res.json();
}
