import { useLocation, Link } from "react-router-dom";
import {
  GitBranch,
  Box,
  Activity,
  Clock,
  Image,
  ChevronLeft,
  ChevronRight,
  Layers,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Workflow", path: "/", icon: GitBranch },
  { title: "Orchestrator", path: "/orchestrator", icon: Layers },
  { title: "Modele", path: "/models", icon: Box },
  { title: "Monitor", path: "/monitor", icon: Activity },
  { title: "Error Log", path: "/errors", icon: AlertTriangle },
  { title: "Historia", path: "/history", icon: Clock },
  { title: "Galeria", path: "/gallery", icon: Image },
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
          <span className="text-sm font-bold tracking-wider text-primary">
            ComfyUI
          </span>
        )}
        <button
          onClick={onToggle}
          className="ml-auto rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-primary font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t border-border p-3">
          <p className="text-[10px] text-muted-foreground">VS Plugin v0.1</p>
        </div>
      )}
    </aside>
  );
}
