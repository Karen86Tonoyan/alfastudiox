import { useLocation, Link } from "react-router-dom";
import {
  GitBranch, Box, Activity, Clock, Image, ChevronLeft, ChevronRight,
  Layers, AlertTriangle, Sparkles, Settings, Crown, Cloud, ShieldCheck, Camera
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Photo Studio", path: "/", icon: Camera, highlight: true },
  { title: "Render Studio", path: "/render", icon: Sparkles },
  { title: "Workflow", path: "/workflow", icon: GitBranch },
  { title: "Orchestrator", path: "/orchestrator", icon: Layers },
  { title: "Models", path: "/models", icon: Box },
  { title: "Monitor", path: "/monitor", icon: Activity },
  { title: "Error Log", path: "/errors", icon: AlertTriangle },
  { title: "History", path: "/history", icon: Clock },
  { title: "Gallery", path: "/gallery", icon: Image },
  { title: "Providers", path: "/providers", icon: Cloud },
  { title: "TIP Auditor", path: "/tip-auditor", icon: ShieldCheck },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-sidebar transition-all duration-200",
        collapsed ? "w-14" : "w-52"
      )}
    >
      {/* Logo */}
      <div className="flex h-12 items-center border-b border-border px-3">
        {!collapsed && (
          <span className="text-sm font-bold tracking-wider gold-text flex items-center gap-1.5">
            <Crown className="h-4 w-4 text-primary" />
            AI DIRECTOR
          </span>
        )}
        {collapsed && <Crown className="h-4 w-4 text-primary mx-auto" />}
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
      <nav className="flex-1 space-y-0.5 p-2">
        {navItems.map((item) => {
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
      {!collapsed && (
        <div className="border-t border-border p-3">
          <p className="text-[10px] text-muted-foreground font-mono">AI Director v1.0</p>
        </div>
      )}
    </aside>
  );
}
