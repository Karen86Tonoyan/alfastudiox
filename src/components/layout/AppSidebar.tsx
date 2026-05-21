import { useLocation, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  GitBranch, Box, Activity, Clock, Image, ChevronLeft, ChevronRight,
  Layers, AlertTriangle, Sparkles, Crown, Cloud, ShieldCheck, Camera, LayoutDashboard, LogOut, CreditCard, UserCog, Shield, Key,
  Lightbulb, Users, Clapperboard, Brain, Workflow, PenTool, Network, Settings2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import alfaLogo from "@/assets/alfa-logo.png";
import { useUserRole } from "@/hooks/useUserRole";

const navItems = [
  { title: "Dashboard", path: "/dashboard", icon: LayoutDashboard, highlight: true, adminOnly: false },
  { title: "Kup Kredyty", path: "/buy-credits", icon: CreditCard, highlight: true, adminOnly: false },
  { title: "Plany", path: "/subscribe", icon: Crown, highlight: true, adminOnly: false },
  { title: "Photo Studio", path: "/", icon: Camera, highlight: true, adminOnly: false },
  { title: "Edytor", path: "/editor", icon: PenTool, highlight: true, adminOnly: false },
  { title: "Render Studio", path: "/render", icon: Sparkles, highlight: false, adminOnly: false },
  { title: "Workflow", path: "/workflow", icon: GitBranch, highlight: false, adminOnly: false },
  { title: "Orchestrator", path: "/orchestrator", icon: Layers, highlight: false, adminOnly: false },
  { title: "Cluster (PC)", path: "/cluster", icon: Network, highlight: true, adminOnly: false },
  { title: "Controller Config", path: "/controller-config", icon: Settings2, highlight: false, adminOnly: false },
  { title: "Models", path: "/models", icon: Box, highlight: false, adminOnly: false },
  { title: "Monitor", path: "/monitor", icon: Activity, highlight: false, adminOnly: false },
  { title: "Error Log", path: "/errors", icon: AlertTriangle, highlight: false, adminOnly: false },
  { title: "History", path: "/history", icon: Clock, highlight: false, adminOnly: false },
  { title: "Gallery", path: "/gallery", icon: Image, highlight: false, adminOnly: false },
  { title: "Providers", path: "/providers", icon: Cloud, highlight: false, adminOnly: false },
  { title: "Klucze API", path: "/api-keys-guide", icon: Key, highlight: false, adminOnly: false },
  { title: "AI Ideas", path: "/ideas", icon: Lightbulb, highlight: false, adminOnly: false },
  { title: "Biblioteka AI", path: "/library", icon: Users, highlight: false, adminOnly: false },
  { title: "One Prompt → Film", path: "/movie-pipeline", icon: Clapperboard, highlight: true, adminOnly: false },
  { title: "Pamięć Promptów", path: "/prompt-memory", icon: Brain, highlight: false, adminOnly: false },
  { title: "Automation Hub", path: "/automation", icon: Workflow, highlight: true, adminOnly: false },
  { title: "TIP Auditor", path: "/tip-auditor", icon: ShieldCheck, highlight: false, adminOnly: false },
  { title: "Admin Panel", path: "/admin", icon: Shield, highlight: true, adminOnly: true },
  { title: "Profil", path: "/profile", icon: UserCog, highlight: true, adminOnly: false },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState("U");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("avatar_url, display_name, email").eq("user_id", user.id).single();
      if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      const name = data?.display_name || data?.email || "U";
      setInitials(name.substring(0, 2).toUpperCase());
    };
    load();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-sidebar transition-all duration-200",
        collapsed ? "w-14" : "w-52"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-border px-2">
        {!collapsed && (
          <img src={alfaLogo} alt="ALFA by K.Tonoyan" className="h-10 w-auto object-contain" />
        )}
        {collapsed && (
          <img src={alfaLogo} alt="ALFA" className="h-8 w-8 object-contain mx-auto" />
        )}
        <button
          onClick={onToggle}
          className={cn(
            "rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground",
            collapsed ? "" : "ml-auto"
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 p-2 overflow-y-auto">
        {navItems.filter((item) => !item.adminOnly || isAdmin).map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all",
                active
                  ? "bg-primary/10 text-primary font-medium border border-primary/20"
                  : item.highlight
                  ? "text-primary/60 hover:bg-primary/5 hover:text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3 space-y-2">
        <Link
          to="/profile"
          className={cn(
            "flex items-center gap-3 rounded-md px-2 py-2 hover:bg-secondary transition-all",
            collapsed && "justify-center px-0"
          )}
        >
          <Avatar className="h-7 w-7 border border-primary/20">
            <AvatarImage src={avatarUrl ?? undefined} alt="Avatar" />
            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">{initials}</AvatarFallback>
          </Avatar>
          {!collapsed && <span className="text-xs text-foreground truncate">Mój profil</span>}
        </Link>
        <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
          <AlertDialogTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-all",
                collapsed && "justify-center px-0"
              )}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Wyloguj</span>}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Wylogować się?</AlertDialogTitle>
              <AlertDialogDescription>
                Czy na pewno chcesz się wylogować z ALFA Studio?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anuluj</AlertDialogCancel>
              <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Wyloguj
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {!collapsed && (
          <p className="text-[10px] text-muted-foreground font-mono">ALFA Studio v1.0</p>
        )}
      </div>
    </aside>
  );
}
