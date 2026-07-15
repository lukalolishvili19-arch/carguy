import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/cg_widgets.dart';
import 'marketplace_data.dart';

class CreateListingScreen extends ConsumerStatefulWidget {
  const CreateListingScreen({super.key});

  @override
  ConsumerState<CreateListingScreen> createState() => _CreateListingScreenState();
}

class _CreateListingScreenState extends ConsumerState<CreateListingScreen> {
  final _price = TextEditingController();
  final _mileage = TextEditingController();
  final _engine = TextEditingController();
  final _vin = TextEditingController();
  final _description = TextEditingController();
  final _partNumber = TextEditingController();
  final _rimWidth = TextEditingController();
  final _rimHeight = TextEditingController();

  final _images = <String>[];
  String _category = 'CAR';
  String? _brand;
  String? _model;
  int? _year;
  String? _city;
  String _fuel = 'PETROL';
  int? _rimRadius;
  bool _uploading = false;
  bool _saving = false;

  bool get _isVehicle => _category == 'CAR' || _category == 'MOTORCYCLE';
  bool get _isWheel => _category == 'WHEEL';

  @override
  void dispose() {
    _price.dispose();
    _mileage.dispose();
    _engine.dispose();
    _vin.dispose();
    _description.dispose();
    _partNumber.dispose();
    _rimWidth.dispose();
    _rimHeight.dispose();
    super.dispose();
  }

  Future<void> _pickPhotos() async {
    final files = await ImagePicker().pickMultiImage(imageQuality: 85);
    if (files.isEmpty) return;
    setState(() => _uploading = true);
    try {
      final api = ref.read(apiClientProvider);
      for (final file in files) {
        final bytes = await file.readAsBytes();
        final name = file.name.isNotEmpty ? file.name : 'photo.jpg';
        final up = await api.uploadBytes(bytes, name);
        final url = up['url']?.toString();
        if (url != null) _images.add(url);
      }
      if (mounted) setState(() {});
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(ApiClient.errorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _submit() async {
    if (_images.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Upload at least one photo')));
      return;
    }
    if (_brand == null || _model == null || _year == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Brand, model and year are required')));
      return;
    }
    if (_price.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Price is required')));
      return;
    }
    if (_city == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Location is required')));
      return;
    }
    final vin = _vin.text.trim();
    if (_isVehicle && vin.isNotEmpty && vin.length != 17) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('VIN must be 17 characters')));
      return;
    }
    if (_isWheel) {
      if (_partNumber.text.trim().isEmpty || _rimWidth.text.isEmpty || _rimHeight.text.isEmpty || _rimRadius == null) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Wheel details are required')));
        return;
      }
    }

