import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../../core/api/api_client.dart';
import '../../core/auth/auth_provider.dart';

List<Map<String, dynamic>> _asList(dynamic raw) {
  if (raw is List) return raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  if (raw is Map) {
    final items = raw['items'] ?? raw['posts'] ?? raw['replies'] ?? raw['data'];
    if (items is List) return items.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }
  return [];
}

final threadDetailProvider = FutureProvider.autoDispose.family<Map<String, dynamic>, String>((ref, slug) async {
  final api = ref.watch(apiClientProvider);
  return api.get('/forum/threads/$slug', (j) => Map<String, dynamic>.from(j as Map));
});

class ThreadDetailScreen extends ConsumerStatefulWidget {
  const ThreadDetailScreen({super.key, required this.slug});
  final String slug;

  @override
  ConsumerState<ThreadDetailScreen> createState() => _ThreadDetailScreenState();
}

class _ThreadDetailScreenState extends ConsumerState<ThreadDetailScreen> {
  final _replyCtrl = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _replyCtrl.dispose();
    super.dispose();
  }

  Future<void> _sendReply(String threadId) async {
    final content = _replyCtrl.text.trim();
    if (content.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post(
        '/forum/threads/$threadId/replies',
        (_) => null,
        data: {'content': content},
      );
      _replyCtrl.clear();
      ref.invalidate(threadDetailProvider(widget.slug));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Reply posted')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(ApiClient.errorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final thread = ref.watch(threadDetailProvider(widget.slug));
    final auth = ref.watch(authProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Thread')),
      body: thread.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(ApiClient.errorMessage(e))),
        data: (data) {
          final threadId = data['id']?.toString() ?? '';
          final posts = _asList(data['posts'] ?? data['replies']);
          final author = data['author'] is Map ? data['author'] as Map : {};
          final created = data['createdAt']?.toString();

          return Column(
            children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              data['title']?.toString() ?? 'Thread',
                              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              '@${author['username'] ?? 'user'}${created != null ? ' · ${timeago.format(DateTime.tryParse(created) ?? DateTime.now())}' : ''}',
                              style: TextStyle(color: Colors.white.withValues(alpha: 0.55), fontSize: 13),
                            ),
                            const SizedBox(height: 12),
                            Text(data['body']?.toString() ?? data['content']?.toString() ?? ''),
                            const SizedBox(height: 8),
                            Text(
                              '${data['voteScore'] ?? 0} votes · ${data['viewCount'] ?? 0} views',
                              style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.45)),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text('Replies (${posts.length})', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    ...posts.map((p) => _ReplyCard(post: p)),
                  ],
                ),
              ),
              if (auth.status == AuthStatus.authenticated)
                SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _replyCtrl,
                            decoration: const InputDecoration(hintText: 'Write a reply…'),
                            minLines: 1,
                            maxLines: 4,
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton.filled(
                          onPressed: threadId.isEmpty || _sending ? null : () => _sendReply(threadId),
                          icon: _sending
                              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                              : const Icon(Icons.send),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _ReplyCard extends StatelessWidget {
  const _ReplyCard({required this.post});
  final Map<String, dynamic> post;

  @override
  Widget build(BuildContext context) {
    final author = post['author'] is Map ? post['author'] as Map : {};
    final created = post['createdAt']?.toString();

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '@${author['username'] ?? 'user'}${created != null ? ' · ${timeago.format(DateTime.tryParse(created) ?? DateTime.now())}' : ''}',
              style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.55)),
            ),
            const SizedBox(height: 8),
            Text(post['content']?.toString() ?? post['body']?.toString() ?? ''),
            if (post['voteScore'] != null) ...[
              const SizedBox(height: 8),
              Text('${post['voteScore']} votes', style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.4))),
            ],
          ],
        ),
      ),
    );
  }
}
