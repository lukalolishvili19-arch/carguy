import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';

List<Map<String, dynamic>> _asList(dynamic raw) {
  if (raw is List) return raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  if (raw is Map) {
    final items = raw['items'] ?? raw['data'] ?? raw['plans'] ?? raw['companies'];
    if (items is List) return items.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }
  return [];
}

final insuranceCompaniesProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  return api.get('/insurance/companies', (j) => _asList(j));
});

final insurancePlansProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  return api.get('/insurance/plans', (j) => _asList(j));
});

class InsuranceScreen extends ConsumerWidget {
  const InsuranceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final companies = ref.watch(insuranceCompaniesProvider);
    final plans = ref.watch(insurancePlansProvider);

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Insurance'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Plans'),
              Tab(text: 'Companies'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            plans.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text(ApiClient.errorMessage(e))),
              data: (items) => _PlanList(
                items: items,
                onRefresh: () async {
                  ref.invalidate(insurancePlansProvider);
                  await ref.read(insurancePlansProvider.future);
                },
              ),
            ),
            companies.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text(ApiClient.errorMessage(e))),
              data: (items) => _CompanyList(
                items: items,
                onRefresh: () async {
                  ref.invalidate(insuranceCompaniesProvider);
                  await ref.read(insuranceCompaniesProvider.future);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PlanList extends StatelessWidget {
  const _PlanList({required this.items, required this.onRefresh});
  final List<Map<String, dynamic>> items;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const Center(child: Text('No plans available'));
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, i) {
          final p = items[i];
          final company = p['company'] is Map ? p['company'] as Map : {};
          return Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(p['name']?.toString() ?? 'Plan', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                  if (company['name'] != null)
                    Text(company['name'].toString(), style: TextStyle(color: Colors.white.withValues(alpha: 0.6), fontSize: 13)),
                  const SizedBox(height: 8),
                  if (p['description'] != null) Text(p['description'].toString()),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      if (p['monthlyPremium'] != null || p['price'] != null)
                        Text(
                          '${p['monthlyPremium'] ?? p['price']} ${p['currency'] ?? 'GEL'}/mo',
                          style: TextStyle(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.w600),
                        ),
                      if (p['coverageType'] != null) ...[
                        const SizedBox(width: 12),
                        Chip(label: Text(p['coverageType'].toString()), visualDensity: VisualDensity.compact),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _CompanyList extends StatelessWidget {
  const _CompanyList({required this.items, required this.onRefresh});
  final List<Map<String, dynamic>> items;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const Center(child: Text('No companies listed'));
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, i) {
          final c = items[i];
          return Card(
            child: ListTile(
              leading: CircleAvatar(child: Text((c['name']?.toString() ?? '?').substring(0, 1))),
              title: Text(c['name']?.toString() ?? 'Company'),
              subtitle: Text(c['description']?.toString() ?? c['website']?.toString() ?? ''),
              trailing: c['rating'] != null ? Text('★ ${c['rating']}') : null,
            ),
          );
        },
      ),
    );
  }
}
