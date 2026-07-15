import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_client.dart';

List<Map<String, dynamic>> _asList(dynamic raw) {
  if (raw is List) return raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  if (raw is Map) {
    final items = raw['items'] ?? raw['data'];
    if (items is List) return items.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }
  return [];
}

final discountsProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  return api.get('/discounts', (j) => _asList(j), query: {'limit': 48});
});

class DiscountsScreen extends ConsumerWidget {
  const DiscountsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final discounts = ref.watch(discountsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Discounts')),
      body: discounts.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(ApiClient.errorMessage(e))),
        data: (items) {
          if (items.isEmpty) return const Center(child: Text('No active discounts'));
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(discountsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, i) => _DiscountCard(discount: items[i]),
            ),
          );
        },
      ),
    );
  }
}

class _DiscountCard extends StatelessWidget {
  const _DiscountCard({required this.discount});
  final Map<String, dynamic> discount;

  @override
  Widget build(BuildContext context) {
    final business = discount['business'] is Map ? discount['business'] as Map : {};
    final expires = discount['expiresAt']?.toString() ?? discount['validUntil']?.toString();
    final code = discount['code']?.toString();
    final percent = discount['percentOff'] ?? discount['discountPercent'];
    final amount = discount['amountOff'] ?? discount['discountAmount'];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    discount['title']?.toString() ?? 'Discount',
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                  ),
                ),
                if (percent != null)
                  Chip(
                    label: Text('$percent% OFF'),
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    labelStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                  )
                else if (amount != null)
                  Chip(
                    label: Text('$amount OFF'),
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    labelStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                  ),
              ],
            ),
            if (business['name'] != null) ...[
              const SizedBox(height: 4),
              Text(business['name'].toString(), style: TextStyle(color: Colors.white.withValues(alpha: 0.6))),
            ],
            if (discount['description'] != null) ...[
              const SizedBox(height: 8),
              Text(discount['description'].toString()),
            ],
            if (code != null) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFF222222),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white12),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.local_offer_outlined, size: 16),
                    const SizedBox(width: 8),
                    Text(code, style: const TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.2)),
                  ],
                ),
              ),
            ],
            if (expires != null) ...[
              const SizedBox(height: 8),
              Text(
                'Expires ${DateFormat.yMMMd().format(DateTime.tryParse(expires)?.toLocal() ?? DateTime.now())}',
                style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.45)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
