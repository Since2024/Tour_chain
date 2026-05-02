"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { ArrowRight, Shield, Map, Award, Zap, Users, Star, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/* ── Animated counter ─────────────────────────────────────────── */
function Counter({ target, prefix = "", suffix = "" }: { target: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (prefersReduced) { setCount(target); return; }
    if (target === 0) return;
    const duration = 1800;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target, prefersReduced]);

  return <>{prefix}{count.toLocaleString()}{suffix}</>;
}

/* ── Floating particle ────────────────────────────────────────── */
function Particle({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-white/20 pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
      animate={{ y: [-10, 10, -10], opacity: [0.2, 0.6, 0.2] }}
      transition={{ duration: 4 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}

/* ── Feature card with 3D tilt ────────────────────────────────── */
function FeatureCard({
  icon: Icon, title, description, accent, delay,
}: {
  icon: React.ElementType; title: string; description: string; accent: string; delay: number;
}) {
  const prefersReduced = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={prefersReduced ? {} : { scale: 1.03, rotateX: 3, rotateY: 3 }}
      style={{ transformStyle: "preserve-3d" }}
      className="perspective"
    >
      <div
        className="glass-light p-8 rounded-3xl border border-white/60 shadow-xl hover:shadow-2xl transition-shadow duration-300 h-full"
        style={{ boxShadow: `0 4px 32px ${accent}18` }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shine"
          style={{ background: `linear-gradient(135deg, ${accent}22, ${accent}44)` }}
        >
          <Icon className="w-7 h-7" style={{ color: accent }} />
        </div>
        <h3 className="text-xl font-bold text-himalayan-blue mb-3" style={{ fontFamily: "Georgia, serif" }}>
          {title}
        </h3>
        <p className="text-himalayan-blue/65 leading-relaxed text-sm">{description}</p>
      </div>
    </motion.div>
  );
}

/* ── Stat badge ───────────────────────────────────────────────── */
function StatBadge({ value, label, icon }: { value: React.ReactNode; label: string; icon: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      className="flex items-center gap-3"
    >
      <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-xl shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-trekker-orange font-bold text-2xl md:text-3xl tabular-nums leading-none">{value}</div>
        <div className="text-summit-white/60 text-xs uppercase tracking-widest mt-0.5">{label}</div>
      </div>
    </motion.div>
  );
}

/* ── Testimonial ──────────────────────────────────────────────── */
const TESTIMONIALS = [
  { name: "Sarah M.",  country: "🇺🇸", text: "The blockchain check-ins gave me total peace of mind. Every checkpoint verified on Solana!", route: "Everest Base Camp" },
  { name: "Yuki T.",   country: "🇯🇵", text: "Incredible platform. The escrow system meant I never worried about payment disputes.", route: "Annapurna Circuit" },
  { name: "Priya S.",  country: "🇮🇳", text: "As a solo female trekker, the SOS system and verified guides made all the difference.", route: "Langtang Valley" },
  { name: "James K.",  country: "🇬🇧", text: "Minted my EBC completion NFT — it's the coolest souvenir I've ever gotten from a trip.", route: "Everest Base Camp" },
];

/* ── Main page ────────────────────────────────────────────────── */
export default function Home() {
  const [stats, setStats] = useState({ tourists: 0, totalEscrowUsd: 0, proofs: 0 });
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", prefersReduced ? "0%" : "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/stats");
        const payload = await res.json();
        if (res.ok) setStats({ tourists: payload.tourists ?? 0, totalEscrowUsd: payload.totalEscrowUsd ?? 0, proofs: payload.proofs ?? payload.nftsMinted ?? 0 });
      } catch { /* ignore */ }
    };
    void load();
  }, []);

  // Auto-rotate testimonials
  useEffect(() => {
    const t = setInterval(() => setTestimonialIdx((i) => (i + 1) % TESTIMONIALS.length), 4000);
    return () => clearInterval(t);
  }, []);

  const particles = Array.from({ length: 12 }, (_, i) => ({
    x: (i * 37 + 10) % 90, y: (i * 53 + 5) % 85,
    size: 4 + (i % 4) * 3, delay: i * 0.4,
  }));

  return (
    <main className="relative min-h-screen bg-summit-white text-himalayan-blue overflow-hidden">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative h-screen w-full flex items-center justify-center overflow-hidden">
        {/* Parallax background */}
        <motion.div style={{ y: heroY }} className="absolute inset-0 z-0">
          <Image src="/hero.png" alt="Himalayan Panorama" fill className="object-cover brightness-[0.65]" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-himalayan-blue/30 via-transparent to-himalayan-blue/80" />
          <div className="absolute inset-0 hero-gradient opacity-30" />
        </motion.div>

        {/* Floating particles */}
        <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
          {particles.map((p, i) => <Particle key={i} {...p} />)}
        </div>

        {/* Hero content */}
        <motion.div style={{ opacity: heroOpacity }} className="relative z-10 text-center px-4 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="inline-flex items-center gap-2 glass-dark px-5 py-2 rounded-full text-summit-white/80 text-sm mb-8 border border-white/20"
          >
            <span className="w-2 h-2 rounded-full bg-trekker-orange animate-pulse" />
            Live on Solana Devnet · Nepal&apos;s First Blockchain Trek Platform
          </motion.div>

          <motion.h1
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="text-6xl md:text-8xl font-playfair text-summit-white mb-6 drop-shadow-2xl leading-tight"
          >
            Forge Your <br />
            <span className="italic" style={{ background: "linear-gradient(135deg,#e07b39,#fcbf49)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              On-Chain Odyssey
            </span>
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="text-xl md:text-2xl text-summit-white/85 mb-10 max-w-3xl mx-auto leading-relaxed"
          >
            Solana-native tourism rails for Nepal. Trustless bookings, verifiable experiences,
            and a reputation layer for the world&apos;s highest trails.
          </motion.p>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/onboard"
              className="btn-ripple shine px-8 py-4 rounded-full font-bold text-lg text-white flex items-center justify-center gap-2 group pulse-glow transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg,#e07b39,#d62828)" }}
            >
              Start Your Journey
              <ArrowRight className="group-hover:translate-x-1 transition-transform w-5 h-5" />
            </Link>
            <Link
              href="/explore"
              className="px-8 py-4 glass-dark border border-white/25 text-white rounded-full font-bold text-lg hover:bg-white/20 transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
              <Map className="w-5 h-5" /> Explore Routes
            </Link>
          </motion.div>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.8 }}
          className="absolute bottom-0 w-full glass-dark border-t border-white/10 py-5"
        >
          <div className="max-w-3xl mx-auto px-4 flex flex-wrap justify-center items-center gap-0">
            <div className="px-8 py-1">
              <StatBadge value={<Counter target={stats.tourists} />} label="Trekkers Onboarded" icon="🧗" />
            </div>
            <div className="w-px h-10 bg-white/15 hidden sm:block" />
            <div className="px-8 py-1">
              <StatBadge value={<Counter target={Math.round(stats.totalEscrowUsd)} prefix="$" />} label="in Escrow" icon="🔐" />
            </div>
            <div className="w-px h-10 bg-white/15 hidden sm:block" />
            <div className="px-8 py-1">
              <StatBadge value={<Counter target={stats.proofs} />} label="NFTs Minted" icon="🎖️" />
            </div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-28 left-1/2 -translate-x-1/2 text-white/40"
        >
          <ChevronDown className="w-6 h-6" />
        </motion.div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section className="py-28 px-4 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-trekker-orange text-sm font-bold uppercase tracking-widest mb-3">Why TourChain</span>
          <h2 className="text-4xl md:text-5xl font-bold text-himalayan-blue" style={{ fontFamily: "Georgia, serif" }}>
            Built for the <span className="gradient-text">Modern Trekker</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={Shield} title="Trustless Escrow"
            description="Funds held on-chain, released only when your experience is GPS-verified complete. No disputes, no middlemen."
            accent="#e07b39" delay={0}
          />
          <FeatureCard
            icon={Map} title="Experience Registry"
            description="Every trail, waypoint, and summit recorded as a soul-bound cNFT. Build your verifiable Himalayan reputation."
            accent="#2d6a4f" delay={0.15}
          />
          <FeatureCard
            icon={Award} title="$TREK Loyalty"
            description="Earn ecosystem tokens for every km trekked. Stake for discounts or vote on DAO governance proposals."
            accent="#d62828" delay={0.3}
          />
        </div>
      </section>

      {/* ── BENTO STATS ──────────────────────────────────────── */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: "🏔️", value: "30+",  label: "Verified Routes",    bg: "from-blue-50 to-indigo-50",   border: "border-blue-100" },
            { icon: "⛓️", value: "100%", label: "On-Chain Verified",  bg: "from-orange-50 to-amber-50",  border: "border-orange-100" },
            { icon: "🌍", value: "15+",  label: "Countries Served",   bg: "from-green-50 to-emerald-50", border: "border-green-100" },
            { icon: "⭐", value: "4.9",  label: "Average Rating",     bg: "from-yellow-50 to-amber-50",  border: "border-yellow-100" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.34, 1.56, 0.64, 1] }}
              className={`bg-gradient-to-br ${item.bg} border ${item.border} rounded-3xl p-6 text-center`}
            >
              <div className="text-4xl mb-2">{item.icon}</div>
              <div className="text-3xl font-bold text-himalayan-blue">{item.value}</div>
              <div className="text-xs text-himalayan-blue/60 mt-1 uppercase tracking-wider">{item.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="py-24 px-4 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-himalayan-blue mb-3" style={{ fontFamily: "Georgia, serif" }}>
            How It Works
          </h2>
          <p className="text-himalayan-blue/60">Four steps to your verified Himalayan adventure</p>
        </motion.div>

        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-gradient-to-b from-trekker-orange via-forest-green to-prayer-red hidden md:block" style={{ left: "calc(2rem + 1px)" }} />

          <div className="space-y-8">
            {[
              { step: "01", icon: "🔗", title: "Connect Wallet",    desc: "Link your Solana wallet and complete onboarding in under 2 minutes.", color: "#e07b39" },
              { step: "02", icon: "🗺️", title: "Choose Your Trek",  desc: "Browse verified routes with real-time weather, difficulty ratings, and guide profiles.", color: "#2d6a4f" },
              { step: "03", icon: "🔐", title: "Lock Escrow",       desc: "Funds are held in a trustless Solana PDA — released only on verified completion.", color: "#1a2b4a" },
              { step: "04", icon: "🎖️", title: "Mint Your Proof",   desc: "Complete checkpoints, earn XP, and mint your NFT completion certificate on-chain.", color: "#d62828" },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className="flex items-start gap-6"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-lg"
                  style={{ background: `${item.color}18`, border: `2px solid ${item.color}33` }}
                >
                  {item.icon}
                </div>
                <div className="pt-2">
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: item.color }}>{item.step}</span>
                  <h3 className="text-xl font-bold text-himalayan-blue mt-0.5">{item.title}</h3>
                  <p className="text-himalayan-blue/60 text-sm mt-1">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────── */}
      <section className="py-24 px-4" style={{ background: "linear-gradient(135deg,#1a2b4a 0%,#2d3a5a 100%)" }}>
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="text-4xl font-bold text-summit-white mb-3" style={{ fontFamily: "Georgia, serif" }}>
              Trekkers Love It
            </h2>
            <div className="flex justify-center gap-1">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />)}
            </div>
          </motion.div>

          <div className="relative h-48">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={i}
                initial={false}
                animate={{ opacity: i === testimonialIdx ? 1 : 0, y: i === testimonialIdx ? 0 : 20 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 flex flex-col items-center justify-center"
              >
                <p className="text-summit-white/90 text-lg italic mb-4 max-w-xl">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{t.country}</span>
                  <span className="text-summit-white font-bold">{t.name}</span>
                  <span className="text-summit-white/50 text-sm">· {t.route}</span>
                </div>
              </motion.div>
            ))}
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

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-28 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-4xl mx-auto text-center rounded-3xl p-16 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg,#e07b39 0%,#d62828 100%)" }}
        >
          <div className="absolute inset-0 noise" />
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: "Georgia, serif" }}>
              Ready to Trek On-Chain?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
              Join thousands of trekkers who have verified their Himalayan adventures on Solana.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/explore"
                className="btn-ripple px-8 py-4 bg-white text-trekker-orange rounded-full font-bold text-lg hover:scale-105 transition-all shadow-xl flex items-center justify-center gap-2 group"
              >
                <Map className="w-5 h-5" /> Browse Routes
                <ArrowRight className="group-hover:translate-x-1 transition-transform w-4 h-4" />
              </Link>
              <Link
                href="/leaderboard"
                className="px-8 py-4 border-2 border-white/40 text-white rounded-full font-bold text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                <Users className="w-5 h-5" /> View Leaderboard
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-himalayan-blue/10 py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-himalayan-blue/50 text-sm">
          <div className="flex items-center gap-2.5">
            <div className="relative w-[100px] h-[36px]">
              <Image src="/logo.png" alt="TourChain" fill className="object-contain object-left" />
            </div>
          </div>
          <p>⛓️ Powered by Solana · All experiences recorded on-chain</p>
          <div className="flex gap-4">
            <Link href="/dao" className="hover:text-himalayan-blue transition-colors">DAO</Link>
            <Link href="/vibe" className="hover:text-himalayan-blue transition-colors">NFTs</Link>
            <Link href="/leaderboard" className="hover:text-himalayan-blue transition-colors">Leaderboard</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
