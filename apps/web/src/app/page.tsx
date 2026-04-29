"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Map, Award } from "lucide-react";
import { useEffect, useState } from "react";

export default function Home() {
  const [stats, setStats] = useState({ tourists: 0, totalEscrowUsd: 0, proofs: 0 });

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/stats");
      const payload = await res.json();
      if (res.ok) {
        setStats({
          tourists: payload.tourists ?? 0,
          totalEscrowUsd: payload.totalEscrowUsd ?? 0,
          proofs: payload.proofs ?? payload.nftsMinted ?? 0,
        });
      }
    };
    void load();
  }, []);

  return (
    <main className="relative min-h-screen bg-summit-white text-himalayan-blue overflow-hidden">
      {/* Parallax Hero */}
      <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
        <motion.div 
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-0 z-0"
        >
          <Image
            src="/hero.png"
            alt="Himalayan Panorama"
            fill
            className="object-cover brightness-75"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-himalayan-blue/20 to-himalayan-blue/60" />
        </motion.div>

        <div className="relative z-10 text-center px-4 max-w-5xl">
          <motion.h1 
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-6xl md:text-8xl font-playfair text-summit-white mb-6 drop-shadow-2xl"
          >
            Forge Your <br />
            <span className="italic">On-Chain Odyssey</span>
          </motion.h1>
          
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="text-xl md:text-2xl text-summit-white/90 mb-10 font-dm-sans max-w-3xl mx-auto"
          >
            The Solana-native tourism rails for Nepal. Trustless bookings, 
            verifiable experiences, and a reputation layer for the world&apos;s highest trails.
          </motion.p>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="flex flex-col md:flex-row gap-4 justify-center"
          >
            <Link 
              href="/onboard"
              className="px-8 py-4 bg-trekker-orange text-white rounded-full font-bold text-lg hover:bg-trekker-orange/90 transition-all flex items-center justify-center gap-2 group"
            >
              Start Your Journey
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="/explore"
              className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full font-bold text-lg hover:bg-white/20 transition-all"
            >
              Explore Routes
            </Link>
          </motion.div>
        </div>

        {/* Stats Ticker */}
        <div className="absolute bottom-0 w-full bg-himalayan-blue/80 backdrop-blur-lg border-t border-white/10 py-6">
          <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center gap-8 md:gap-20 text-summit-white/80 font-dm-sans text-sm uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <span className="text-trekker-orange font-bold text-lg">{stats.tourists.toLocaleString()}</span> Tourists Onboarded
            </div>
            <div className="flex items-center gap-2">
              <span className="text-trekker-orange font-bold text-lg">${Math.round(stats.totalEscrowUsd).toLocaleString()}</span> in Escrow
            </div>
            <div className="flex items-center gap-1">
              <span className="text-trekker-orange font-bold text-lg">{stats.proofs.toLocaleString()}</span> NFTs Minted
            </div>
          </div>
        </div>
      </section>

      {/* Value Prop Section */}
      <section className="py-24 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div className="glass-card p-12 shadow-xl shadow-himalayan-blue/5">
            <Shield className="w-12 h-12 text-trekker-orange mx-auto mb-6" />
            <h3 className="text-2xl font-playfair mb-4">Trustless Escrow</h3>
            <p className="text-himalayan-blue/70">
              Funds are held on-chain and only released to operators when your experience is verified complete.
            </p>
          </div>
          <div className="glass-card p-12 shadow-xl shadow-himalayan-blue/5">
            <Map className="w-12 h-12 text-trekker-orange mx-auto mb-6" />
            <h3 className="text-2xl font-playfair mb-4">Experience Registry</h3>
            <p className="text-himalayan-blue/70">
              Every trail, waypoint, and summit recorded as a soul-bound cNFT, building your global reputation.
            </p>
          </div>
          <div className="glass-card p-12 shadow-xl shadow-himalayan-blue/5">
            <Award className="w-12 h-12 text-trekker-orange mx-auto mb-6" />
            <h3 className="text-2xl font-playfair mb-4">XP &amp; Leaderboard</h3>
            <p className="text-himalayan-blue/70">
              Earn XP at every checkpoint and climb the global leaderboard. Your rank is real — backed by on-chain proof.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
