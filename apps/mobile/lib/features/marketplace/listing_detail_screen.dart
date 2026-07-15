import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/api/api_client.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/async_body.dart';

class ListingDetailScreen extends ConsumerStatefulWidget {
  const ListingDetailScreen({super.key, required this.slug});

  final String slug;

  @override
  ConsumerState<ListingDetailScreen> createState() => _ListingDetailScreenState();
}

class _ListingDetailScreenState extends ConsumerState<ListingDetailScreen> {
  Map<String, dynamic>? _listing;
  bool _loading = true;
  Object? _error;
  bool _favoriting = false;

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
      final data = await api.get(
        '/marketplace/${widget.slug}',
        (j) => Map<String, dynamic>.from(j as Map),
      );
      if (mounted) setState(() => _listing = data);
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggleFavorite() async {
    final auth = ref.read(authProvider);
    if (auth.status != AuthStatus.authenticated) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sign in to save favorites')),
      );
      return;
    }
    final id = _listing?['id']?.toString();
    if (id == null) return;

    setState(() => _favoriting = true);
    try {
      final api = ref.read(apiClientProvider);
      final result = await api.post(
        '/marketplace/$id/favorite',
        (j) => Map<String, dynamic>.from(j as Map),
      );
      final favorited = result['favorited'] as bool? ??
          !(_listing?['favoritedByMe'] as bool? ?? false);
      setState(() {
        _listing = {...?_listing, 'favoritedByMe': favorited};
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(ApiClient.errorMessage(e))),
        );
      }
    } finally {
      if (mounted) setState(() => _favoriting = false);
    }
  }

  String _priceLabel(Map<String, dynamic> listing) {
    final price = listing['price'];
    final currency = listing['currency']?.toString() ?? 'GEL';
    if (price == null) return 'Price on request';
    final n = price is num ? price.toDouble() : double.tryParse(price.toString());
    if (n == null) return 'Price on request';
    return '${NumberFormat.decimalPattern().format(n)} $currency';
  }

  @override
  Widget build(BuildContext context) {
    final favorited = _listing?['favoritedByMe'] as bool? ?? false;

    return Scaffold(
      appBar: AppBar(
        title: Text(_listing?['title']?.toString() ?? 'Listing'),
        actions: [
          if (_listing != null)
            IconButton(
              onPressed: _favoriting ? null : _toggleFavorite,
              icon: _favoriting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Icon(
                      favorited ? Icons.favorite : Icons.favorite_border,
                      color: favorited ? AppColors.brandRed : null,
                    ),
            ),
        ],
      ),
      body: AsyncBody<Map<String, dynamic>>(
        loading: _loading,
        error: _error,
        data: _listing,
        onRetry: _load,
        builder: (context, listing) {
          final seller = listing['seller'] is Map
              ? Map<String, dynamic>.from(listing['seller'] as Map)
              : <String, dynamic>{};
          final profile = seller['profile'] is Map
              ? Map<String, dynamic>.from(seller['profile'] as Map)
              : <String, dynamic>{};
          final sellerName = profile['displayName']?.toString() ??
              seller['username']?.toString() ??
              'Seller';
          final media = listing['media'] is List ? listing['media'] as List : [];

          return SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (media.isNotEmpty)
                  SizedBox(
                    height: 260,
                    child: PageView.builder(
                      itemCount: media.length,
                      itemBuilder: (_, i) {
                        final url = (media[i] as Map)['url']?.toString() ?? '';
                        return CachedNetworkImage(
                          imageUrl: url,
                          fit: BoxFit.cover,
                          errorWidget: (_, __, ___) => Container(
                            color: const Color(0xFF222222),
                            child: const Icon(Icons.broken_image, size: 48),
                          ),
                        );
                      },
                    ),
                  )
                else
                  Container(
                    height: 200,
                    width: double.infinity,
                    color: const Color(0xFF222222),
                    child: const Icon(Icons.directions_car, size: 64, color: Colors.white24),
                  ),
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        listing['title']?.toString() ?? 'Untitled',
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _priceLabel(listing),
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: AppColors.brandRed,
                        ),
                      ),
                      const SizedBox(height: 20),
                      Card(
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: AppColors.brandGray,
                            backgroundImage: profile['avatarUrl'] != null
                                ? CachedNetworkImageProvider(profile['avatarUrl'].toString())
                                : null,
                            child: profile['avatarUrl'] == null
                                ? Text(sellerName.isNotEmpty ? sellerName[0].toUpperCase() : 'S')
                                : null,
                          ),
                          title: const Text('Seller', style: TextStyle(fontSize: 12, color: Colors.white54)),
                          subtitle: Text(sellerName, style: const TextStyle(fontWeight: FontWeight.w600)),
                        ),
                      ),
                      if (listing['description'] != null &&
                          listing['description'].toString().isNotEmpty) ...[
                        const SizedBox(height: 16),
                        Text(
                          listing['description'].toString(),
                          style: const TextStyle(height: 1.5, color: Colors.white70),
                        ),
                      ],
                      const SizedBox(height: 16),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          if (listing['year'] != null)
                            _Chip(label: '${listing['year']}'),
                          if (listing['mileage'] != null)
                            _Chip(label: '${NumberFormat.decimalPattern().format(listing['mileage'])} km'),
                          if (listing['fuelType'] != null)
                            _Chip(label: listing['fuelType'].toString()),
                          if (listing['transmission'] != null)
                            _Chip(label: listing['transmission'].toString()),
                          if (listing['city'] != null) _Chip(label: listing['city'].toString()),
                        ],
                      ),
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

class _Chip extends StatelessWidget {
  const _Chip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFF222222),
        borderRadius: BorderRadius.circular(AppTheme.radius),
      ),
      child: Text(label, style: const TextStyle(fontSize: 13, color: Colors.white70)),
    );
  }
}
