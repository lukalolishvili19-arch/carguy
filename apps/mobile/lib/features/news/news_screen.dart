import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';

List<Map<String, dynamic>> _asList(dynamic raw) {
  if (raw is List) {
    return raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }
  if (raw is Map) {
    final items = raw['items'] ?? raw['data'] ?? raw['results'];
    if (items is List) {
      return items.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    }
  }
  return [];
}

final newsListProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  return api.get('/news', (j) => _asList(j), query: {'limit': 24});
});

final newsHighlightsProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  return api.get('/news/highlights', (j) => Map<String, dynamic>.from(j as Map? ?? {}));
});

class NewsScreen extends ConsumerWidget {
  const NewsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final news = ref.watch(newsListProvider);
    final highlights = ref.watch(newsHighlightsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('News')),
      body: news.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(ApiClient.errorMessage(e))),
        data: (articles) {
          final trending = highlights.maybeWhen(
            data: (h) => _asList(h['trending']),
            orElse: () => <Map<String, dynamic>>[],
          );
          final featured = trending.isNotEmpty ? trending.first : (articles.isNotEmpty ? articles.first : null);

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(newsListProvider);
              ref.invalidate(newsHighlightsProvider);
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (featured != null) _FeaturedArticle(article: featured),
                const SizedBox(height: 24),
                Text('Latest', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 12),
                if (articles.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 32),
                    child: Center(child: Text('No articles yet')),
                  )
                else
                  ...articles.map((a) => _ArticleTile(article: a)),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _FeaturedArticle extends StatelessWidget {
  const _FeaturedArticle({required this.article});
  final Map<String, dynamic> article;

  @override
  Widget build(BuildContext context) {
    final slug = article['slug']?.toString() ?? '';
    final cover = article['coverUrl']?.toString();
    final category = article['category'] is Map
        ? (article['category'] as Map)['name']?.toString()
        : null;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: slug.isEmpty ? null : () => context.push('/news/$slug'),
        child: SizedBox(
          height: 200,
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (cover != null)
                CachedNetworkImage(imageUrl: cover, fit: BoxFit.cover)
              else
                Container(color: AppColors.brandGray),
              DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                    colors: [Colors.black.withValues(alpha: 0.85), Colors.transparent],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    if (category != null)
                      Chip(
                        label: Text(category),
                        visualDensity: VisualDensity.compact,
                        backgroundColor: AppColors.brandRed,
                        labelStyle: const TextStyle(color: Colors.white, fontSize: 12),
                      ),
                    const SizedBox(height: 8),
                    Text(
                      article['title']?.toString() ?? 'Untitled',
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (article['excerpt'] != null) ...[
                      const SizedBox(height: 6),
                      Text(
                        article['excerpt'].toString(),
                        style: TextStyle(color: Colors.white.withValues(alpha: 0.8)),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
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

class _ArticleTile extends StatelessWidget {
  const _ArticleTile({required this.article});
  final Map<String, dynamic> article;

  @override
  Widget build(BuildContext context) {
    final slug = article['slug']?.toString() ?? '';
    final cover = article['coverUrl']?.toString();
    final category = article['category'] is Map
        ? (article['category'] as Map)['name']?.toString()
        : null;
    final published = article['publishedAt']?.toString();

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppTheme.radius),
        onTap: slug.isEmpty ? null : () => context.push('/news/$slug'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (cover != null)
              ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(AppTheme.radius)),
                child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: CachedNetworkImage(imageUrl: cover, fit: BoxFit.cover),
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (category != null)
                    Text(category, style: TextStyle(color: Theme.of(context).colorScheme.primary, fontSize: 12)),
                  const SizedBox(height: 4),
                  Text(
                    article['title']?.toString() ?? 'Untitled',
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                  ),
                  if (article['excerpt'] != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      article['excerpt'].toString(),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.65), fontSize: 13),
                    ),
                  ],
                  if (published != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      timeago.format(DateTime.tryParse(published) ?? DateTime.now()),
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.45), fontSize: 12),
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
}
