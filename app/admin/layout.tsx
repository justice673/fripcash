"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { AdminDateFilter } from "@/components/admin/admin-date-filter";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import {
  clearAdminSession,
  hasAdminSession,
} from "@/lib/admin-session";
import { fetchAdminMe, readToken } from "@/lib/api";
import { ThemeProvider } from "next-themes";

const pageLabels: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/sessions": "Sessions",
  "/admin/rapports": "Rapports",
  "/admin/zones": "Zones",
  "/admin/tarifs-livraison": "Tarifs livraison",
  "/admin/livreurs": "Livreurs",
  "/admin/utilisateurs": "Utilisateurs",
  "/admin/validations": "Validations",
  "/admin/articles": "Articles",
  "/admin/commandes": "Commandes",
  "/admin/categories": "Catégories",
  "/admin/promotions": "Promotions",
  "/admin/signalements": "Signalements",
  "/admin/litiges": "Litiges",
  "/admin/porte-monnaies": "Porte-monnaies",
  "/admin/partenaires": "Enseignes partenaires",
  "/admin/parametres": "Paramètres",
};

function AdminHeader() {
  const pathname = usePathname();
  const pageLabel = pageLabels[pathname] ?? "Administration";

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 md:px-6 lg:px-8">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">
            <BreadcrumbLink asChild>
              <Link href="/admin">Admin</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden md:block" />
          <BreadcrumbItem>
            <BreadcrumbPage>{pageLabel}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-2">
        <AdminDateFilter />
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Rechercher..."
            className="h-9 w-48 lg:w-64 rounded-lg border border-input bg-muted/30 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-accent"
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
        </button>
      </div>
    </header>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function gate() {
      // Fast reject: no token / no local admin flag
      if (!readToken() || !hasAdminSession()) {
        clearAdminSession();
        router.replace("/connexion?mode=email");
        return;
      }
      try {
        // Real gate: Nest /admin/me → 403 for seller/buyer
        const me = await fetchAdminMe();
        if (cancelled) return;
        if (!me || (me as { isAdmin?: boolean }).isAdmin === false) {
          clearAdminSession();
          router.replace("/connexion?mode=email");
          return;
        }
        setReady(true);
      } catch {
        if (cancelled) return;
        clearAdminSession();
        router.replace("/connexion?mode=email");
      }
    }

    void gate();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="admin-shell flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
    >
      <div className="admin-shell min-h-svh bg-background text-foreground">
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="min-w-0 bg-background">
            <AdminHeader />
            <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8">
              <div className="w-full min-w-0 flex-1">{children}</div>
            </div>
          </SidebarInset>
          <Toaster richColors position="top-right" />
        </SidebarProvider>
      </div>
    </ThemeProvider>
  );
}
