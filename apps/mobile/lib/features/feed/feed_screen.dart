import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/models/models.dart';
import '../../shared/widgets/cg_widgets.dart';

final feedProvider = FutureProvider.autoDispose<List<PostItem>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final auth = ref.watch(authProvider);
  // Personalized feed needs auth; public feed for guests.
  final path = auth.status == AuthStatus.authenticated ? '/posts/feed' : '/posts';
  return api.get(path, (j) {
    final list = (j is Map ? (j['items'] as List? ?? []) : (j as List? ?? []));
    return list.map((e) => PostItem.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }, query: {'limit': 20});
});

final storiesProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  ref.watch(authProvider); // refresh when login state changes
  try {
    return api.get('/stories', (j) {
      final list = j is List ? j : (j is Map ? (j['items'] as List? ?? j['data'] as List? ?? []) : []);
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    });
  } catch (_) {
    return [];
  }
});

class FeedScreen extends ConsumerWidget {
  const FeedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final feed = ref.watch(feedProvider);
    final stories = ref.watch(storiesProvider);

    return SafeArea(
      bottom: false,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 8, 8),
            child: Row(
              children: [
                const Expanded(child: CgBrandLogo()),
                IconButton(onPressed: () => context.push('/search'), icon: const Icon(Icons.search)),
                IconButton(
                  onPressed: () => context.push('/notifications'),
                  icon: Badge(
                    smallSize: 8,
                    child: const Icon(Icons.notifications_outlined),
                  ),
                ),
                IconButton(onPressed: () => context.push('/messages'), icon: const Icon(Icons.chat_bubble_outline)),
              ],
            ),
          ),
          SizedBox(
            height: 104,
            child: stories.when(
              loading: () => _StoriesRail(
                items: const [],
                onAdd: () => context.go('/create'),
              ),
              error: (_, __) => _StoriesRail(
                items: const [],
                onAdd: () => context.go('/create'),
              ),
              data: (items) => _StoriesRail(
                items: items,
                onAdd: () => context.go('/create'),
              ),
            ),
          ),
          Expanded(
            child: feed.when(
              loading: () => const Center(child: CircularProgressIndicator(color: AppColors.brandRed)),
              error: (e, _) => Center(child: Text(ApiClient.errorMessage(e))),
              data: (posts) {
                if (posts.isEmpty) {
                  return const Center(child: Text('No posts yet. Be the first!', style: TextStyle(color: AppColors.white40)));
                }
                return RefreshIndicator(
                  color: AppColors.brandRed,
                  onRefresh: () async {
                    ref.invalidate(feedProvider);
                    ref.invalidate(storiesProvider);
                    await Future.wait([
                      ref.read(feedProvider.future),
                      ref.read(storiesProvider.future),
                    ]);
                  },
                  child: ListView.builder(
                    padding: const EdgeInsets.only(bottom: 24),
                    itemCount: posts.length,
                    itemBuilder: (_, i) => _PostCard(post: posts[i]),
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

class _StoriesRail extends StatelessWidget {
  const _StoriesRail({required this.items, required this.onAdd});
  final List<Map<String, dynamic>> items;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
      itemCount: items.length + 1,
      separatorBuilder: (_, __) => const SizedBox(width: 12),
      itemBuilder: (context, i) {
        if (i == 0) {
          return GestureDetector(
            onTap: onAdd,
            child: Column(
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white24),
                    color: AppColors.surfaceElevated,
                  ),
                  child: const Icon(Icons.add, color: AppColors.brandRed),
                ),
                const SizedBox(height: 6),
                const Text('You', style: TextStyle(fontSize: 11)),
              ],
            ),
          );
        }
        final s = items[i - 1];
        final user = s['author'] is Map
            ? Map<String, dynamic>.from(s['author'] as Map)
            : (s['user'] is Map ? Map<String, dynamic>.from(s['user'] as Map) : null);
        final profile = user?['profile'] is Map
            ? Map<String, dynamic>.from(user!['profile'] as Map)
            : null;
        final name = (profile?['displayName'] ?? user?['username'] ?? s['username'] ?? 'User').toString();
        final avatar = profile?['avatarUrl']?.toString();
        final storyMedia = s['stories'] is List && (s['stories'] as List).isNotEmpty
            ? Map<String, dynamic>.from((s['stories'] as List).first as Map)
            : null;
        final ringImage = storyMedia?['mediaUrl']?.toString() ?? avatar;

        return Column(
          children: [
            Container(
              padding: const EdgeInsets.all(2),
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(colors: [AppColors.brandRed, Colors.orange]),
              ),
              child: CircleAvatar(
                radius: 30,
                backgroundColor: AppColors.brandBlack,
                backgroundImage: ringImage != null ? CachedNetworkImageProvider(ringImage) : null,
                child: ringImage == null
                    ? Text(name.isNotEmpty ? name.characters.first.toUpperCase() : '?')
                    : null,
              ),
            ),
            const SizedBox(height: 6),
            SizedBox(
              width: 68,
              child: Text(
                name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 11),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _PostCard extends ConsumerStatefulWidget {
  const _PostCard({required this.post});
  final PostItem post;

  @override
  ConsumerState<_PostCard> createState() => _PostCardState();
}

class _PostCardState extends ConsumerState<_PostCard> {
  late bool liked = widget.post.likedByMe;
  late bool saved = widget.post.bookmarkedByMe;
  late int likes = widget.post.likeCount;

  Future<void> _toggleLike() async {
    setState(() {
      liked = !liked;
      likes += liked ? 1 : -1;
    });
    try {
      await ref.read(apiClientProvider).post('/posts/${widget.post.id}/like', (_) => null);
    } catch (_) {
      setState(() {
        liked = !liked;
        likes += liked ? 1 : -1;
      });
    }
  }

  Future<void> _toggleSave() async {
    setState(() => saved = !saved);
    try {
      await ref.read(apiClientProvider).post('/posts/${widget.post.id}/bookmark', (_) => null);
    } catch (_) {
      setState(() => saved = !saved);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.post;
    final avatar = p.author.profile?.avatarUrl;
    final name = p.author.profile?.displayName ?? p.author.username;
    final media = p.media.isNotEmpty ? p.media.first.url : null;

    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                GestureDetector(
                  onTap: () => context.push('/u/${p.author.username}'),
                  child: CircleAvatar(
                    radius: 18,
                    backgroundImage: avatar != null ? CachedNetworkImageProvider(avatar) : null,
                    child: avatar == null ? Text(name.characters.first.toUpperCase()) : null,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name, style: const TextStyle(fontWeight: FontWeight.w700)),
                      Text('@${p.author.username}', style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.45))),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (media != null)
            AspectRatio(
              aspectRatio: 16 / 10,
              child: CachedNetworkImage(imageUrl: media, fit: BoxFit.cover, width: double.infinity),
            ),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
            child: Row(
              children: [
                IconButton(
                  onPressed: _toggleLike,
                  icon: Icon(liked ? Icons.favorite : Icons.favorite_border, color: liked ? AppColors.brandRed : Colors.white70),
                ),
                const Spacer(),
                IconButton(
                  onPressed: _toggleSave,
                  icon: Icon(saved ? Icons.bookmark : Icons.bookmark_border, color: saved ? AppColors.brandBlue : Colors.white70),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text('$likes likes', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
          ),
          if (p.content != null && p.content!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 0),
              child: Text.rich(
                TextSpan(
                  children: [
                    TextSpan(text: '${p.author.username} ', style: const TextStyle(fontWeight: FontWeight.w800)),
                    TextSpan(text: p.content, style: TextStyle(color: Colors.white.withValues(alpha: 0.85))),
                  ],
                ),
              ),
            ),
          if (p.commentCount > 0)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 0),
              child: Text('View all ${p.commentCount} comments', style: TextStyle(color: Colors.white.withValues(alpha: 0.4), fontSize: 13)),
            ),
        ],
      ),
    );
  }
}