    setState(() => _saving = true);
    try {
      final title = '$_year $_brand $_model'.trim();
      final body = <String, dynamic>{
        'title': title,
        'description': _description.text.trim().isEmpty ? null : _description.text.trim(),
        'category': _category,
        'price': num.parse(_price.text.trim()),
        'brand': _brand,
        'model': _model,
        'year': _year,
        'city': _city,
        'country': 'Georgia',
        'images': _images,
        if (_isVehicle) ...{
          if (vin.isNotEmpty) 'vin': vin,
          if (_mileage.text.trim().isNotEmpty) 'mileage': num.parse(_mileage.text.trim()),
          if (_engine.text.trim().isNotEmpty) 'engineSize': num.parse(_engine.text.trim()),
          'fuelType': _fuel,
        },
        if (_isWheel) ...{
          'partNumber': _partNumber.text.trim(),
          'rimWidth': num.parse(_rimWidth.text.trim()),
          'rimHeight': num.parse(_rimHeight.text.trim()),
          'rimRadius': _rimRadius,
        },
      };
      body.removeWhere((_, v) => v == null);

      await ref.read(apiClientProvider).post('/marketplace', (_) => null, data: body);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Listing published')));
      context.pop(true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(ApiClient.errorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final models = _brand == null ? <String>[] : modelsForBrand(_brand!);

    return Scaffold(
      backgroundColor: AppColors.brandBlack,
      body: Column(
        children: [
          CgBackHeader(
            title: 'New listing',
            right: TextButton(
              onPressed: _saving || _uploading ? null : _submit,
              child: _saving
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.brandRed))
                  : const Text('Publish', style: TextStyle(color: AppColors.brandRed, fontWeight: FontWeight.w800)),
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const Text('Photos', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    ..._images.asMap().entries.map((e) {
                      return Stack(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: CachedNetworkImage(imageUrl: e.value, width: 80, height: 80, fit: BoxFit.cover),
                          ),
                          Positioned(
                            right: 2,
                            top: 2,
                            child: InkWell(
                              onTap: () => setState(() => _images.removeAt(e.key)),
                              child: const CircleAvatar(radius: 10, backgroundColor: Colors.black54, child: Icon(Icons.close, size: 12)),
                            ),
                          ),
                        ],
                      );
                    }),
                    InkWell(
                      onTap: _uploading ? null : _pickPhotos,
                      child: Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.white24, style: BorderStyle.solid),
                          color: AppColors.surfaceElevated,
                        ),
                        child: _uploading
                            ? const Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)))
                            : const Icon(Icons.add_photo_alternate_outlined, color: AppColors.brandRed),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _label('Category'),
                DropdownButtonFormField<String>(
                  value: _category,
                  items: listingCategories.map((c) => DropdownMenuItem(value: c, child: Text(categoryLabel(c)))).toList(),
                  onChanged: (v) => setState(() => _category = v ?? 'CAR'),
                  decoration: const InputDecoration(),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _label('Brand'),
                          DropdownButtonFormField<String>(
                            value: _brand,
                            isExpanded: true,
                            hint: const Text('Select'),
                            items: brandNames.map((b) => DropdownMenuItem(value: b, child: Text(b, overflow: TextOverflow.ellipsis))).toList(),
                            onChanged: (v) => setState(() {
                              _brand = v;
                              _model = null;
                            }),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _label('Model'),
                          DropdownButtonFormField<String>(
                            value: _model,
                            isExpanded: true,
                            hint: const Text('Select'),
                            items: models.map((m) => DropdownMenuItem(value: m, child: Text(m, overflow: TextOverflow.ellipsis))).toList(),
                            onChanged: _brand == null ? null : (v) => setState(() => _model = v),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _label('Year'),
                          DropdownButtonFormField<int>(
                            value: _year,
                            hint: const Text('Year'),
                            items: yearOptions.map((y) => DropdownMenuItem(value: y, child: Text('$y'))).toList(),
                            onChanged: (v) => setState(() => _year = v),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _label('Price (₾)'),
                          TextField(controller: _price, keyboardType: TextInputType.number, decoration: const InputDecoration(hintText: '25000')),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _label('Location'),
                DropdownButtonFormField<String>(
                  value: _city,
                  isExpanded: true,
                  hint: const Text('Select city'),
                  items: georgianCities.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                  onChanged: (v) => setState(() => _city = v),
                ),
                if (_isVehicle) ...[
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _label('Mileage (km)'),
                            TextField(controller: _mileage, keyboardType: TextInputType.number, decoration: const InputDecoration(hintText: '80000')),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _label('Engine (L)'),
                            TextField(controller: _engine, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(hintText: '2.0')),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _label('Fuel'),
                  DropdownButtonFormField<String>(
                    value: _fuel,
                    items: fuelTypes.map((f) => DropdownMenuItem(value: f, child: Text(f))).toList(),
                    onChanged: (v) => setState(() => _fuel = v ?? 'PETROL'),
                  ),
                  const SizedBox(height: 12),
                  _label('VIN (optional)'),
                  TextField(
                    controller: _vin,
                    maxLength: 17,
                    textCapitalization: TextCapitalization.characters,
                    decoration: const InputDecoration(hintText: '17 characters', counterText: ''),
                  ),
                ],
                if (_isWheel) ...[
                  const SizedBox(height: 12),
                  _label('Part number'),
                  TextField(controller: _partNumber, decoration: const InputDecoration(hintText: 'P/N')),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [_label('Width'), TextField(controller: _rimWidth, keyboardType: TextInputType.number)])),
                      const SizedBox(width: 8),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [_label('Height'), TextField(controller: _rimHeight, keyboardType: TextInputType.number)])),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _label('R'),
                            DropdownButtonFormField<int>(
                              value: _rimRadius,
                              hint: const Text('R'),
                              items: rimRadiusOptions.map((r) => DropdownMenuItem(value: r, child: Text('R$r'))).toList(),
                              onChanged: (v) => setState(() => _rimRadius = v),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 12),
                _label('Description (optional)'),
                TextField(controller: _description, maxLines: 4, decoration: const InputDecoration(hintText: 'Tell buyers more…')),
                const SizedBox(height: 24),
                CgPrimaryButton(label: 'Publish listing', loading: _saving, onPressed: _submit),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(text, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
      );
}
