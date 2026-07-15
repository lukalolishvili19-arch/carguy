import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
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

final notificationsProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  return api.get('/notifications', (j) => _asList(j), query: {'limit': 48});
});

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final notifications = ref.watch(notificationsProvider);

    if (auth.status != AuthStatus.authenticated) {
      return Scaffold(
        appBar: AppBar(title: const Text('Notifications')),
        body: const Center(child: Text('Sign in to see notifications')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          IconButton(
            icon: const Icon(Icons.done_all),
            tooltip: 'Mark all read',
            onPressed: () async {
              try {
                final api = ref.read(apiClientProvider);
                await api.patch('/notifications/read-all', (_) => null);
                ref.invalidate(notificationsProvider);
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(ApiClient.errorMessage(e))));
                }
              }
            },
          ),
        ],
      ),
      body: notifications.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(ApiClient.errorMessage(e))),
        data: (items) {
          if (items.isEmpty) return const Center(child: Text('No notifications'));
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(notificationsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(8),
              itemCount: items.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (context, i) => _NotificationTile(
                notification: items[i],
                onRead: () => ref.invalidate(notificationsProvider),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _NotificationTile extends ConsumerWidget {
  const _NotificationTile({required this.notification, required this.onRead});
  final Map<String, dynamic> notification;
  final VoidCallback onRead;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final id = notification['id']?.toString() ?? '';
    final isRead = notification['read'] == true || notification['isRead'] == true;
    final title = notification['title']?.toString() ?? notification['type']?.toString() ?? 'Notification';
    final body = notification['body']?.toString() ?? notification['message']?.toString() ?? '';
    final created = notification['createdAt']?.toString();
    final link = notification['link']?.toString() ?? notification['url']?.toString();

    return ListTile(
      tileColor: isRead ? null : Theme.of(context).colorScheme.primary.withValues(alpha: 0.08),
      leading: CircleAvatar(
        backgroundColor: isRead ? const Color(0xFF333333) : Theme.of(context).colorScheme.primary,
        child: Icon(_iconForType(notification['type']?.toString()), size: 20, color: Colors.white),
      ),
      title: Text(title, style: TextStyle(fontWeight: isRead ? FontWeight.normal : FontWeight.w700)),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (body.isNotEmpty) Text(body, maxLines: 2, overflow: TextOverflow.ellipsis),
          if (created != null)
            Text(
              timeago.format(DateTime.tryParse(created) ?? DateTime.now()),
              style: TextStyle(fontSize: 11, color: Colors.white.withValues(alpha: 0.45)),
            ),
        ],
      ),
      onTap: () async {
        if (!isRead && id.isNotEmpty) {
          try {
            final api = ref.read(apiClientProvider);
            await api.patch('/notifications/$id/read', (_) => null);
            onRead();
          } catch (_) {}
        }
        if (link != null && context.mounted) context.push(link);
      },
    );
  }

  IconData _iconForType(String? type) {
    switch (type?.toUpperCase()) {
      case 'FOLLOW':
        return Icons.person_add_outlined;
      case 'LIKE':
        return Icons.favorite_outline;
      case 'COMMENT':
        return Icons.chat_bubble_outline;
      case 'MESSAGE':
        return Icons.message_outlined;
      case 'BOOKING':
        return Icons.calendar_month_outlined;
      default:
        return Icons.notifications_outlined;
    }
  }
}
