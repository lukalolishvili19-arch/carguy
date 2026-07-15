import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/auth_provider.dart';

final profileMeProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  return api.get('/profiles/me', (j) => Map<String, dynamic>.from(j as Map));
});

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  final _displayName = TextEditingController();
  final _bio = TextEditingController();
  final _city = TextEditingController();
  final _country = TextEditingController();
  final _phone = TextEditingController();
  bool _loaded = false;
  bool _saving = false;

  @override
  void dispose() {
    _displayName.dispose();
    _bio.dispose();
    _city.dispose();
    _country.dispose();
    _phone.dispose();
    super.dispose();
  }

  void _fillFromProfile(Map<String, dynamic> data) {
    if (_loaded) return;
    final profile = data['profile'] is Map
        ? Map<String, dynamic>.from(data['profile'] as Map)
        : data;
    _displayName.text = profile['displayName']?.toString() ?? '';
    _bio.text = profile['bio']?.toString() ?? '';
    _city.text = profile['city']?.toString() ?? '';
    _country.text = profile['country']?.toString() ?? '';
    _phone.text = profile['phone']?.toString() ?? '';
    _loaded = true;
  }

  Future<void> _save() async {
    if (_saving) return;
    setState(() => _saving = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.put(
        '/profiles/me',
        (j) => Map<String, dynamic>.from(j as Map),
        data: {
          'displayName': _displayName.text.trim(),
          'bio': _bio.text.trim().isEmpty ? null : _bio.text.trim(),
          'city': _city.text.trim().isEmpty ? null : _city.text.trim(),
          'country': _country.text.trim().isEmpty ? null : _country.text.trim(),
          'phone': _phone.text.trim().isEmpty ? null : _phone.text.trim(),
        },
      );
      await ref.read(authProvider.notifier).refreshMe();
      ref.invalidate(profileMeProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile saved')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(ApiClient.errorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _logout() async {
    await ref.read(authProvider.notifier).logout();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Signed out')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final profile = ref.watch(profileMeProvider);

    if (auth.status != AuthStatus.authenticated) {
      return Scaffold(
        appBar: AppBar(title: const Text('Settings')),
        body: const Center(child: Text('Sign in to edit your profile')),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: profile.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(ApiClient.errorMessage(e))),
        data: (data) {
          _fillFromProfile(data);
          final avatar = data['avatarUrl']?.toString() ??
              (data['profile'] is Map ? (data['profile'] as Map)['avatarUrl']?.toString() : null);
          final user = auth.user;

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Center(
                child: CircleAvatar(
                  radius: 44,
                  backgroundImage: avatar != null ? CachedNetworkImageProvider(avatar) : null,
                  child: avatar == null ? Text((user?.username ?? '?').substring(0, 1).toUpperCase()) : null,
                ),
              ),
              const SizedBox(height: 8),
              Center(child: Text('@${user?.username ?? ''}', style: TextStyle(color: Colors.white.withValues(alpha: 0.6)))),
              const SizedBox(height: 24),
              TextField(controller: _displayName, decoration: const InputDecoration(labelText: 'Display name')),
              const SizedBox(height: 12),
              TextField(controller: _bio, decoration: const InputDecoration(labelText: 'Bio'), maxLines: 3),
              const SizedBox(height: 12),
              TextField(controller: _city, decoration: const InputDecoration(labelText: 'City')),
              const SizedBox(height: 12),
              TextField(controller: _country, decoration: const InputDecoration(labelText: 'Country')),
              const SizedBox(height: 12),
              TextField(controller: _phone, decoration: const InputDecoration(labelText: 'Phone'), keyboardType: TextInputType.phone),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: _saving ? null : _save,
                child: _saving
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('Save profile'),
              ),
              const SizedBox(height: 32),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.logout),
                title: const Text('Sign out'),
                onTap: _logout,
              ),
              if (user != null) ...[
                const SizedBox(height: 8),
                Text('Account', style: Theme.of(context).textTheme.labelSmall),
                ListTile(
                  title: Text(user.email ?? 'No email'),
                  subtitle: Text('Role: ${user.role}'),
                ),
                if (user.businessSubscription != null)
                  ListTile(
                    title: const Text('Business subscription'),
                    subtitle: Text(user.businessSubscription!.status),
                  ),
              ],
            ],
          );
        },
      ),
    );
  }
}
