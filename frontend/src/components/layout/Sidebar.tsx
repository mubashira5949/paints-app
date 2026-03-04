import { NavLink } from "react-router-dom";
import { navigation, type UserRole } from "../../config/navigation";
import { X } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  userRole: UserRole;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function Sidebar({ userRole, isOpen, setIsOpen }: SidebarProps) {
  // Filter navigation items based on the current user's role
  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(userRole),
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b">
          <div className="flex items-center gap-2 font-bold text-xl text-primary tracking-tight">
            <div className="size-8 rounded bg-primary flex items-center justify-center text-primary-foreground">
              P
            </div>
            Paints App
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {filteredNavigation.map((item) => (
            <NavLink
              key={item.title}
              to={item.path}
              onClick={() => setIsOpen(false)} // Close on mobile navigation
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )
              }
            >
              <item.icon size={20} />
              {item.title}
            </NavLink>
          ))}
        </nav>

        {/* User preview snippet at the bottom */}
        <div className="p-4 border-t border-border mt-auto">
          <div className="flex items-center gap-3 rounded-md px-3 py-2 bg-secondary/50">
            <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {userRole === "manager" ? "M" : "W"}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-none">Jane Doe</span>
              <span className="text-xs text-muted-foreground capitalize mt-1">
                {userRole}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
