import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../../core/api/api_client.dart';
import '../../core/auth/auth_provider.dart';

final dashboardProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  return api.get('/businesses/me/dashboard', (j) => Map<String, dynamic>.from(j as Map));
});

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final dashboard = ref.watch(dashboardProvider);

    if (auth.status != AuthStatus.authenticated) {
      return Scaffold(
        appBar: AppBar(title: const Text('Dashboard')),
        body: const Center(child: Text('Sign in to access your business dashboard')),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Business Dashboard')),
      body: dashboard.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.store_outlined, size: 48),
                const SizedBox(height: 12),
                Text(ApiClient.errorMessage(e), textAlign: TextAlign.center),
                const SizedBox(height: 8),
                const Text('Add a business profile to see analytics.', textAlign: TextAlign.center),
              ],
            ),
          ),
        ),
        data: (data) {
          final kpis = data['kpis'] is Map ? data['kpis'] as Map : data;
          final recent = data['recentBookings'] is List
              ? (data['recentBookings'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList()
              : <Map<String, dynamic>>[];

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(dashboardProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 1.4,
                  children: [
                    _KpiCard(
                      icon: Icons.calendar_month,
                      label: 'Total bookings',
                      value: '${kpis['totalBookings'] ?? 0}',
                    ),
                    _KpiCard(
                      icon: Icons.pending_actions,
                      label: 'Pending',
                      value: '${kpis['pendingBookings'] ?? 0}',
                    ),
                    _KpiCard(
                      icon: Icons.star_outline,
                      label: 'Reviews',
                      value: '${kpis['reviews'] ?? 0}',
                    ),
                    _KpiCard(
                      icon: Icons.payments_outlined,
                      label: 'Revenue 30d',
                      value: '${kpis['revenue30d'] ?? 0} ₾',
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Text('Recent bookings', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 12),
                if (recent.isEmpty)
                  Text('No bookings yet.', style: TextStyle(color: Colors.white.withValues(alpha: 0.55)))
                else
                  ...recent.map((b) {
                    final user = b['user'] is Map ? b['user'] as Map : {};
                    final profile = user['profile'] is Map ? user['profile'] as Map : {};
                    final service = b['service'] is Map ? b['service'] as Map : {};
                    final created = b['createdAt']?.toString();
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        title: Text(profile['displayName']?.toString() ?? user['username']?.toString() ?? 'Customer'),
                        subtitle: Text(
                          '${service['name'] ?? 'Service'}${created != null ? ' · ${timeago.format(DateTime.tryParse(created) ?? DateTime.now())}' : ''}',
                        ),
                        trailing: Chip(
                          label: Text((b['status']?.toString() ?? 'pending').toLowerCase()),
                          visualDensity: VisualDensity.compact,
                        ),
                      ),
                    );
                  }),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  const _KpiCard({required this.icon, required this.label, required this.value});
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: Theme.of(context).colorScheme.primary),
            const Spacer(),
            Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
            Text(label, style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.55))),
          ],
        ),
      ),
    );
  }
}
