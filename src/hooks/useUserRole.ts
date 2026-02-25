import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useUserRole() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      setRole(data?.role ?? "user");
      setLoading(false);
    };
    fetchRole();
  }, []);

  return { role, isAdmin: role === "admin", loading };
}
