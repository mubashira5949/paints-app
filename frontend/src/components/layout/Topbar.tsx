import { Menu } from "lucide-react";

interface TopbarProps {
  onMenuClick: () => void;
  userRole: string; // Used strictly for demonstration toggle bridging
  onRoleToggle: () => void; // Used strictly for demonstration toggle bridging
}

export function Topbar({ onMenuClick, userRole, onRoleToggle }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 border-b bg-background px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-muted-foreground hover:text-foreground lg:hidden"
        onClick={onMenuClick}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Separator for mobile */}
      <div className="h-6 w-px bg-border lg:hidden" aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 justify-end items-center">
        {/* Mock Role Switcher for demonstration */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground block hidden sm:block">
            Testing Role:
          </span>
          <button
            onClick={onRoleToggle}
            className="text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3 py-1.5 rounded-full font-medium transition-colors"
          >
            Switch to {userRole === "manager" ? "Worker" : "Manager"}
          </button>
        </div>
      </div>
    </header>
  );
}
