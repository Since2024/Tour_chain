"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth/email";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError(signInError.message);
        return;
      }
      router.push("/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign in");
    }
  };

  return (
    <main className="pt-28 px-4 max-w-md mx-auto">
      <div className="bg-white border border-himalayan-blue/10 rounded-2xl p-6 space-y-5">
        <h1 className="text-2xl font-playfair text-himalayan-blue">Login</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <input className="w-full border rounded-xl px-4 py-3" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="w-full border rounded-xl px-4 py-3" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error ? <p className="text-prayer-red text-sm">{error}</p> : null}
          <button className="w-full bg-himalayan-blue text-white rounded-xl py-3 font-bold">Sign in</button>
        </form>
        <p className="text-sm text-himalayan-blue/70">
          No account? <Link className="text-trekker-orange font-semibold" href="/signup">Create one</Link>
        </p>
      </div>
    </main>
  );
}
