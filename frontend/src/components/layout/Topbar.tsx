import { Menu, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();

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
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 pr-4 border-r border-border">
            <div className="bg-blue-100 p-1.5 rounded-full text-blue-600">
              <UserIcon size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-none">{user?.username || "Loading..."}</span>
              <span className="text-xs text-muted-foreground capitalize mt-1">
                {user?.role || "Active Session"}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-destructive hover:bg-destructive/10 px-3 py-2 rounded-md transition-colors font-medium border border-transparent hover:border-destructive/20"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
