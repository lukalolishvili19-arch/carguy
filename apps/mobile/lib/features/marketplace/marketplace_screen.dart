import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/async_body.dart';
import '../../shared/widgets/cg_widgets.dart';
import 'marketplace_data.dart';

class MarketplaceScreen extends ConsumerStatefulWidget {
  const MarketplaceScreen({super.key});

  @override
  ConsumerState<MarketplaceScreen> createState() => _MarketplaceScreenState();
}

class _MarketplaceScreenState extends ConsumerState<MarketplaceScreen> {
  List<Map<String, dynamic>> _listings = [];
  bool _loading = true;
  Object? _error;
  String? _category;

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
      final query = <String, dynamic>{'limit': 24};
      if (_category != null) query['category'] = _category;
      final items = await api.get('/marketplace', parseItemMaps, query: query);
      if (mounted) setState(() => _listings = items);
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _imageUrl(Map<String, dynamic> listing) {
    final media = listing['media'];
    if (media is List && media.isNotEmpty) {
      final first = media.first;
      if (first is Map && first['url'] != null) return first['url'].toString();
    }
    return '';
  }

  String _priceLabel(Map<String, dynamic> listing) {
    final price = listing['price'];
    final currency = listing['currency']?.toString() ?? 'GEL';
    if (price == null) return 'Price on request';
    final n = price is num ? price.toDouble() : double.tryParse(price.toString());
    if (n == null) return 'Price on request';
    final symbol = currency == 'GEL' ? '₾' : currency;
    return '$symbol${NumberFormat.decimalPattern().format(n)}';
  }

  Future<void> _sell() async {
    final auth = ref.read(authProvider);
    if (auth.status != AuthStatus.authenticated) {
      context.push('/login');
      return;
    }
    final created = await context.push<bool>('/marketplace/sell');
    if (created == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: AppColors.brandBlack,
      body: Column(
        children: [
          CgBackHeader(
            title: 'Marketplace',
            right: auth.status == AuthStatus.authenticated
                ? IconButton(
                    onPressed: _sell,
                    icon: const Icon(Icons.add, color: AppColors.brandRed),
                    tooltip: 'Sell',
                  )
                : null,
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: Row(
              children: [
                const Expanded(
                  child: Text('Buy & sell cars, parts, accessories', style: TextStyle(color: AppColors.white40, fontSize: 13)),
                ),
                if (auth.status == AuthStatus.authenticated)
                  TextButton.icon(
                    onPressed: _sell,
                    icon: const Icon(Icons.add, size: 16),
                    label: const Text('Sell'),
                    style: TextButton.styleFrom(foregroundColor: AppColors.brandRed),
                  ),
              ],
            ),
          ),
          SizedBox(
            height: 44,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: CgPill(
                    text: 'All',
                    active: _category == null,
                    onTap: () {
                      setState(() => _category = null);
                      _load();
                    },
                  ),
                ),
                ...listingCategories.map(
                  (c) => Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: CgPill(
                      text: categoryLabel(c),
                      active: _category == c,
                      onTap: () {
                        setState(() => _category = c);
                        _load();
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: RefreshIndicator(
              color: AppColors.brandRed,
              onRefresh: _load,
              child: AsyncBody<List<Map<String, dynamic>>>(
                loading: _loading,
                error: _error,
                data: _listings,
                onRetry: _load,
                isEmpty: (items) => items.isEmpty,
                empty: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: const [
                    SizedBox(height: 120),
                    Center(child: Text('No listings match your filters', style: TextStyle(color: Colors.white54))),
                  ],
                ),
                builder: (context, listings) => ListView.separated(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(16),
                  itemCount: listings.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, i) {
                    final listing = listings[i];
                    final slug = listing['slug']?.toString() ?? '';
                    final title = listing['title']?.toString() ?? 'Untitled';
                    final image = _imageUrl(listing);
                    final year = listing['year']?.toString();
                    final mileage = listing['mileage'];
                    final city = listing['city']?.toString();
                    final category = listing['category']?.toString();

                    return Card(
                      clipBehavior: Clip.antiAlias,
                      color: AppColors.brandGray,
                      child: InkWell(
                        onTap: slug.isEmpty ? null : () => context.push('/marketplace/$slug'),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Stack(
                              children: [
                                if (image.isNotEmpty)
                                  CachedNetworkImage(
                                    imageUrl: image,
                                    height: 180,
                                    width: double.infinity,
                                    fit: BoxFit.cover,
                                    errorWidget: (_, __, ___) => _placeholder(),
                                  )
                                else
                                  _placeholder(),
                                if (category != null)
                                  Positioned(
                                    left: 10,
                                    top: 10,
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: Colors.black54,
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(categoryLabel(category), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                                    ),
                                  ),
                              ],
                            ),
                            Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _priceLabel(listing),
                                    style: const TextStyle(color: AppColors.brandRed, fontWeight: FontWeight.w800, fontSize: 17),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                                  const SizedBox(height: 6),
                                  Text(
                                    [
                                      if (year != null) year,
                                      if (mileage != null) '${NumberFormat.decimalPattern().format(mileage)} km',
                                      if (city != null) city,
                                    ].join(' · '),
                                    style: const TextStyle(fontSize: 12, color: Colors.white54),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _placeholder() => Container(
        height: 180,
        color: AppColors.surfaceElevated,
        child: const Center(child: Icon(Icons.directions_car, size: 48, color: Colors.white24)),
      );
}
