"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Compass, 
  Globe, 
  Calendar, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2,
  Wallet,
  Zap
} from "lucide-react";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const steps = [
  { id: "wallet", title: "Identity", description: "Connect your digital wallet" },
  { id: "profile", title: "Passport", description: "Origin and travel window" },
  { id: "bridge", title: "Treasury", description: "On-ramp liquidity" },
  { id: "ready", title: "Embark", description: "Begin your odyssey" }
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const { connected } = useWallet();
  const router = useRouter();
  const [country, setCountry] = useState("");
  const [arrival, setArrival] = useState("");
  const [departure, setDeparture] = useState("");

  const nextStep = () => {
    if (currentStep === 0 && !connected) return;
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  };
  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 0));

  return (
    <div className="pt-24 min-h-screen bg-summit-white flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-trekker-orange/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-himalayan-blue/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="max-w-2xl w-full">
        {/* Progress Tracker */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-4">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                  idx <= currentStep ? "bg-himalayan-blue text-summit-white" : "bg-zinc-200 text-himalayan-blue/20"
                }`}>
                  {idx < currentStep ? <CheckCircle2 className="w-6 h-6" /> : idx + 1}
                </div>
                <span className={`text-[10px] mt-2 font-bold uppercase tracking-widest ${
                  idx <= currentStep ? "text-himalayan-blue" : "text-himalayan-blue/20"
                }`}>
                  {step.title}
                </span>
                {idx === 0 && !connected && idx === currentStep && (
                  <span className="absolute -top-6 text-[8px] font-bold text-trekker-orange uppercase tracking-tighter">Connection Required</span>
                )}
              </div>
            ))}
          </div>
          <div className="h-1 bg-zinc-200 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-himalayan-blue" 
              initial={{ width: "0%" }}
              animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Wizard Card */}
        <div className="bg-white rounded-[40px] p-12 shadow-2xl shadow-himalayan-blue/5 border border-himalayan-blue/5 relative overflow-hidden">
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <motion.div 
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <header className="text-center">
                  <div className="w-16 h-16 bg-trekker-orange/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Wallet className="w-8 h-8 text-trekker-orange" />
                  </div>
                  <h2 className="text-4xl font-playfair mb-2">Initialize Your <span className="italic">Identity</span></h2>
                  <p className="text-himalayan-blue/60 font-dm-sans">Connect your Solana wallet to begin your trek on the blockchain.</p>
                </header>
                <div className="flex justify-center py-8">
                  <WalletMultiButton className="!bg-himalayan-blue !h-14 !px-8 !rounded-2xl !font-bold hover:!opacity-90 transition-all scale-110 shadow-xl shadow-himalayan-blue/20" />
                </div>
                {connected && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2 text-forest-green font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4" /> Wallet Linked Successfully
                  </motion.div>
                )}
                <p className="text-center text-xs text-himalayan-blue/40 italic">
                  New to Solana? We&apos;ll help you bootstrap your traveler&apos;s profile.
                </p>
              </motion.div>
            )}

            {currentStep === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <header className="text-center">
                  <div className="w-16 h-16 bg-forest-green/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Globe className="w-8 h-8 text-forest-green" />
                  </div>
                  <h2 className="text-4xl font-playfair mb-2">Travel <span className="italic">Manifest</span></h2>
                  <p className="text-himalayan-blue/60 font-dm-sans">Help us customize your Himalayan odyssey recommendations.</p>
                </header>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-himalayan-blue/40 ml-1">Home Country</label>
                    <input
                      type="text"
                      value={country}
                      onChange={(event) => setCountry(event.target.value)}
                      placeholder="e.g. United Kingdom"
                      className="w-full p-4 bg-zinc-50 rounded-xl border border-himalayan-blue/10 font-dm-sans focus:outline-none focus:ring-2 focus:ring-himalayan-blue/5 transition-all hover:bg-zinc-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-himalayan-blue/40 ml-1">Arrival Window</label>
                    <div className="flex gap-4">
                      <div className="flex-1 relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-himalayan-blue/40" />
                        <input
                          type="date"
                          value={arrival}
                          onChange={(event) => setArrival(event.target.value)}
                          className="w-full pl-10 pr-4 py-4 bg-zinc-50 rounded-xl border border-himalayan-blue/10 text-sm hover:bg-zinc-100 transition-all font-dm-sans"
                        />
                      </div>
                      <div className="flex-1 relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-himalayan-blue/40" />
                        <input
                          type="date"
                          value={departure}
                          onChange={(event) => setDeparture(event.target.value)}
                          className="w-full pl-10 pr-4 py-4 bg-zinc-50 rounded-xl border border-himalayan-blue/10 text-sm hover:bg-zinc-100 transition-all font-dm-sans"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <header className="text-center">
                  <div className="w-16 h-16 bg-trekker-orange/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Zap className="w-8 h-8 text-trekker-orange" />
                  </div>
                  <h2 className="text-4xl font-playfair mb-2">Cross-Chain <span className="italic">Liquidity</span></h2>
                  <p className="text-himalayan-blue/60 font-dm-sans">Pay with USDC from Ethereum, Polygon, or BNB smoothly.</p>
                </header>
                <div className="bg-zinc-50 rounded-3xl p-8 border border-himalayan-blue/10">
                  <div className="flex items-center justify-between mb-8 pb-8 border-b border-himalayan-blue/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-lg">W</div>
                      <span className="font-bold text-himalayan-blue italic">Wormhole Connect</span>
                    </div>
                    <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded font-bold uppercase tracking-widest animate-pulse">Active</span>
                  </div>
                  <div className="space-y-4 text-center">
                    <p className="text-xs text-himalayan-blue/40 leading-relaxed max-w-xs mx-auto">
                      Bridge USDC directly into the tourism protocol. 
                      Gasless bridging is supported for the Nepal ecosystem.
                    </p>
                    <button className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10">
                      Select Source Chain
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8 text-center"
              >
                <div className="w-24 h-24 bg-forest-green/10 rounded-full flex items-center justify-center mx-auto scale-110 mb-8 overflow-hidden shadow-inner font-playfair italic">
                  <CheckCircle2 className="w-12 h-12 text-forest-green" />
                </div>
                <h2 className="text-5xl font-playfair italic">Adventure <br/> <span className="text-trekker-orange not-italic font-bold">Awaits</span></h2>
                <p className="text-himalayan-blue/60 font-dm-sans max-w-sm mx-auto">
                  Your profile is initialized on the Solana devnet. You are now ready to book 
                  verifiable experiences and earn $TREK rewards.
                </p>
                <div className="py-8">
                  <button
                    onClick={() => router.push("/explore")}
                    className="w-full py-5 bg-himalayan-blue text-summit-white rounded-2xl font-bold text-xl shadow-xl shadow-himalayan-blue/20 flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform"
                  >
                    Find My First Trek
                    <Compass className="w-6 h-6 animate-pulse" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <footer className="mt-12 pt-8 border-t border-himalayan-blue/5 flex justify-between items-center">
            {currentStep > 0 ? (
              <button 
                onClick={prevStep}
                className="flex items-center gap-2 text-himalayan-blue/40 font-bold text-sm hover:text-himalayan-blue transition-colors"
                disabled={currentStep === 3}
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : <div />}
            
            {currentStep < 3 && (
              <button 
                onClick={nextStep}
                disabled={currentStep === 0 && !connected}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all group ${
                  currentStep === 0 && !connected 
                    ? "bg-zinc-100 text-himalayan-blue/20 cursor-not-allowed" 
                    : "bg-zinc-50 text-himalayan-blue hover:bg-zinc-100"
                }`}
              >
                Continue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </footer>
        </div>
      </div>
    </div>
  );
}
