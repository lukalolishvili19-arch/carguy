import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../shared/widgets/cg_widgets.dart';

class ExploreScreen extends StatelessWidget {
  const ExploreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
        children: [
          const CgBrandLogo(),
          const SizedBox(height: 16),
          GestureDetector(
            onTap: () => context.push('/search'),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              decoration: BoxDecoration(
                color: AppColors.surfaceElevated,
                borderRadius: BorderRadius.circular(AppTheme.radius),
              ),
              child: Row(
                children: [
                  Icon(Icons.search, color: Colors.white.withValues(alpha: 0.4)),
                  const SizedBox(width: 10),
                  Text('Search CarGuy…', style: TextStyle(color: Colors.white.withValues(alpha: 0.4))),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              _QuickTile(icon: Icons.shield_outlined, label: 'Insurance', color: AppColors.brandBlue, onTap: () => context.push('/insurance')),
              _QuickTile(icon: Icons.bolt, label: 'AI Mechanic', color: const Color(0xFFF59E0B), onTap: () => context.push('/ai')),
              _QuickTile(icon: Icons.qr_code_2, label: 'VIN', color: const Color(0xFF10B981), onTap: () => context.push('/vin')),
              _QuickTile(icon: Icons.forum_outlined, label: 'Forum', color: const Color(0xFF8B5CF6), onTap: () => context.push('/forum')),
            ].map((w) => Expanded(child: Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: w))).toList(),
          ),
          const SizedBox(height: 24),
          _SectionHeader(title: 'Services', onSeeAll: () => context.push('/services')),
          const SizedBox(height: 10),
          CgGlassCard(
            onTap: () => context.push('/services'),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(color: AppColors.brandRed.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(14)),
                  child: const Icon(Icons.build, color: AppColors.brandRed),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Find trusted workshops', style: TextStyle(fontWeight: FontWeight.w700)),
                      SizedBox(height: 4),
                      Text('Mechanics, detailing, tuning…', style: TextStyle(fontSize: 12, color: AppColors.white40)),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: AppColors.white40),
              ],
            ),
          ),
          const SizedBox(height: 20),
          _SectionHeader(title: 'Marketplace', onSeeAll: () => context.push('/marketplace')),
          const SizedBox(height: 10),
          CgGlassCard(
            onTap: () => context.push('/marketplace'),
            child: const Row(
              children: [
                Icon(Icons.storefront, color: AppColors.brandRed),
                SizedBox(width: 12),
                Expanded(child: Text('Buy & sell cars, parts, accessories', style: TextStyle(fontWeight: FontWeight.w600))),
                Icon(Icons.chevron_right, color: AppColors.white40),
              ],
            ),
          ),
          const SizedBox(height: 20),
          _SectionHeader(title: 'More', onSeeAll: null),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _ChipLink(label: 'Map', icon: Icons.map_outlined, route: '/map'),
              _ChipLink(label: 'News', icon: Icons.newspaper, route: '/news'),
              _ChipLink(label: 'Events', icon: Icons.event, route: '/events'),
              _ChipLink(label: 'Discounts', icon: Icons.local_offer_outlined, route: '/discounts'),
              _ChipLink(label: 'Booking', icon: Icons.event_available, route: '/booking'),
              _ChipLink(label: 'Messages', icon: Icons.chat_outlined, route: '/messages'),
            ],
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, this.onSeeAll});
  final String title;
  final VoidCallback? onSeeAll;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
        const Spacer(),
        if (onSeeAll != null)
          TextButton(onPressed: onSeeAll, child: const Text('See All', style: TextStyle(color: AppColors.brandRed, fontWeight: FontWeight.w700))),
      ],
    );
  }
}

class _QuickTile extends StatelessWidget {
  const _QuickTile({required this.icon, required this.label, required this.color, required this.onTap});
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: AppColors.brandGray,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
        ),
        child: Column(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
              child: Icon(icon, color: color, size: 18),
            ),
            const SizedBox(height: 8),
            Text(label, textAlign: TextAlign.center, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700)),
          ],
        ),
      ),
    );
  }
}

class _ChipLink extends StatelessWidget {
  const _ChipLink({required this.label, required this.icon, required this.route});
  final String label;
  final IconData icon;
  final String route;

  @override
  Widget build(BuildContext context) {
    return ActionChip(
      avatar: Icon(icon, size: 16, color: AppColors.brandRed),
      label: Text(label),
      onPressed: () => context.push(route),
      backgroundColor: AppColors.brandGray,
      side: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
    );
  }
}
