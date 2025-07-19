"use client";

import MainLayout from "@/components/layout/MainLayout";
import { DocumentsGallery } from "@/components/ui/documents-gallery";
import { createClientComponentClient, type User } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DocumentsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setUser(user);
      setLoading(false);
    };

    fetchUser();
  }, [supabase, router]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg text-[#6C6F80]">A carregar...</div>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        <DocumentsGallery userId={user.id} />
      </div>
    </MainLayout>
  );
} 