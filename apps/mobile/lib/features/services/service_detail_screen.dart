import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/async_body.dart';

class ServiceDetailScreen extends ConsumerStatefulWidget {
  const ServiceDetailScreen({super.key, required this.slug});

  final String slug;

  @override
  ConsumerState<ServiceDetailScreen> createState() => _ServiceDetailScreenState();
}

class _ServiceDetailScreenState extends ConsumerState<ServiceDetailScreen> {
  Map<String, dynamic>? _business;
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
      final data = await api.get(
        '/businesses/${widget.slug}',
        (j) => Map<String, dynamic>.from(j as Map),
      );
      if (mounted) setState(() => _business = data);
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String? get _phone {
    final biz = _business;
    if (biz == null) return null;
    return biz['phone']?.toString() ??
        (biz['owner'] is Map
            ? (biz['owner'] as Map)['profile'] is Map
                ? ((biz['owner'] as Map)['profile'] as Map)['phone']?.toString()
                : null
            : null);
  }

  String? get _ownerUserId {
    final biz = _business;
    if (biz == null) return null;
    if (biz['ownerId'] != null) return biz['ownerId'].toString();
    if (biz['owner'] is Map) {
      return (biz['owner'] as Map)['id']?.toString();
    }
    return null;
  }

  Future<void> _startCall() async {
    final ownerId = _ownerUserId;
    if (ownerId != null && ownerId.isNotEmpty) {
      context.push('/call/$ownerId');
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Owner not available for in-app call')),
    );
  }

  Future<void> _dialPhone() async {
    final phone = _phone;
    if (phone == null || phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No phone number available')),
      );
      return;
    }
    final uri = Uri(scheme: 'tel', path: phone.replaceAll(' ', ''));
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Cannot dial $phone')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_business?['name']?.toString() ?? 'Service')),
      body: AsyncBody<Map<String, dynamic>>(
        loading: _loading,
        error: _error,
        data: _business,
        onRetry: _load,
        builder: (context, biz) {
          final logo = biz['logoUrl']?.toString();
          final phone = _phone;
          final services = biz['services'] is List ? biz['services'] as List : [];

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 36,
                      backgroundColor: AppColors.brandGray,
                      backgroundImage: logo != null && logo.isNotEmpty
                          ? CachedNetworkImageProvider(logo)
                          : null,
                      child: logo == null || logo.isEmpty
                          ? Text(
                              (biz['name']?.toString() ?? 'B').substring(0, 1).toUpperCase(),
                              style: const TextStyle(fontSize: 28),
                            )
                          : null,
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            biz['name']?.toString() ?? 'Business',
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                  fontWeight: FontWeight.w800,
                                ),
                          ),
                          if (biz['category'] != null)
                            Text(
                              biz['category'].toString(),
                              style: const TextStyle(color: Colors.white54),
                            ),
                          if (biz['ratingAvg'] != null)
                            Row(
                              children: [
                                const Icon(Icons.star, size: 16, color: Colors.amber),
                                const SizedBox(width: 4),
                                Text('${biz['ratingAvg']} (${biz['ratingCount'] ?? 0} reviews)'),
                              ],
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
                if (biz['description'] != null && biz['description'].toString().isNotEmpty) ...[
                  const SizedBox(height: 20),
                  Text(biz['description'].toString(), style: const TextStyle(height: 1.5)),
                ],
                if (phone != null && phone.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  Card(
                    child: ListTile(
                      leading: const Icon(Icons.phone, color: AppColors.brandRed),
                      title: const Text('Phone', style: TextStyle(fontSize: 12, color: Colors.white54)),
                      subtitle: Text(phone, style: const TextStyle(fontWeight: FontWeight.w600)),
                      trailing: IconButton(
                        icon: const Icon(Icons.open_in_new),
                        onPressed: _dialPhone,
                        tooltip: 'Dial with phone app',
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: _startCall,
                        icon: const Icon(Icons.call),
                        label: const Text('Call'),
                      ),
                    ),
                    if (phone != null && phone.isNotEmpty) ...[
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _dialPhone,
                          icon: const Icon(Icons.phone),
                          label: const Text('Dial'),
                        ),
                      ),
                    ],
                  ],
                ),
                if (biz['address'] != null || biz['city'] != null) ...[
                  const SizedBox(height: 20),
                  Card(
                    child: ListTile(
                      leading: const Icon(Icons.location_on_outlined),
                      title: const Text('Location', style: TextStyle(fontSize: 12, color: Colors.white54)),
                      subtitle: Text(
                        [biz['address'], biz['city'], biz['country']]
                            .where((e) => e != null && e.toString().isNotEmpty)
                            .join(', '),
                      ),
                    ),
                  ),
                ],
                if (services.isNotEmpty) ...[
                  const SizedBox(height: 24),
                  Text(
                    'Services',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 12),
                  ...services.map((s) {
                    final svc = s is Map ? Map<String, dynamic>.from(s) : <String, dynamic>{};
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        title: Text(svc['name']?.toString() ?? 'Service'),
                        subtitle: svc['description'] != null
                            ? Text(svc['description'].toString())
                            : null,
                      ),
                    );
                  }),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}
