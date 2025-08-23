"use client";

import { Auth } from "@/frontend/components/forms/Auth";
import { useAuthStore } from "@/frontend/stores";
import { Routes } from "@/shared/types/routes";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const { signIn, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const success = await signIn(email, password);
    if (success) {
      router.push(Routes.DASHBOARD);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EEF0FF]">
      <div className="flex flex-1 items-center justify-center">
        <Auth
          type="login"
          onSubmit={handleLogin}
          loading={isLoading}
          error={error || undefined}
          email={email}
          password={password}
          setEmail={setEmail}
          setPassword={setPassword}
        />
      </div>
    </div>
  );
}
