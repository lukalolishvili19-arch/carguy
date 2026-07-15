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

final garageProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  return api.get('/garage', (j) => parseItemMaps(j));
});

class GarageScreen extends ConsumerStatefulWidget {
  const GarageScreen({super.key});

  @override
  ConsumerState<GarageScreen> createState() => _GarageScreenState();
}

class _GarageScreenState extends ConsumerState<GarageScreen> {
  bool _showForm = false;
  bool _saving = false;
  final _nickname = TextEditingController();
  final _brand = TextEditingController();
  final _model = TextEditingController();
  final _year = TextEditingController();
  final _mileage = TextEditingController();
  final _color = TextEditingController();
  final _plate = TextEditingController();

  @override
  void dispose() {
    _nickname.dispose();
    _brand.dispose();
    _model.dispose();
    _year.dispose();
    _mileage.dispose();
    _color.dispose();
    _plate.dispose();
    super.dispose();
  }

  void _resetForm() {
    _nickname.clear();
    _brand.clear();
    _model.clear();
    _year.clear();
    _mileage.clear();
    _color.clear();
    _plate.clear();
  }

  Future<void> _saveVehicle() async {
    if (_brand.text.trim().isEmpty || _model.text.trim().isEmpty || _year.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Brand, model and year are required')));
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(apiClientProvider).post('/garage', (_) => null, data: {
        if (_nickname.text.trim().isNotEmpty) 'nickname': _nickname.text.trim(),
        'brand': _brand.text.trim(),
        'model': _model.text.trim(),
        'year': int.parse(_year.text.trim()),
        if (_mileage.text.trim().isNotEmpty) 'mileage': int.parse(_mileage.text.trim()),
        if (_color.text.trim().isNotEmpty) 'color': _color.text.trim(),
        if (_plate.text.trim().isNotEmpty) 'licensePlate': _plate.text.trim(),
      });
      _resetForm();
      setState(() => _showForm = false);
      ref.invalidate(garageProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Vehicle added')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(ApiClient.errorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  String? _vehicleImage(Map<String, dynamic> car) {
    final media = car['media'];
    if (media is List && media.isNotEmpty) {
      final first = media.first;
      if (first is Map && first['url'] != null) return first['url'].toString();
    }
    return car['imageUrl']?.toString() ?? car['photoUrl']?.toString() ?? car['coverUrl']?.toString();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    if (auth.status != AuthStatus.authenticated) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.directions_car, size: 48, color: AppColors.white40),
              const SizedBox(height: 12),
              const Text('Sign in to manage your garage', style: TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 16),
              CgPrimaryButton(label: 'Sign In', onPressed: () => context.go('/login')),
            ],
          ),
        ),
      );
    }

    final garage = ref.watch(garageProvider);
    return SafeArea(
      bottom: false,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 8, 8),
            child: Row(
              children: [
                const Expanded(child: Text('My Garage', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900))),
                TextButton.icon(
                  onPressed: () => setState(() {
                    _showForm = !_showForm;
                    if (!_showForm) _resetForm();
                  }),
                  icon: Icon(_showForm ? Icons.close : Icons.add, size: 18),
                  label: Text(_showForm ? 'Cancel' : 'Add vehicle'),
                  style: TextButton.styleFrom(foregroundColor: AppColors.brandRed),
                ),
              ],
            ),
          ),
          Expanded(
            child: garage.when(
              loading: () => const Center(child: CircularProgressIndicator(color: AppColors.brandRed)),
              error: (e, _) => Center(child: Text(ApiClient.errorMessage(e))),
              data: (cars) {
                return RefreshIndicator(
                  color: AppColors.brandRed,
                  onRefresh: () async {
                    ref.invalidate(garageProvider);
                    await ref.read(garageProvider.future);
                  },
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                    children: [
                      if (_showForm) ...[
                        CgGlassCard(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              const Text('Add vehicle', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                              const SizedBox(height: 12),
                              TextField(controller: _nickname, decoration: const InputDecoration(hintText: 'Nickname (optional)')),
                              const SizedBox(height: 10),
                              Row(
                                children: [
                                  Expanded(child: TextField(controller: _brand, decoration: const InputDecoration(hintText: 'Brand *'))),
                                  const SizedBox(width: 10),
                                  Expanded(child: TextField(controller: _model, decoration: const InputDecoration(hintText: 'Model *'))),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Row(
                                children: [
                                  Expanded(child: TextField(controller: _year, keyboardType: TextInputType.number, decoration: const InputDecoration(hintText: 'Year *'))),
                                  const SizedBox(width: 10),
                                  Expanded(child: TextField(controller: _mileage, keyboardType: TextInputType.number, decoration: const InputDecoration(hintText: 'Mileage (km)'))),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Row(
                                children: [
                                  Expanded(child: TextField(controller: _color, decoration: const InputDecoration(hintText: 'Color'))),
                                  const SizedBox(width: 10),
                                  Expanded(child: TextField(controller: _plate, decoration: const InputDecoration(hintText: 'License plate'))),
                                ],
                              ),
                              const SizedBox(height: 14),
                              CgPrimaryButton(label: 'Save vehicle', loading: _saving, onPressed: _saveVehicle),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],
                      if (cars.isEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 80),
                          child: Column(
                            children: [
                              const Icon(Icons.directions_car, size: 48, color: AppColors.white40),
                              const SizedBox(height: 12),
                              const Text('Your garage is empty', style: TextStyle(fontWeight: FontWeight.w700)),
                              const SizedBox(height: 6),
                              Text('Add your first vehicle!', style: TextStyle(color: Colors.white.withValues(alpha: 0.45))),
                              if (!_showForm) ...[
                                const SizedBox(height: 16),
                                CgPrimaryButton(
                                  label: 'Add vehicle',
                                  onPressed: () => setState(() => _showForm = true),
                                ),
                              ],
                            ],
                          ),
                        )
                      else
                        ...cars.map((car) {
                          final image = _vehicleImage(car);
                          final brand = car['brand']?.toString() ?? car['make']?.toString() ?? '';
                          final model = car['model']?.toString() ?? '';
                          final year = car['year']?.toString() ?? '';
                          final nickname = car['nickname']?.toString();
                          final mileage = car['mileage'];
                          final maintCount = car['_count'] is Map ? (car['_count']['maintenance'] as num?)?.toInt() ?? 0 : 0;
                          final title = (nickname != null && nickname.isNotEmpty) ? nickname : '$brand $model'.trim();

                          return Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: CgGlassCard(
                              padding: EdgeInsets.zero,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  ClipRRect(
                                    borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
                                    child: AspectRatio(
                                      aspectRatio: 16 / 9,
                                      child: image != null
                                          ? CachedNetworkImage(imageUrl: image, fit: BoxFit.cover)
                                          : Container(
                                              color: AppColors.surfaceElevated,
                                              child: const Icon(Icons.directions_car, size: 48, color: AppColors.white40),
                                            ),
                                    ),
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.all(14),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(title.isEmpty ? 'Vehicle' : title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                                        const SizedBox(height: 4),
                                        Text(
                                          [if (year.isNotEmpty) year, brand, model].where((e) => e.toString().isNotEmpty).join(' · '),
                                          style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 13),
                                        ),
                                        const SizedBox(height: 10),
                                        Row(
                                          children: [
                                            if (mileage != null) ...[
                                              const Icon(Icons.speed, size: 14, color: AppColors.white40),
                                              const SizedBox(width: 4),
                                              Text(
                                                '${NumberFormat.decimalPattern().format(mileage)} km',
                                                style: const TextStyle(fontSize: 12, color: AppColors.white40),
                                              ),
                                              const SizedBox(width: 14),
                                            ],
                                            const Icon(Icons.build, size: 14, color: AppColors.white40),
                                            const SizedBox(width: 4),
                                            Text('$maintCount logs', style: const TextStyle(fontSize: 12, color: AppColors.white40)),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }),
                    ],
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
