import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/theme/app_theme.dart';

final billingSubscriptionProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  return api.get('/billing/subscription', (j) => Map<String, dynamic>.from(j as Map));
});

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  bool _checkoutStarted = false;
  bool _checkoutLoading = false;
  bool _paying = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _startCheckout());
  }

  Future<void> _startCheckout() async {
    final auth = ref.read(authProvider);
    if (auth.status != AuthStatus.authenticated || _checkoutStarted) return;
    setState(() => _checkoutLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/billing/business/checkout', (j) => Map<String, dynamic>.from(j as Map? ?? {}));
      ref.invalidate(billingSubscriptionProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(ApiClient.errorMessage(e))));
      }
    } finally {
      if (mounted) {
        setState(() {
          _checkoutLoading = false;
          _checkoutStarted = true;
        });
      }
    }
  }

  Future<void> _confirmPayment() async {
    if (_paying) return;
    setState(() => _paying = true);
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.post(
        '/billing/business/confirm',
        (j) => Map<String, dynamic>.from(j as Map? ?? {}),
        data: {},
      );
      await ref.read(authProvider.notifier).refreshMe();
      ref.invalidate(billingSubscriptionProvider);
      if (mounted) {
        final msg = res['message']?.toString() ?? 'Payment confirmed';
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(ApiClient.errorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _paying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final billing = ref.watch(billingSubscriptionProvider);

    if (auth.status != AuthStatus.authenticated) {
      return Scaffold(
        appBar: AppBar(title: const Text('Business Checkout')),
        body: const Center(child: Text('Sign in to subscribe')),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Business Checkout')),
      body: billing.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(ApiClient.errorMessage(e))),
        data: (data) {
          final plan = data['plan'] is Map ? data['plan'] as Map : {};
          final sub = data['subscription'] is Map ? data['subscription'] as Map : null;
          final isActive = data['isActive'] == true;
          final amount = plan['amount'] ?? 10;
          final currency = plan['currency']?.toString() ?? 'GEL';

          if (_checkoutLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (isActive) {
            final end = sub?['currentPeriodEnd']?.toString();
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.check_circle, color: Colors.green, size: 64),
                    const SizedBox(height: 16),
                    const Text('Subscription active', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                    if (end != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        'Valid until ${DateFormat.yMMMd().format(DateTime.tryParse(end)?.toLocal() ?? DateTime.now())}',
                        style: TextStyle(color: Colors.white.withValues(alpha: 0.6)),
                      ),
                    ],
                    const SizedBox(height: 24),
                    FilledButton(onPressed: () => context.pop(), child: const Text('Done')),
                  ],
                ),
              ),
            );
          }

          return ListView(
            padding: const EdgeInsets.all(24),
            children: [
              Center(
                child: Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    color: AppColors.brandBlue.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Icon(Icons.business_center, size: 36, color: AppColors.brandBlue),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Business Account',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              Text(
                plan['description']?.toString() ?? 'List your company in Services',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white.withValues(alpha: 0.65)),
              ),
              const SizedBox(height: 32),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      Text(plan['name']?.toString() ?? 'Business', style: TextStyle(color: Colors.white.withValues(alpha: 0.6))),
                      const SizedBox(height: 8),
                      Text.rich(
                        TextSpan(
                          children: [
                            TextSpan(text: '$amount ', style: const TextStyle(fontSize: 40, fontWeight: FontWeight.w900)),
                            TextSpan(text: currency == 'GEL' ? '₾' : currency, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w700)),
                            const TextSpan(text: ' / month', style: TextStyle(fontSize: 16, color: Colors.white54)),
                          ],
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              const Text('• Business profile in Services'),
              const Text('• Phone, location, brands'),
              const Text('• Monthly subscription — 10 ₾'),
              const SizedBox(height: 32),
              FilledButton(
                onPressed: _paying ? null : _confirmPayment,
                child: _paying
                    ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
                    : Text('Pay — $amount ${currency == 'GEL' ? '₾' : currency}'),
              ),
              const SizedBox(height: 12),
              Text(
                'Dev payment stub. Real bank integration coming soon.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.4)),
              ),
            ],
          );
        },
      ),
    );
  }
}
