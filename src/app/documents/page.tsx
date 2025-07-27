"use client";

import { DocumentsGallery } from "@/frontend/components/ui/documents-gallery";
import {
  createClientComponentClient,
  type User,
} from "@supabase/auth-helpers-nextjs";
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
      <div className="flex items-center justify-center min-h-[400px] w-full">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#6753FF]" />
          <span className="text-lg text-[#6C6F80]">A carregar...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="w-full">
      <DocumentsGallery userId={user.id} />
    </div>
  );
}
