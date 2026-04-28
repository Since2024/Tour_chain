"use client";

import { ExternalLink } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Proof = {
  id: string;
  booking_id: string;
  nft_mint_address: string | null;
  metadata_uri: string | null;
  created_at: string;
  route?: { name?: string } | null;
};

export default function NFTDetailPage() {
  const params = useParams();
  const mintAddress = params.mintAddress as string;
  const [proof, setProof] = useState<Proof | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/proofs");
      const payload = await res.json();
      if (!res.ok) return;
      const match = (payload.proofs ?? []).find(
        (item: Proof) => item.nft_mint_address === mintAddress || item.id === mintAddress,
      );
      setProof(match ?? null);
    };
    void load();
  }, [mintAddress]);

  return (
    <main className="pt-24 pb-12 px-4 max-w-3xl mx-auto min-h-screen">
      <h1 className="text-4xl font-playfair text-himalayan-blue mb-2">Completion Proof</h1>
      {proof ? (
        <div className="bg-white border rounded-2xl p-6 space-y-3">
          <p className="text-sm text-himalayan-blue/60">Route: {proof.route?.name ?? "Unknown route"}</p>
          <p className="text-sm text-himalayan-blue/60">Mint: {proof.nft_mint_address ?? "pending"}</p>
          <p className="text-sm text-himalayan-blue/60">Created: {new Date(proof.created_at).toLocaleString()}</p>
          {proof.metadata_uri ? (
            <a href={proof.metadata_uri} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-trekker-orange font-semibold">
              Open metadata <ExternalLink className="w-4 h-4" />
            </a>
          ) : (
            <p className="text-himalayan-blue/40">Metadata URI pending</p>
          )}
        </div>
      ) : (
        <p className="text-himalayan-blue/60">Proof not found for `{mintAddress}`.</p>
      )}
    </main>
  );
}
