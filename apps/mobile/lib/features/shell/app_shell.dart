import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.child, required this.location});
  final Widget child;
  final String location;

  int get _index {
    if (location.startsWith('/explore')) return 1;
    if (location.startsWith('/create')) return 2;
    if (location.startsWith('/garage')) return 3;
    if (location.startsWith('/profile') || location.startsWith('/u/')) return 4;
    return 0;
  }

  void _go(BuildContext context, int i) {
    switch (i) {
      case 0:
        context.go('/');
      case 1:
        context.go('/explore');
      case 2:
        context.go('/create');
      case 3:
        context.go('/garage');
      case 4:
        context.go('/profile');
    }
  }

  bool get _hideNav {
    final path = Uri.parse(location).path;
    return path.startsWith('/messages/') ||
        (path.contains('/marketplace/') && path != '/marketplace') ||
        (path.startsWith('/services/') && path != '/services') ||
        (path.startsWith('/news/') && path != '/news') ||
        (path.startsWith('/forum/') && path != '/forum') ||
        (path.startsWith('/events/') && path != '/events');
  }

  @override
  Widget build(BuildContext context) {
    final i = _index;
    return Scaffold(
      backgroundColor: AppColors.brandBlack,
      body: child,
      bottomNavigationBar: _hideNav
          ? null
          : Container(
              decoration: const BoxDecoration(
                color: AppColors.navBar,
                border: Border(top: BorderSide(color: AppColors.white08)),
              ),
              padding: EdgeInsets.only(bottom: MediaQuery.paddingOf(context).bottom + 8, top: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _NavItem(icon: Icons.home_outlined, activeIcon: Icons.home, label: 'Feed', active: i == 0, onTap: () => _go(context, 0)),
                  _NavItem(icon: Icons.explore_outlined, activeIcon: Icons.explore, label: 'Explore', active: i == 1, onTap: () => _go(context, 1)),
                  _CreateButton(onTap: () => _go(context, 2)),
                  _NavItem(icon: Icons.directions_car_outlined, activeIcon: Icons.directions_car, label: 'Garage', active: i == 3, onTap: () => _go(context, 3)),
                  _NavItem(icon: Icons.person_outline, activeIcon: Icons.person, label: 'Profile', active: i == 4, onTap: () => _go(context, 4)),
                ],
              ),
            ),
    );
  }
}

class _CreateButton extends StatelessWidget {
  const _CreateButton({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Transform.translate(
      offset: const Offset(0, -10),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: AppColors.brandRed,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(color: AppColors.brandRed.withValues(alpha: 0.4), blurRadius: 20, offset: const Offset(0, 4)),
            ],
          ),
          child: const Icon(Icons.add, color: Colors.white, size: 26),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.active,
    required this.onTap,
  });
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = active ? AppColors.brandRed : Colors.white.withValues(alpha: 0.4);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(active ? activeIcon : icon, color: color, size: 22),
            const SizedBox(height: 4),
            Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: color)),
          ],
        ),
      ),
    );
  }
}
