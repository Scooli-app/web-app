"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

interface AuthProps {
  type: "login" | "signup";
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error?: string;
  success?: boolean;
  email: string;
  password: string;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  name?: string;
  setName?: (v: string) => void;
  confirmPassword?: string;
  setConfirmPassword?: (v: string) => void;
  children?: ReactNode;
}

interface PasswordStrength {
  hasMinLength: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  score: number;
}

const validatePassword = (password: string): PasswordStrength => {
  if (password.length === 0) {
    return {
      hasMinLength: false,
      hasNumber: false,
      hasSymbol: false,
      score: 0,
    };
  }
  const hasMinLength = password.length >= 6;
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const score =
    (hasMinLength ? 1 : 0) + (hasNumber ? 1 : 0) + (hasSymbol ? 1 : 0);

  return { hasMinLength, hasNumber, hasSymbol, score };
};

export function Auth({
  type,
  onSubmit,
  loading,
  error,
  success,
  email,
  password,
  setEmail,
  setPassword,
  name,
  setName,
  confirmPassword,
  setConfirmPassword,
  children,
}: AuthProps) {
  const isLogin = type === "login";
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    hasMinLength: false,
    hasNumber: false,
    hasSymbol: false,
    score: 0,
  });
  const [showPasswordHelp, setShowPasswordHelp] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(true);

  useEffect(() => {
    if (!isLogin) {
      setPasswordStrength(validatePassword(password));
    }
  }, [password, isLogin]);

  useEffect(() => {
    if (!isLogin && confirmPassword) {
      setPasswordsMatch(password === confirmPassword);
    }
  }, [password, confirmPassword, isLogin]);

  const getStrengthColor = (score: number) => {
    switch (score) {
      case 0:
      case 1:
        return "bg-[#FF4F4F]";
      case 2:
        return "bg-[#FFC857]";
      case 3:
        return "bg-[#1DB67D]";
      default:
        return "bg-gray-200";
    }
  };

  const getStrengthText = (score: number) => {
    switch (score) {
      case 0:
      case 1:
        return "Fraca";
      case 2:
        return "Média";
      case 3:
        return "Forte";
      default:
        return "";
    }
  };

  const isFormValid = () => {
    if (isLogin) {
      return true;
    }
    return (
      passwordStrength.score === 3 &&
      passwordsMatch &&
      name &&
      name.trim().length > 0
    );
  };

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md space-y-6 border border-[#E4E4E7] mx-auto"
    >
      <h1 className="text-3xl font-bold text-[#6753FF] mb-2">
        {isLogin ? "Entrar" : "Criar Conta"}
      </h1>
      {children}
      {!success && (
        <>
          {!isLogin && (
            <Input
              type="text"
              placeholder="Nome completo"
              value={name || ""}
              onChange={(e) => setName?.(e.target.value)}
              required
              aria-label="Nome completo"
            />
          )}
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-label="Email"
          />
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Palavra-passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => !isLogin && setShowPasswordHelp(true)}
              onBlur={() => setShowPasswordHelp(false)}
              required
              aria-label="Palavra-passe"
            />
            {!isLogin && (showPasswordHelp || password.length > 0) && (
              <div className="space-y-2 p-3 bg-[#F4F5F8] rounded-md border">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(
                        passwordStrength.score
                      )}`}
                      style={{
                        width: `${(passwordStrength.score / 3) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-[#6C6F80]">
                    {getStrengthText(passwordStrength.score)}
                  </span>
                </div>
                <div className="space-y-1">
                  <div
                    className={`flex items-center space-x-2 text-xs ${
                      passwordStrength.hasMinLength
                        ? "text-[#1DB67D]"
                        : "text-[#6C6F80]"
                    }`}
                  >
                    <span>{passwordStrength.hasMinLength ? "✓" : "○"}</span>
                    <span>Pelo menos 6 caracteres</span>
                  </div>
                  <div
                    className={`flex items-center space-x-2 text-xs ${
                      passwordStrength.hasNumber
                        ? "text-[#1DB67D]"
                        : "text-[#6C6F80]"
                    }`}
                  >
                    <span>{passwordStrength.hasNumber ? "✓" : "○"}</span>
                    <span>Pelo menos um número</span>
                  </div>
                  <div
                    className={`flex items-center space-x-2 text-xs ${
                      passwordStrength.hasSymbol
                        ? "text-[#1DB67D]"
                        : "text-[#6C6F80]"
                    }`}
                  >
                    <span>{passwordStrength.hasSymbol ? "✓" : "○"}</span>
                    <span>Pelo menos um símbolo (!@#$%^&*)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          {!isLogin && (
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Confirmar palavra-passe"
                value={confirmPassword || ""}
                onChange={(e) => setConfirmPassword?.(e.target.value)}
                required
                aria-label="Confirmar palavra-passe"
              />
              {confirmPassword && !passwordsMatch && (
                <div className="text-[#FF4F4F] text-xs">
                  As palavras-passe não coincidem
                </div>
              )}
            </div>
          )}
          {error && (
            <div className="text-[#FF4F4F] bg-[#FFECEC] rounded-md px-3 py-2 text-sm">
              {error}
            </div>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={loading || (!isLogin && !isFormValid())}
          >
            {loading
              ? isLogin
                ? "A entrar..."
                : "A criar..."
              : isLogin
              ? "Entrar"
              : "Criar Conta"}
          </Button>
          <div className="text-sm text-center text-[#6C6F80]">
            {isLogin ? (
              <>
                Não tem conta?{" "}
                <Link href="/signup" className="text-[#6753FF] underline">
                  Registe-se
                </Link>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <Link href="/login" className="text-[#6753FF] underline">
                  Entrar
                </Link>
              </>
            )}
          </div>
        </>
      )}
    </form>
  );
}
