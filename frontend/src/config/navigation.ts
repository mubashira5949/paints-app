import {
  LayoutDashboard,
  Users,
  Package,
  Settings,
  Factory,
} from "lucide-react";

export type UserRole = "manager" | "worker";

export interface NavItem {
  title: string;
  path: string;
  icon: React.ElementType;
  roles: UserRole[];
}

export const navigation: NavItem[] = [
  {
    title: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    roles: ["manager", "worker"],
  },
  {
    title: "Inventory",
    path: "/inventory",
    icon: Package,
    roles: ["manager", "worker"],
  },
  {
    title: "Production",
    path: "/production",
    icon: Factory,
    roles: ["manager", "worker"],
  },
  {
    title: "Users",
    path: "/users",
    icon: Users,
    roles: ["manager"],
  },
  {
    title: "Settings",
    path: "/settings",
    icon: Settings,
    roles: ["manager"],
  },
];
