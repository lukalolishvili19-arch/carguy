import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';

class CreateScreen extends ConsumerStatefulWidget {
  const CreateScreen({super.key});

  @override
  ConsumerState<CreateScreen> createState() => _CreateScreenState();
}

class _CreateScreenState extends ConsumerState<CreateScreen> {
  final _text = TextEditingController();
  String? _localPath;
  String? _uploadedUrl;
  bool _loading = false;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _pick() async {
    final file = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (file == null) return;
    setState(() {
      _localPath = file.path;
      _uploadedUrl = null;
    });
  }

  Future<void> _post() async {
    if (_text.text.trim().isEmpty && _localPath == null) return;
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      String? url = _uploadedUrl;
      if (_localPath != null && url == null) {
        final up = await api.uploadLocal(_localPath!, _localPath!.split(RegExp(r'[\\/]')).last);
        url = up['url'] as String?;
        _uploadedUrl = url;
      }
      await api.post('/posts', (_) => null, data: {
        'type': url != null ? 'PHOTO' : 'QUESTION',
        'content': _text.text.trim(),
        if (url != null) 'media': [{'url': url, 'type': 'IMAGE'}],
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Posted!')));
        context.go('/');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(ApiClient.errorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final canPost = _text.text.trim().isNotEmpty || _localPath != null;
    return Scaffold(
      backgroundColor: AppColors.brandBlack,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Row(
                children: [
                  IconButton(onPressed: () => context.go('/'), icon: const Icon(Icons.close)),
                  const Expanded(child: Text('New Post', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16))),
                  TextButton(
                    onPressed: canPost && !_loading ? _post : null,
                    style: TextButton.styleFrom(
                      foregroundColor: Colors.white,
                      backgroundColor: canPost ? AppColors.brandRed : Colors.white12,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                    ),
                    child: _loading
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Post', style: TextStyle(fontWeight: FontWeight.w800)),
                  ),
                ],
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    TextField(
                      controller: _text,
                      onChanged: (_) => setState(() {}),
                      maxLines: 8,
                      decoration: const InputDecoration(
                        hintText: "What's happening with your car?",
                        border: InputBorder.none,
                        filled: false,
                      ),
                      style: const TextStyle(fontSize: 16),
                    ),
                    if (_localPath != null)
                      Align(
                        alignment: Alignment.centerLeft,
                        child: Chip(
                          label: const Text('Photo attached'),
                          deleteIcon: const Icon(Icons.close, size: 16),
                          onDeleted: () => setState(() {
                            _localPath = null;
                            _uploadedUrl = null;
                          }),
                        ),
                      ),
                    const Spacer(),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: TextButton.icon(
                        onPressed: _pick,
                        icon: const Icon(Icons.photo_outlined, color: AppColors.brandRed),
                        label: const Text('Photo', style: TextStyle(color: AppColors.white40, fontSize: 12)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
