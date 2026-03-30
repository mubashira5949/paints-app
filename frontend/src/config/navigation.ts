import {
  LayoutDashboard,
  Users,
  Package,
  Settings,
  Factory,
  Beaker,
  ShoppingCart,
  History,
  ClipboardList,
  UserRound,
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
    title: "New Sale",
    path: "/sales/new",
    icon: ShoppingCart,
    roles: ["manager", "operator", "sales", "admin"],
  },
  {
    title: "Sales History",
    path: "/sales/history",
    icon: History,
    roles: ["manager", "sales", "admin"],
  },
  {
    title: "Orders",
    path: "/sales/orders",
    icon: ClipboardList,
    roles: ["manager", "sales", "admin"],
  },
  {
    title: "Clients",
    path: "/clients",
    icon: UserRound,
    roles: ["manager", "sales", "admin"],
  },
  {
    title: "Recipes",
    path: "/recipes",
    icon: Beaker,
    roles: ["manager", "admin", "operator"],
  },
  {
    title: "Users",
    path: "/users",
    icon: Users,
    roles: ["manager", "admin"],  // Manager and Admin
  },
  {
    title: "Settings",
    path: "/settings",
    icon: Settings,
    roles: ["manager", "admin"],
  },
];
