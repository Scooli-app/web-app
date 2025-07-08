"use client";

import { Auth } from "@/components/forms/Auth";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        router.replace("/dashboard");
      }
    });
  }, [router, supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Palavra-passe ou email incorretos."
          : error.message
      );
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EEF0FF]">
      <div className="flex flex-1 items-center justify-center">
        <Auth
          type="login"
          onSubmit={handleLogin}
          loading={loading}
          error={error}
          email={email}
          password={password}
          setEmail={setEmail}
          setPassword={setPassword}
        />
      </div>
    </div>
  );
}
