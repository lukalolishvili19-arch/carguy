import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../../core/api/api_client.dart';
import '../../core/auth/auth_provider.dart';

List<Map<String, dynamic>> _asList(dynamic raw) {
  if (raw is List) return raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  if (raw is Map) {
    final items = raw['items'] ?? raw['data'];
    if (items is List) return items.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }
  return [];
}

final bookingsProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  return api.get('/bookings', (j) => _asList(j), query: {'limit': 48});
});

class BookingScreen extends ConsumerWidget {
  const BookingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final bookings = ref.watch(bookingsProvider);

    if (auth.status != AuthStatus.authenticated) {
      return Scaffold(
        appBar: AppBar(title: const Text('Bookings')),
        body: const Center(child: Text('Sign in to view your bookings')),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Bookings')),
      body: bookings.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(ApiClient.errorMessage(e))),
        data: (items) {
          if (items.isEmpty) return const Center(child: Text('No bookings yet'));
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(bookingsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, i) => _BookingTile(booking: items[i]),
            ),
          );
        },
      ),
    );
  }
}

class _BookingTile extends StatelessWidget {
  const _BookingTile({required this.booking});
  final Map<String, dynamic> booking;

  @override
  Widget build(BuildContext context) {
    final service = booking['service'] is Map ? booking['service'] as Map : {};
    final business = booking['business'] is Map ? booking['business'] as Map : service;
    final status = booking['status']?.toString() ?? 'PENDING';
    final scheduled = booking['scheduledAt']?.toString() ?? booking['date']?.toString();
    final created = booking['createdAt']?.toString();

    Color statusColor;
    switch (status.toUpperCase()) {
      case 'CONFIRMED':
      case 'COMPLETED':
        statusColor = Colors.green;
        break;
      case 'CANCELLED':
        statusColor = Colors.red;
        break;
      default:
        statusColor = Theme.of(context).colorScheme.primary;
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    service['name']?.toString() ?? business['name']?.toString() ?? 'Service booking',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
                Chip(
                  label: Text(status.toLowerCase()),
                  backgroundColor: statusColor.withValues(alpha: 0.15),
                  labelStyle: TextStyle(color: statusColor, fontSize: 12),
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
            if (business['name'] != null && service['name'] != null) ...[
              const SizedBox(height: 4),
              Text(business['name'].toString(), style: TextStyle(color: Colors.white.withValues(alpha: 0.6), fontSize: 13)),
            ],
            const SizedBox(height: 8),
            if (scheduled != null)
              Row(
                children: [
                  const Icon(Icons.schedule, size: 16),
                  const SizedBox(width: 6),
                  Text(DateFormat.yMMMd().add_jm().format(DateTime.tryParse(scheduled)?.toLocal() ?? DateTime.now())),
                ],
              ),
            if (created != null) ...[
              const SizedBox(height: 4),
              Text(
                'Booked ${timeago.format(DateTime.tryParse(created) ?? DateTime.now())}',
                style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.45)),
              ),
            ],
            if (booking['notes'] != null) ...[
              const SizedBox(height: 8),
              Text(booking['notes'].toString(), style: TextStyle(color: Colors.white.withValues(alpha: 0.7))),
            ],
          ],
        ),
      ),
    );
  }
}
