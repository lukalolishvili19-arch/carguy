import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../shared/widgets/cg_widgets.dart';

class VinScreen extends StatefulWidget {
  const VinScreen({super.key});

  @override
  State<VinScreen> createState() => _VinScreenState();
}

class _VinScreenState extends State<VinScreen> {
  final _vin = TextEditingController();
  Map<String, String>? _result;

  void _decode() {
    final v = _vin.text.trim().toUpperCase();
    if (v.length < 11) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter a valid VIN (17 characters)')));
      return;
    }
    // UI placeholder until dedicated VIN API exists.
    setState(() {
      _result = {
        'VIN': v,
        'Manufacturer': v.startsWith('WBA') || v.startsWith('WBS') ? 'BMW' : 'Unknown',
        'Model Year': '20${v.length >= 10 ? v[9] : '?'}',
        'Plant': 'Decoded locally (demo)',
        'Note': 'Full decoder API coming soon',
      };
    });
  }

  @override
  void dispose() {
    _vin.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.brandBlack,
      body: Column(
        children: [
          CgBackHeader(
            title: 'VIN Decoder',
            right: IconButton(onPressed: () => context.push('/ai'), icon: const Icon(Icons.bolt, color: AppColors.brandRed)),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const Text('Enter VIN Number', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                const SizedBox(height: 12),
                TextField(
                  controller: _vin,
                  textCapitalization: TextCapitalization.characters,
                  maxLength: 17,
                  decoration: const InputDecoration(hintText: 'e.g. WBS8M9C53MAJ12345', counterText: ''),
                ),
                const SizedBox(height: 12),
                CgPrimaryButton(label: 'Decode', onPressed: _decode),
                if (_result != null) ...[
                  const SizedBox(height: 20),
                  ..._result!.entries.map(
                    (e) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: CgGlassCard(
                        child: Row(
                          children: [
                            Expanded(child: Text(e.key, style: TextStyle(color: Colors.white.withValues(alpha: 0.5)))),
                            Text(e.value, style: const TextStyle(fontWeight: FontWeight.w700)),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
