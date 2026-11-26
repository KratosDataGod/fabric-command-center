import {
  BarChart3, BookOpen, Briefcase, DollarSign, Gauge, Globe, Heart, type LucideIcon,
  Settings, Shield, Sparkles, Truck, Users,
} from 'lucide-react';

import type { ProfileIcon } from '@/config';

const ICONS: Record<ProfileIcon, LucideIcon> = {
  chart: BarChart3, shield: Shield, cog: Settings, users: Users, briefcase: Briefcase, globe: Globe,
  gauge: Gauge, dollar: DollarSign, book: BookOpen, sparkles: Sparkles, truck: Truck, heart: Heart,
};

export function ProfileGlyph({ icon, className }: { icon?: ProfileIcon; className?: string }) {
  const Icon = ICONS[icon ?? 'chart'] ?? BarChart3;
  return <Icon className={className ?? 'icon-size-200'} aria-hidden />;
}
