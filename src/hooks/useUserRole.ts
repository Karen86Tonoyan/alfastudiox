import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LOCAL_OPERATOR_MODE } from "@/lib/runtimeMode";

export function useUserRole() {
  const [role, setRole] = useState<string | null>(LOCAL_OPERATOR_MODE ? "admin" : null);
  const [loading, setLoading] = useState(!LOCAL_OPERATOR_MODE);

  useEffect(() => {
    if (LOCAL_OPERATOR_MODE) {
      setRole("admin");
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setRole("admin"); setLoading(false); return; }

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
