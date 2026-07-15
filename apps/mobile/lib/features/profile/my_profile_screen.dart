import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/cg_widgets.dart';

/// Logged-in user's own profile tab (bottom nav).
class MyProfileScreen extends ConsumerWidget {
  const MyProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    if (auth.status != AuthStatus.authenticated || auth.user == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Sign in to view profile', style: TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 16),
              CgPrimaryButton(label: 'Sign In', onPressed: () => context.go('/login')),
            ],
          ),
        ),
      );
    }

    final user = auth.user!;
    final name = user.profile?.displayName ?? user.username;
    final avatar = user.profile?.avatarUrl;
    final cover = user.profile?.coverUrl;

    return SafeArea(
      bottom: false,
      child: ListView(
        children: [
          SizedBox(
            height: 160,
            child: Stack(
              fit: StackFit.expand,
              children: [
                if (cover != null)
                  CachedNetworkImage(imageUrl: cover, fit: BoxFit.cover)
                else
                  Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(colors: [AppColors.brandGray, AppColors.brandBlack]),
                    ),
                  ),
                Positioned(
                  left: 16,
                  bottom: 12,
                  child: CircleAvatar(
                    radius: 36,
                    backgroundColor: AppColors.brandBlack,
                    backgroundImage: avatar != null ? CachedNetworkImageProvider(avatar) : null,
                    child: avatar == null ? Text(name.characters.first.toUpperCase(), style: const TextStyle(fontSize: 24)) : null,
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
                Text('@${user.username}', style: TextStyle(color: Colors.white.withValues(alpha: 0.45))),
                if (user.profile?.bio != null) ...[
                  const SizedBox(height: 8),
                  Text(user.profile!.bio!),
                ],
                const SizedBox(height: 16),
                Row(
                  children: [
                    _LinkChip(icon: Icons.settings_outlined, label: 'Settings', onTap: () => context.push('/settings')),
                    _LinkChip(icon: Icons.chat_outlined, label: 'Messages', onTap: () => context.push('/messages')),
                    _LinkChip(icon: Icons.notifications_outlined, label: 'Alerts', onTap: () => context.push('/notifications')),
                  ],
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    ActionChip(label: const Text('Dashboard'), onPressed: () => context.push('/dashboard')),
                    ActionChip(label: const Text('Business'), onPressed: () => context.push('/billing/checkout')),
                    ActionChip(
                      label: const Text('Log out'),
                      onPressed: () async {
                        await ref.read(authProvider.notifier).logout();
                        if (context.mounted) context.go('/login');
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _LinkChip extends StatelessWidget {
  const _LinkChip({required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.only(right: 8),
        child: OutlinedButton.icon(
          onPressed: onTap,
          icon: Icon(icon, size: 16),
          label: Text(label, style: const TextStyle(fontSize: 12)),
          style: OutlinedButton.styleFrom(
            minimumSize: const Size(0, 40),
            side: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
          ),
        ),
      ),
    );
  }
}
