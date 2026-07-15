import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../../core/api/api_client.dart';

List<Map<String, dynamic>> _asList(dynamic raw) {
  if (raw is List) return raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  if (raw is Map) {
    final items = raw['items'] ?? raw['data'];
    if (items is List) return items.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }
  return [];
}

final forumCategoriesProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  return api.get('/forum/categories', (j) => _asList(j));
});

final forumThreadsProvider = FutureProvider.autoDispose.family<List<Map<String, dynamic>>, String?>((ref, categorySlug) async {
  final api = ref.watch(apiClientProvider);
  return api.get(
    '/forum/threads',
    (j) => _asList(j),
    query: {
      if (categorySlug != null) 'categorySlug': categorySlug,
      'sort': 'active',
      'limit': 24,
    },
  );
});

class ForumScreen extends ConsumerStatefulWidget {
  const ForumScreen({super.key});

  @override
  ConsumerState<ForumScreen> createState() => _ForumScreenState();
}

class _ForumScreenState extends ConsumerState<ForumScreen> {
  String? _categorySlug;

  @override
  Widget build(BuildContext context) {
    final categories = ref.watch(forumCategoriesProvider);
    final threads = ref.watch(forumThreadsProvider(_categorySlug));

    return Scaffold(
      appBar: AppBar(title: const Text('Forum')),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          categories.when(
            loading: () => const SizedBox(height: 48, child: Center(child: CircularProgressIndicator(strokeWidth: 2))),
            error: (_, __) => const SizedBox.shrink(),
            data: (cats) => SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
              child: Row(
                children: [
                  FilterChip(
                    label: const Text('All'),
                    selected: _categorySlug == null,
                    onSelected: (_) => setState(() => _categorySlug = null),
                  ),
                  const SizedBox(width: 8),
                  ...cats.map((c) {
                    final slug = c['slug']?.toString();
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: FilterChip(
                        label: Text('${c['icon'] ?? ''} ${c['name'] ?? ''}'.trim()),
                        selected: _categorySlug == slug,
                        onSelected: (_) => setState(() => _categorySlug = slug),
                      ),
                    );
                  }),
                ],
              ),
            ),
          ),
          Expanded(
            child: threads.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text(ApiClient.errorMessage(e))),
              data: (items) {
                if (items.isEmpty) return const Center(child: Text('No threads yet'));
                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(forumThreadsProvider(_categorySlug)),
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, i) => _ThreadTile(thread: items[i]),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _ThreadTile extends StatelessWidget {
  const _ThreadTile({required this.thread});
  final Map<String, dynamic> thread;

  @override
  Widget build(BuildContext context) {
    final slug = thread['slug']?.toString() ?? '';
    final author = thread['author'] is Map ? thread['author'] as Map : {};
    final category = thread['category'] is Map ? thread['category'] as Map : {};
    final created = thread['createdAt']?.toString();

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: slug.isEmpty ? null : () => context.push('/forum/$slug'),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              SizedBox(
                width: 44,
                child: Column(
                  children: [
                    const Icon(Icons.arrow_upward, size: 18),
                    Text('${thread['voteScore'] ?? 0}', style: const TextStyle(fontWeight: FontWeight.w700)),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        if (thread['isPinned'] == true) const Icon(Icons.push_pin, size: 14),
                        if (category['name'] != null)
                          Chip(
                            label: Text('${category['icon'] ?? ''} ${category['name']}'.trim()),
                            visualDensity: VisualDensity.compact,
                            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      thread['title']?.toString() ?? 'Thread',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      [
                        '@${author['username'] ?? 'user'}',
                        if (created != null) timeago.format(DateTime.tryParse(created) ?? DateTime.now()),
                        '${thread['replyCount'] ?? 0} replies',
                        '${thread['viewCount'] ?? 0} views',
                      ].join(' · '),
                      style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.55)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
