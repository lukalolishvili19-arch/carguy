import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/auth_provider.dart';

final userProfileProvider = FutureProvider.autoDispose.family<Map<String, dynamic>, String>((ref, username) async {
  final api = ref.watch(apiClientProvider);
  return api.get('/users/$username', (j) => Map<String, dynamic>.from(j as Map));
});

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key, required this.username});
  final String username;

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  bool _followLoading = false;
  bool _messageLoading = false;

  Future<void> _toggleFollow(bool isFollowing) async {
    if (_followLoading) return;
    setState(() => _followLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      if (isFollowing) {
        await api.delete('/users/${widget.username}/follow', (_) => null);
      } else {
        await api.post('/users/${widget.username}/follow', (_) => null);
      }
      ref.invalidate(userProfileProvider(widget.username));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(ApiClient.errorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _followLoading = false);
    }
  }

  Future<void> _message(String userId) async {
    if (_messageLoading) return;
    setState(() => _messageLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      final conv = await api.post(
        '/conversations/direct',
        (j) => Map<String, dynamic>.from(j as Map),
        data: {'recipientId': userId},
      );
      final id = conv['id']?.toString();
      if (mounted && id != null) context.push('/messages/$id');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(ApiClient.errorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _messageLoading = false);
    }
  }

  void _call(String userId) {
    context.push('/call/$userId');
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final profile = ref.watch(userProfileProvider(widget.username));

    return Scaffold(
      body: profile.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(ApiClient.errorMessage(e))),
        data: (data) {
          final userProfile = data['profile'] is Map ? data['profile'] as Map : {};
          final reputation = data['reputation'] is Map ? data['reputation'] as Map : {};
          final counts = data['_count'] is Map ? data['_count'] as Map : {};
          final isMe = auth.user?.id == data['id'] || auth.user?.username == data['username'];
          final isFollowing = data['isFollowing'] == true;
          final userId = data['id']?.toString() ?? '';
          final displayName = userProfile['displayName']?.toString() ?? data['username']?.toString() ?? widget.username;
          final avatar = userProfile['avatarUrl']?.toString();
          final cover = userProfile['coverUrl']?.toString();

          return CustomScrollView(
            slivers: [
              SliverAppBar(
                expandedHeight: 160,
                pinned: true,
                flexibleSpace: FlexibleSpaceBar(
                  background: cover != null
                      ? CachedNetworkImage(imageUrl: cover, fit: BoxFit.cover)
                      : Container(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                Theme.of(context).colorScheme.primary.withValues(alpha: 0.5),
                                Theme.of(context).colorScheme.secondary.withValues(alpha: 0.4),
                              ],
                            ),
                          ),
                        ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          CircleAvatar(
                            radius: 40,
                            backgroundImage: avatar != null ? CachedNetworkImageProvider(avatar) : null,
                            child: avatar == null ? Text(displayName.substring(0, 1).toUpperCase()) : null,
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Flexible(
                                      child: Text(displayName, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                                    ),
                                    if (data['role'] == 'BUSINESS') const Icon(Icons.business, size: 18),
                                    if (reputation['isVerifiedMechanic'] == true) const Icon(Icons.verified, size: 18),
                                  ],
                                ),
                                Text('@${data['username'] ?? widget.username}', style: TextStyle(color: Colors.white.withValues(alpha: 0.6))),
                              ],
                            ),
                          ),
                        ],
                      ),
                      if (userProfile['bio'] != null) ...[
                        const SizedBox(height: 12),
                        Text(userProfile['bio'].toString()),
                      ],
                      if (userProfile['city'] != null || userProfile['country'] != null) ...[
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            const Icon(Icons.place, size: 16),
                            const SizedBox(width: 4),
                            Text([userProfile['city'], userProfile['country']].whereType<String>().join(', ')),
                          ],
                        ),
                      ],
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          _Stat(label: 'Followers', value: '${counts['followers'] ?? 0}'),
                          const SizedBox(width: 20),
                          _Stat(label: 'Following', value: '${counts['following'] ?? 0}'),
                          const SizedBox(width: 20),
                          _Stat(label: 'Posts', value: '${counts['posts'] ?? 0}'),
                          if (reputation['level'] != null) ...[
                            const SizedBox(width: 20),
                            _Stat(label: 'Level', value: '${reputation['level']}'),
                          ],
                        ],
                      ),
                      if (!isMe && auth.status == AuthStatus.authenticated) ...[
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: FilledButton(
                                onPressed: _followLoading ? null : () => _toggleFollow(isFollowing),
                                child: _followLoading
                                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                                    : Text(isFollowing ? 'Following' : 'Follow'),
                              ),
                            ),
                            const SizedBox(width: 8),
                            IconButton.filledTonal(
                              onPressed: _messageLoading ? null : () => _message(userId),
                              icon: _messageLoading
                                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                                  : const Icon(Icons.message_outlined),
                            ),
                            const SizedBox(width: 8),
                            IconButton.filledTonal(
                              onPressed: userId.isEmpty ? null : () => _call(userId),
                              icon: const Icon(Icons.call_outlined),
                            ),
                          ],
                        ),
                      ],
                      const SizedBox(height: 24),
                      Text('Posts', style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 8),
                      Text(
                        'Posts feed loads from the home screen.',
                        style: TextStyle(color: Colors.white.withValues(alpha: 0.55)),
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

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(value, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        Text(label, style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.5))),
      ],
    );
  }
}
