"use client";

import { Auth } from "@/frontend/components/forms/Auth";
import { Routes } from "@/shared/types/routes";
import { clearError, signUp } from "@/store/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signupSuccess, setSignupSuccess] = useState(false);
  const router = useRouter();

  const dispatch = useAppDispatch();
  const { isLoading, error, isAuthenticated } = useAppSelector(
    (state) => state.auth
  );

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(Routes.DASHBOARD);
    }
  }, [isAuthenticated, router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    setSignupSuccess(false);

    if (password !== confirmPassword) {
      return;
    }
    if (password.length < 6) {
      return;
    }
    if (!/\d/.test(password)) {
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return;
    }

    const result = await dispatch(signUp({ email, password, name }));

    if (signUp.fulfilled.match(result)) {
      setSignupSuccess(true);
    }
  };

  // Handle validation errors locally
  const getValidationError = () => {
    if (password !== confirmPassword) {
      return "As palavras-passe não coincidem.";
    }
    if (password.length > 0 && password.length < 6) {
      return "A palavra-passe deve ter pelo menos 6 caracteres.";
    }
    if (password.length >= 6 && !/\d/.test(password)) {
      return "A palavra-passe deve conter pelo menos um número.";
    }
    if (
      password.length >= 6 &&
      !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    ) {
      return "A palavra-passe deve conter pelo menos um símbolo.";
    }
    return error || undefined;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EEF0FF]">
      <div className="flex flex-1 items-center justify-center">
        <Auth
          type="signup"
          onSubmit={handleSignup}
          loading={isLoading}
          error={getValidationError()}
          success={signupSuccess}
          email={email}
          password={password}
          setEmail={setEmail}
          setPassword={setPassword}
          name={name}
          setName={setName}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
        >
          {signupSuccess && (
            <div className="text-[#1DB67D] bg-[#E6FAF2] rounded-md px-3 py-2 text-sm text-center">
              Conta criada com sucesso!
              <br />
              Por favor, confirme o seu email antes de aceder à plataforma.
            </div>
          )}
        </Auth>
      </div>
    </div>
  );
}
