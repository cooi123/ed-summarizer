"use client";

import { useParams, usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { useUnitStore } from "@/store/unitStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function UnitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const unitId = params.unitId as string;
  const unit = useUnitStore((state) => state.unit);

  const navigation = [
    {
      name: "Overview",
      href: `/dashboard/units/${unitId}`,
      icon: Home,
    },
    {
      name: "Weekly FAQ",
      href: `/dashboard/units/${unitId}/weekly-faq`,
      icon: Home,
    },
    {
      name: "Question Clusters",
      href: `/dashboard/units/${unitId}/question-clusters`,
      icon: Home,
    },
    {
      name: "Analysis",
      href: `/dashboard/units/${unitId}/analysis`,
      icon: Home,
    },
    {
      name: "Settings",
      href: `/dashboard/units/${unitId}/settings`,
      icon: Home,
    },
  ];

  // Get current page name from pathname
  const getCurrentPageName = () => {
    const path = pathname.split('/').pop();
    if (!path || path === unitId) return "Overview";
    
    // Convert path to title case and replace hyphens with spaces
    return path
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="min-h-screen">
      <div className="border-b">
        <div className="flex flex-col">
          {/* Breadcrumbs */}
          <div className="px-4 py-2 bg-muted/40">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="inline-flex items-center space-x-1 md:space-x-3">
                <li className="inline-flex items-center">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600"
                  >
                    <Home className="mr-2 h-4 w-4" />
                    Units
                  </Link>
                </li>
                <li>
                  <div className="flex items-center">
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                    <Link
                      href={`/dashboard/units/${unitId}`}
                      className="ml-1 text-sm font-medium text-gray-700 hover:text-blue-600 md:ml-2"
                    >
                      {unit?.code}
                    </Link>
                  </div>
                </li>
                {pathname !== `/dashboard/units/${unitId}` && (
                  <li>
                    <div className="flex items-center">
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                      <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">
                        {getCurrentPageName()}
                      </span>
                    </div>
                  </li>
                )}
              </ol>
            </nav>
          </div>

          {/* Navigation */}
          <div className="flex h-12 items-center px-4">
            <nav className="flex items-center space-x-4 lg:space-x-6">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    item.href === pathname
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-6">
        {children}
      </div>
    </div>
  );
} 