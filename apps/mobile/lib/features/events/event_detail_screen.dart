import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/auth_provider.dart';

final eventDetailProvider = FutureProvider.autoDispose.family<Map<String, dynamic>, String>((ref, slug) async {
  final api = ref.watch(apiClientProvider);
  return api.get('/events/$slug', (j) => Map<String, dynamic>.from(j as Map));
});

class EventDetailScreen extends ConsumerStatefulWidget {
  const EventDetailScreen({super.key, required this.slug});
  final String slug;

  @override
  ConsumerState<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends ConsumerState<EventDetailScreen> {
  bool _rsvping = false;

  Future<void> _rsvp(String eventId, String status) async {
    if (_rsvping) return;
    setState(() => _rsvping = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/events/$eventId/rsvp', (_) => null, data: {'status': status});
      ref.invalidate(eventDetailProvider(widget.slug));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('RSVP: $status')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(ApiClient.errorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _rsvping = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final event = ref.watch(eventDetailProvider(widget.slug));
    final auth = ref.watch(authProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Event')),
      body: event.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(ApiClient.errorMessage(e))),
        data: (data) {
          final eventId = data['id']?.toString() ?? '';
          final cover = data['coverUrl']?.toString() ?? data['imageUrl']?.toString();
          final startsAt = data['startsAt']?.toString() ?? data['startDate']?.toString();
          final endsAt = data['endsAt']?.toString() ?? data['endDate']?.toString();
          final location = data['location']?.toString() ?? data['city']?.toString();
          final myRsvp = data['myRsvp']?.toString() ?? data['rsvpStatus']?.toString();

          return SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (cover != null)
                  AspectRatio(
                    aspectRatio: 16 / 9,
                    child: CachedNetworkImage(imageUrl: cover, fit: BoxFit.cover),
                  ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        data['title']?.toString() ?? 'Event',
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 12),
                      if (startsAt != null) _InfoRow(icon: Icons.calendar_today, text: _formatRange(startsAt, endsAt)),
                      if (location != null) _InfoRow(icon: Icons.place, text: location),
                      const SizedBox(height: 16),
                      Text(
                        data['description']?.toString() ?? data['body']?.toString() ?? 'No description.',
                        style: const TextStyle(height: 1.5),
                      ),
                      if (auth.status == AuthStatus.authenticated && eventId.isNotEmpty) ...[
                        const SizedBox(height: 24),
                        Text('RSVP', style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 8),
                        if (myRsvp != null)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Text('Your status: $myRsvp', style: TextStyle(color: Theme.of(context).colorScheme.primary)),
                          ),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            FilledButton(
                              onPressed: _rsvping ? null : () => _rsvp(eventId, 'GOING'),
                              child: _rsvping
                                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                                  : const Text('Going'),
                            ),
                            OutlinedButton(
                              onPressed: _rsvping ? null : () => _rsvp(eventId, 'MAYBE'),
                              child: const Text('Maybe'),
                            ),
                            OutlinedButton(
                              onPressed: _rsvping ? null : () => _rsvp(eventId, 'NOT_GOING'),
                              child: const Text('Not going'),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  String _formatRange(String start, String? end) {
    final s = DateTime.tryParse(start);
    if (s == null) return start;
    final fmt = DateFormat.yMMMd().add_jm();
    if (end == null) return fmt.format(s.toLocal());
    final e = DateTime.tryParse(end);
    if (e == null) return fmt.format(s.toLocal());
    return '${fmt.format(s.toLocal())} – ${fmt.format(e.toLocal())}';
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 18, color: Colors.white.withValues(alpha: 0.6)),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: TextStyle(color: Colors.white.withValues(alpha: 0.8)))),
        ],
      ),
    );
  }
}
