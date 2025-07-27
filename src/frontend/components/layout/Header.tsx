"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Coins, Loader2, LogOut, Star, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";

export default function Header() {
  const router = useRouter();
  const { user, profile, isLoading, signOut } = useAuthStore();

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  const handleProfile = () => {
    router.push("/profile");
  };

  if (isLoading) {
    return (
      <header className="w-full mx-auto px-6 md:px-12 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin text-[#6C6F80]" />
            <span className="text-sm text-[#6C6F80]">A carregar...</span>
          </div>
        </div>
      </header>
    );
  }

  return (
    <section className="flex items-end">
      {user && (
        <div className="flex items-center space-x-4">
          {/* Badge de Créditos */}
          <Badge
            variant="default"
            className="bg-[#6753FF] hover:bg-[#4E3BC0] text-white px-3 py-2 text-sm font-medium"
          >
            <Coins className="h-4 w-4 mr-2" />
            {profile?.credits_remaining || 0}
          </Badge>

          {/* Badge de Pontos XP */}
          <Badge
            variant="default"
            className="bg-[#1DB67D] hover:bg-[#16A765] text-white px-3 py-2 text-sm font-medium"
          >
            <Star className="h-4 w-4 mr-2" />
            {profile?.xp_points || 0}
          </Badge>

          {/* Ícone de Perfil */}
          <Button
            onClick={handleProfile}
            variant="ghost"
            size="sm"
            className="p-2 rounded-full hover:bg-[#EEF0FF]"
            aria-label="Perfil"
          >
            <UserIcon className="h-5 w-5" />
          </Button>

          {/* Ícone de Logout */}
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="p-2 rounded-full hover:bg-[#EEF0FF] text-[#6C6F80] hover:text-[#FF4F4F]"
            aria-label="Terminar sessão"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      )}
    </section>
  );
}
