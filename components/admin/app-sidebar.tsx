"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Activity,
  Map,
  Grid3x3,
  Truck,
  Users,
  ShoppingBag,
  ShoppingCart,
  Tags,
  Megaphone,
  Flag,
  AlertTriangle,
  CreditCard,
  Briefcase,
  Settings,
  LogOut,
  ChevronsUpDown,
  BadgeCheck,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLogout } from "@/hooks/use-auth";
import { clearAdminSession } from "@/lib/admin-session";
import { toast } from "sonner";

const navSections = [
  {
    title: "Monitoring",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/sessions", label: "Sessions", icon: Activity },
      { href: "/admin/rapports", label: "Rapports", icon: BarChart3 },
    ],
  },
  {
    title: "Cartographie",
    items: [
      { href: "/admin/zones", label: "Zones", icon: Map },
      { href: "/admin/tarifs-livraison", label: "Tarifs livraison", icon: Grid3x3 },
    ],
  },
  {
    title: "Logistique",
    items: [{ href: "/admin/livreurs", label: "Livreurs", icon: Truck }],
  },
  {
    title: "Catalogue & modération",
    items: [
      { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
      { href: "/admin/validations", label: "Validations", icon: BadgeCheck },
      { href: "/admin/articles", label: "Articles", icon: ShoppingBag },
      { href: "/admin/commandes", label: "Commandes", icon: ShoppingCart },
      { href: "/admin/categories", label: "Catégories", icon: Tags },
      { href: "/admin/promotions", label: "Promotions", icon: Megaphone },
      { href: "/admin/signalements", label: "Signalements", icon: Flag },
      { href: "/admin/litiges", label: "Litiges", icon: AlertTriangle },
    ],
  },
  {
    title: "Finances & partenaires",
    items: [
      { href: "/admin/porte-monnaies", label: "Porte-monnaies", icon: CreditCard },
      { href: "/admin/partenaires", label: "Enseignes", icon: Briefcase },
      { href: "/admin/parametres", label: "Paramètres", icon: Settings },
    ],
  },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useLogout();
  const { setOpenMobile } = useSidebar();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const handleLogout = () => {
    logout();
    clearAdminSession();
    toast.success("Déconnexion réussie");
    router.push("/connexion?mode=email");
  };

  const closeMobile = () => setOpenMobile(false);

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/admin" onClick={closeMobile}>
                <Image
                  src="/images/fripcash-logo.png"
                  alt="FripCash"
                  width={64}
                  height={64}
                  className="size-8 object-contain"
                />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">FripCash</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Administration
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navSections.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(pathname, item.href, item.exact)}
                      tooltip={item.label}
                    >
                      <Link href={item.href} onClick={closeMobile}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                      AD
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Super Admin</span>
                    <span className="truncate text-xs text-muted-foreground">
                      admin@fripcash.com
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem asChild>
                  <Link href="/admin/parametres">Paramètres</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setLogoutOpen(true)}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />

      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer la déconnexion</DialogTitle>
            <DialogDescription>
              Vous allez quitter l&apos;espace Super Admin. Vous devrez vous
              reconnecter pour accéder au tableau de bord.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setLogoutOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Se déconnecter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
