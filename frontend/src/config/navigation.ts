import {
  LayoutDashboard,
  Users,
  Package,
  Settings,
  Factory,
} from "lucide-react";

export type UserRole = "manager" | "operator" | "sales" | "admin" | "worker";

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
    roles: ["manager", "operator", "sales", "admin", "worker"],
  },
  {
    title: "Production",
    path: "/production",
    icon: Factory,
    roles: ["manager", "operator", "admin", "worker"],
  },
  {
    title: "Inventory",
    path: "/inventory",
    icon: Package,
    roles: ["manager", "operator", "sales", "admin", "worker"],
  },
  {
    title: "Users",
    path: "/users",
    icon: Users,
    roles: ["manager", "admin"],  // Manager and Admin
  },
  {
    title: "Settings",
    path: "/path", // the path mapping in config was /settings
    icon: Settings,
    roles: ["manager", "admin"],
  },
];
