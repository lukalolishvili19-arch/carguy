import {
  Home,
  Newspaper,
  ShoppingBag,
  Wrench,
  MapPin,
  Tag,
  CalendarCheck,
  Car,
  Users,
  CalendarDays,
  Shield,
  MessageCircle,
  Bell,
  Bot,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  key: string;
  href: string;
  icon: LucideIcon;
  auth?: boolean;
}

export const primaryNav: NavItem[] = [
  { key: 'home', href: '/', icon: Home },
  { key: 'news', href: '/news', icon: Newspaper },
  { key: 'marketplace', href: '/marketplace', icon: ShoppingBag },
  { key: 'services', href: '/services', icon: Wrench },
  { key: 'map', href: '/map', icon: MapPin },
  { key: 'discounts', href: '/discounts', icon: Tag },
  { key: 'booking', href: '/booking', icon: CalendarCheck, auth: true },
  { key: 'garage', href: '/garage', icon: Car, auth: true },
  { key: 'forum', href: '/forum', icon: Users },
  { key: 'events', href: '/events', icon: CalendarDays },
  { key: 'insurance', href: '/insurance', icon: Shield },
  { key: 'aiMechanic', href: '/ai', icon: Bot, auth: true },
];

export const secondaryNav: NavItem[] = [
  { key: 'messages', href: '/messages', icon: MessageCircle, auth: true },
  { key: 'notifications', href: '/notifications', icon: Bell, auth: true },
  { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard, auth: true },
];

export const mobileNav: NavItem[] = [
  { key: 'home', href: '/', icon: Home },
  { key: 'marketplace', href: '/marketplace', icon: ShoppingBag },
  { key: 'map', href: '/map', icon: MapPin },
  { key: 'garage', href: '/garage', icon: Car, auth: true },
  { key: 'messages', href: '/messages', icon: MessageCircle, auth: true },
];
