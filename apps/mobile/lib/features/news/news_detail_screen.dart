import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../../core/api/api_client.dart';

final newsDetailProvider = FutureProvider.autoDispose.family<Map<String, dynamic>, String>((ref, slug) async {
  final api = ref.watch(apiClientProvider);
  return api.get('/news/$slug', (j) => Map<String, dynamic>.from(j as Map));
});

class NewsDetailScreen extends ConsumerWidget {
  const NewsDetailScreen({super.key, required this.slug});
  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final article = ref.watch(newsDetailProvider(slug));

    return Scaffold(
      appBar: AppBar(title: const Text('Article')),
      body: article.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(ApiClient.errorMessage(e))),
        data: (data) {
          final title = data['title']?.toString() ?? 'Article';
          final cover = data['coverUrl']?.toString();
          final body = data['body']?.toString() ?? data['content']?.toString() ?? '';
          final published = data['publishedAt']?.toString();
          final category = data['category'] is Map
              ? (data['category'] as Map)['name']?.toString()
              : null;
          final author = data['author'] is Map
              ? (data['author'] as Map)['username']?.toString()
              : null;

          return SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
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
                      if (category != null)
                        Chip(label: Text(category), visualDensity: VisualDensity.compact),
                      const SizedBox(height: 8),
                      Text(title, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          if (author != null) Text('@$author', style: TextStyle(color: Colors.white.withValues(alpha: 0.6))),
                          if (author != null && published != null) const Text(' · '),
                          if (published != null)
                            Text(
                              timeago.format(DateTime.tryParse(published) ?? DateTime.now()),
                              style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 13),
                            ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      Text(body.isEmpty ? 'No content.' : body, style: const TextStyle(height: 1.6, fontSize: 16)),
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
}
