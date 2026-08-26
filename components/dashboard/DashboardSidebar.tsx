import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Settings,
  Store,
  UserPlus,
  LayoutGrid,
  TicketPercent,
  Palette,
  Home,
  Radio,
  PanelTop,
  Link2,
  Star,
  BarChart3,
  Tag,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "#root/components/ui/sidebar";
import { Link } from "#root/components/utils/Link";
import { Button } from "#root/components/ui/button";
import { useRole } from "#root/lib/context/RoleContext";
import { isSingleShopMode } from "#root/shared/config/app";

export function DashboardSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const { userRole } = useRole();

  // Build admin sidebar items based on shop mode
  const adminSidebarItemsBase = [
    {
      label: "Overview",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
  ];

  // Only show Vendors in multi-vendor mode
  if (!isSingleShopMode()) {
    adminSidebarItemsBase.push({
      label: "Vendors",
      href: "/dashboard/vendors",
      icon: Store,
    });
  }

  // Add remaining items
  const adminSidebarItems = [
    ...adminSidebarItemsBase,
    {
      label: "Categories",
      href: "/dashboard/categories",
      icon: LayoutGrid,
    },
    {
      label: "Products",
      href: "/dashboard/products",
      icon: Package,
    },
    {
      label: "Orders",
      href: "/dashboard/orders",
      icon: ShoppingCart,
    },
    {
      label: "Promo Codes",
      href: "/dashboard/promo-codes",
      icon: TicketPercent,
    },
    {
      label: "Offers",
      href: "/dashboard/offers",
      icon: Tag,
    },
    {
      label: "Reviews",
      href: "/dashboard/reviews",
      icon: Star,
    },
    {
      label: "Users",
      href: "/dashboard/users",
      icon: Users,
    },
    {
      label: "Homepage",
      href: "/dashboard/admin/homepage",
      icon: Home,
    },
    {
      label: "Layout",
      href: "/dashboard/admin/layout-settings",
      icon: PanelTop,
    },
    {
      label: "Templates",
      href: "/dashboard/admin/templates",
      icon: Palette,
    },
    {
      label: "Pixels & Tracking",
      href: "/dashboard/admin/pixels",
      icon: Radio,
    },
    {
      label: "Analytics",
      href: "/dashboard/admin/analytics",
      icon: BarChart3,
    },
    {
      label: "Links Page",
      href: "/dashboard/settings/links",
      icon: Link2,
    },
    {
      label: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
    },
  ];

  const defaultSidebarItems = [
    {
      label: "Overview",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Products",
      href: "/dashboard/products",
      icon: Package,
    },
    {
      label: "Orders",
      href: "/dashboard/orders",
      icon: ShoppingCart,
    },
  ];

  const sideBarItems =
    userRole === "admin" ? adminSidebarItems : defaultSidebarItems;

  return (
    <Sidebar collapsible='icon' className='h-full border-none'>
      <SidebarHeader className='flex justify-between'>
        <h1 className='font-bold text-lg group-data-[state=collapsed]:w-full group-data-[state=collapsed]:text-center group-data-[state=collapsed]:py-0 group-data-[state=collapsed]:px-0 py-2 px-3 '>
          D<span className='group-data-[state=collapsed]:hidden'>ashboard</span>
        </h1>
        <SidebarTrigger className='block md:hidden' />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className='pt-6'>
          {sideBarItems.map((item) => (
            <SidebarMenuItem key={item.href} className='py-2 px-3'>
              <Link
                href={item.href}
                className='group-data-[state=collapsed]:flex group-data-[state=collapsed]:justify-center'
                onClick={() => toggleSidebar()}>
                <SidebarMenuButton className='group-data-[state=collapsed]:flex group-data-[state=collapsed]:items-center group-data-[state=collapsed]:justify-center'>
                  <item.icon className='w-4 h-4  ' />
                  <span className='group-data-[state=collapsed]:hidden'>
                    {item.label}
                  </span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
