import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../core/api/api_client.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/async_body.dart';

class MessagesScreen extends ConsumerStatefulWidget {
  const MessagesScreen({super.key});

  @override
  ConsumerState<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends ConsumerState<MessagesScreen> {
  List<Map<String, dynamic>> _conversations = [];
  bool _loading = true;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      final items = await api.get('/conversations', (j) {
        if (j is List) {
          return j
              .whereType<Map>()
              .map((e) => Map<String, dynamic>.from(e))
              .toList();
        }
        return parseItemMaps(j);
      });
      if (mounted) setState(() => _conversations = items);
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Map<String, dynamic>? _peerFor(Map<String, dynamic> conv) {
    final auth = ref.read(authProvider);
    final myId = auth.user?.id;
    final members = conv['members'];
    if (members is! List) return null;
    for (final m in members) {
      if (m is! Map) continue;
      final user = m['user'];
      if (user is! Map) continue;
      final userId = user['id']?.toString();
      if (userId != null && userId != myId) {
        return Map<String, dynamic>.from(user);
      }
    }
    return null;
  }

  String _preview(Map<String, dynamic> conv) {
    final messages = conv['messages'];
    if (messages is List && messages.isNotEmpty) {
      final last = messages.first;
      if (last is Map) return last['content']?.toString() ?? 'Message';
    }
    return conv['title']?.toString() ?? 'No messages yet';
  }

  DateTime? _updatedAt(Map<String, dynamic> conv) {
    final messages = conv['messages'];
    if (messages is List && messages.isNotEmpty) {
      final last = messages.first;
      if (last is Map && last['createdAt'] != null) {
        return DateTime.tryParse(last['createdAt'].toString());
      }
    }
    if (conv['updatedAt'] != null) {
      return DateTime.tryParse(conv['updatedAt'].toString());
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);

    if (auth.status != AuthStatus.authenticated) {
      return Scaffold(
        appBar: AppBar(title: const Text('Messages')),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Sign in to view messages', style: TextStyle(color: Colors.white54)),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => context.push('/login'),
                child: const Text('Sign in'),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Messages'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loading ? null : _load),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.brandRed,
        onRefresh: _load,
        child: AsyncBody<List<Map<String, dynamic>>>(
          loading: _loading,
          error: _error,
          data: _conversations,
          onRetry: _load,
          isEmpty: (items) => items.isEmpty,
          empty: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            children: const [
              SizedBox(height: 120),
              Center(child: Text('No conversations yet', style: TextStyle(color: Colors.white54))),
            ],
          ),
          builder: (context, conversations) => ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(vertical: 8),
            itemCount: conversations.length,
            separatorBuilder: (_, __) => const Divider(height: 1, indent: 72),
            itemBuilder: (context, i) {
              final conv = conversations[i];
              final id = conv['id']?.toString() ?? '';
              final peer = _peerFor(conv);
              final peerProfile = peer?['profile'];
              final title = conv['title']?.toString() ??
                  (peerProfile is Map ? peerProfile['displayName']?.toString() : null) ??
                  peer?['username']?.toString() ??
                  'Conversation';
              final avatar = peerProfile is Map ? peerProfile['avatarUrl']?.toString() : null;
              final preview = _preview(conv);
              final updated = _updatedAt(conv);

              return ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                leading: CircleAvatar(
                  backgroundColor: AppColors.brandGray,
                  backgroundImage: avatar != null && avatar.isNotEmpty
                      ? CachedNetworkImageProvider(avatar)
                      : null,
                  child: avatar == null || avatar.isEmpty
                      ? Text(title.isNotEmpty ? title[0].toUpperCase() : '?')
                      : null,
                ),
                title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text(
                  preview,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white54),
                ),
                trailing: updated != null
                    ? Text(
                        timeago.format(updated, locale: 'en_short'),
                        style: const TextStyle(fontSize: 12, color: Colors.white38),
                      )
                    : null,
                onTap: id.isEmpty ? null : () => context.push('/messages/$id'),
              );
            },
          ),
        ),
      ),
    );
  }
}
