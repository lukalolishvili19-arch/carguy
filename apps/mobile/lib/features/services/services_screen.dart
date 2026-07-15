import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/async_body.dart';
import '../../shared/widgets/cg_widgets.dart';

class ServicesScreen extends ConsumerStatefulWidget {
  const ServicesScreen({super.key});

  @override
  ConsumerState<ServicesScreen> createState() => _ServicesScreenState();
}

class _ServicesScreenState extends ConsumerState<ServicesScreen> {
  List<Map<String, dynamic>> _businesses = [];
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
      final items = await api.get('/businesses', parseItemMaps);
      if (mounted) setState(() => _businesses = items);
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  bool get _needsSubscription {
    final user = ref.watch(authProvider).user;
    if (user == null || !user.isBusiness) return false;
    return user.businessSubscription?.isActive != true;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.brandBlack,
      body: Column(
        children: [
          const CgBackHeader(title: 'Services'),
          if (_needsSubscription)
            Material(
              color: AppColors.brandRed.withValues(alpha: 0.15),
              child: InkWell(
                onTap: () => context.push('/billing/checkout'),
                child: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    children: [
                      Icon(Icons.payment, color: AppColors.brandRed),
                      SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Activate business subscription — 10 GEL/month',
                          style: TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ),
                      Icon(Icons.chevron_right, color: AppColors.white40),
                    ],
                  ),
                ),
              ),
            ),
          Expanded(
            child: AsyncBody<List<Map<String, dynamic>>>(
              loading: _loading,
              error: _error,
              data: _businesses,
              onRetry: _load,
              isEmpty: (d) => d.isEmpty,
              empty: const Center(child: Text('No services yet', style: TextStyle(color: AppColors.white40))),
              builder: (context, items) => RefreshIndicator(
                color: AppColors.brandRed,
                onRefresh: _load,
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, i) {
                    final b = items[i];
                    final slug = b['slug']?.toString() ?? '';
                    final logo = b['logoUrl']?.toString();
                    return CgGlassCard(
                      onTap: slug.isEmpty ? null : () => context.push('/services/$slug'),
                      child: Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: logo != null && logo.isNotEmpty
                                ? CachedNetworkImage(imageUrl: logo, width: 56, height: 56, fit: BoxFit.cover)
                                : Container(
                                    width: 56,
                                    height: 56,
                                    color: AppColors.surfaceElevated,
                                    child: const Icon(Icons.build, color: AppColors.brandRed),
                                  ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(b['name']?.toString() ?? 'Business', style: const TextStyle(fontWeight: FontWeight.w800)),
                                const SizedBox(height: 4),
                                Text(
                                  b['category']?.toString() ?? '',
                                  style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.45)),
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.chevron_right, color: AppColors.white40),
                        ],
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
}
