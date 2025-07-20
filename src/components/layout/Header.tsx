"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  createClientComponentClient,
  type User,
} from "@supabase/auth-helpers-nextjs";
import { Coins, Loader2, LogOut, Star, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface UserProfile {
  credits_remaining: number;
  xp_points: number;
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchUserData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Buscar perfil do utilizador
        const { data: profileData } = await supabase
          .from("user_profiles")
          .select("credits_remaining, xp_points")
          .eq("id", user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
        }
      }

      setLoading(false);
    };

    fetchUserData();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleProfile = () => {
    router.push("/profile");
  };

  if (loading) {
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
    <section className="px-6 md:px-6 py-3 flex items-end">
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
