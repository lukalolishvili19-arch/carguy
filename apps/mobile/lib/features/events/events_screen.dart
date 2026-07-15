import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_client.dart';

List<Map<String, dynamic>> _asList(dynamic raw) {
  if (raw is List) return raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  if (raw is Map) {
    final items = raw['items'] ?? raw['data'];
    if (items is List) return items.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }
  return [];
}

final eventsListProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  return api.get('/events', (j) => _asList(j), query: {'limit': 24});
});

class EventsScreen extends ConsumerWidget {
  const EventsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final events = ref.watch(eventsListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Events')),
      body: events.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(ApiClient.errorMessage(e))),
        data: (items) {
          if (items.isEmpty) return const Center(child: Text('No upcoming events'));
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(eventsListProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, i) => _EventTile(event: items[i]),
            ),
          );
        },
      ),
    );
  }
}

class _EventTile extends StatelessWidget {
  const _EventTile({required this.event});
  final Map<String, dynamic> event;

  @override
  Widget build(BuildContext context) {
    final slug = event['slug']?.toString() ?? '';
    final cover = event['coverUrl']?.toString() ?? event['imageUrl']?.toString();
    final startsAt = event['startsAt']?.toString() ?? event['startDate']?.toString();
    final location = event['location']?.toString() ?? event['city']?.toString();
    final dateStr = startsAt != null ? _formatDate(startsAt) : null;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: slug.isEmpty ? null : () => context.push('/events/$slug'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (cover != null)
              AspectRatio(
                aspectRatio: 16 / 9,
                child: CachedNetworkImage(imageUrl: cover, fit: BoxFit.cover),
              ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(event['title']?.toString() ?? 'Event', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                  if (dateStr != null || location != null) ...[
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        if (dateStr != null) ...[
                          const Icon(Icons.calendar_today, size: 14),
                          const SizedBox(width: 4),
                          Text(dateStr, style: TextStyle(fontSize: 13, color: Colors.white.withValues(alpha: 0.65))),
                        ],
                        if (dateStr != null && location != null) const SizedBox(width: 12),
                        if (location != null) ...[
                          const Icon(Icons.place, size: 14),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(location, style: TextStyle(fontSize: 13, color: Colors.white.withValues(alpha: 0.65))),
                          ),
                        ],
                      ],
                    ),
                  ],
                  if (event['rsvpCount'] != null || event['_count'] is Map) ...[
                    const SizedBox(height: 8),
                    Text(
                      '${event['rsvpCount'] ?? (event['_count'] as Map?)?['rsvps'] ?? 0} attending',
                      style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.primary),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(String iso) {
    final dt = DateTime.tryParse(iso);
    if (dt == null) return iso;
    return DateFormat.yMMMd().add_jm().format(dt.toLocal());
  }
}
