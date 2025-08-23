"use client";

import { Auth } from "@/frontend/components/forms/Auth";
import { clearError, signIn } from "@/store/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useAppDispatch();
  const { isLoading, error, isAuthenticated } = useAppSelector(
    (state) => state.auth
  );
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    dispatch(signIn({ email, password }));
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
