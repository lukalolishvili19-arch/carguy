import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';

List<Map<String, dynamic>> _asList(dynamic raw) {
  if (raw is List) return raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  if (raw is Map) {
    final items = raw['items'] ?? raw['data'] ?? raw['results'] ?? raw['users'] ?? raw['posts'];
    if (items is List) return items.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }
  return [];
}

final searchResultsProvider = FutureProvider.autoDispose.family<List<Map<String, dynamic>>, String>((ref, query) async {
  if (query.trim().isEmpty) return [];
  final api = ref.watch(apiClientProvider);
  return api.get('/search', (j) => _asList(j), query: {'q': query.trim(), 'limit': 32});
});

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key, this.initialQuery = ''});
  final String initialQuery;

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  late final TextEditingController _query;
  String _submitted = '';

  @override
  void initState() {
    super.initState();
    _query = TextEditingController(text: widget.initialQuery);
    _submitted = widget.initialQuery.trim();
  }

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  void _search() {
    setState(() => _submitted = _query.text.trim());
  }

  @override
  Widget build(BuildContext context) {
    final results = ref.watch(searchResultsProvider(_submitted));

    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _query,
          decoration: const InputDecoration(
            hintText: 'Search users, posts, listings…',
            border: InputBorder.none,
          ),
          textInputAction: TextInputAction.search,
          onSubmitted: (_) => _search(),
        ),
        actions: [
          IconButton(icon: const Icon(Icons.search), onPressed: _search),
        ],
      ),
      body: _submitted.isEmpty
          ? Center(
              child: Text('Enter a search term', style: TextStyle(color: Colors.white.withValues(alpha: 0.55))),
            )
          : results.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text(ApiClient.errorMessage(e))),
              data: (items) {
                if (items.isEmpty) return const Center(child: Text('No results'));
                return ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: items.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (context, i) => _SearchResultTile(result: items[i]),
                );
              },
            ),
    );
  }
}

class _SearchResultTile extends StatelessWidget {
  const _SearchResultTile({required this.result});
  final Map<String, dynamic> result;

  @override
  Widget build(BuildContext context) {
    final type = result['type']?.toString() ?? result['_type']?.toString() ?? 'item';
    final title = result['title']?.toString() ??
        result['name']?.toString() ??
        (result['profile'] is Map ? (result['profile'] as Map)['displayName']?.toString() : null) ??
        result['username']?.toString() ??
        'Result';
    final subtitle = result['subtitle']?.toString() ??
        result['description']?.toString() ??
        result['content']?.toString() ??
        result['excerpt']?.toString();
    final slug = result['slug']?.toString();
    final username = result['username']?.toString();

    IconData icon;
    VoidCallback? onTap;
    switch (type.toLowerCase()) {
      case 'user':
        icon = Icons.person_outline;
        if (username != null) onTap = () => context.push('/u/$username');
        break;
      case 'post':
        icon = Icons.article_outlined;
        break;
      case 'listing':
      case 'marketplace':
        icon = Icons.shopping_bag_outlined;
        if (slug != null) onTap = () => context.push('/marketplace/$slug');
        break;
      case 'business':
      case 'service':
        icon = Icons.store_outlined;
        if (slug != null) onTap = () => context.push('/services/$slug');
        break;
      case 'article':
      case 'news':
        icon = Icons.newspaper_outlined;
        if (slug != null) onTap = () => context.push('/news/$slug');
        break;
      default:
        icon = Icons.search;
        if (username != null) {
          onTap = () => context.push('/u/$username');
        } else if (slug != null && type.contains('event')) {
          onTap = () => context.push('/events/$slug');
        }
    }

    return ListTile(
      leading: Icon(icon),
      title: Text(title),
      subtitle: subtitle != null ? Text(subtitle, maxLines: 2, overflow: TextOverflow.ellipsis) : null,
      trailing: Text(type, style: TextStyle(fontSize: 11, color: Colors.white.withValues(alpha: 0.4))),
      onTap: onTap,
    );
  }
}
