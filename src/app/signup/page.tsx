"use client";

import { Auth } from "@/frontend/components/forms/Auth";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useState } from "react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClientComponentClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    if (password !== confirmPassword) {
      setError("As palavras-passe não coincidem.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("A palavra-passe deve ter pelo menos 6 caracteres.");
      setLoading(false);
      return;
    }

    if (!/\d/.test(password)) {
      setError("A palavra-passe deve conter pelo menos um número.");
      setLoading(false);
      return;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      setError("A palavra-passe deve conter pelo menos um símbolo.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    setLoading(false);
    if (error) {
      setError(
        error.message === "User already registered"
          ? "Este email já está em uso."
          : error.message
      );
    } else {
      setSuccess(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EEF0FF]">
      <div className="flex flex-1 items-center justify-center">
        <Auth
          type="signup"
          onSubmit={handleSignup}
          loading={loading}
          error={error}
          success={success}
          email={email}
          password={password}
          setEmail={setEmail}
          setPassword={setPassword}
          name={name}
          setName={setName}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
        >
          {success && (
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
