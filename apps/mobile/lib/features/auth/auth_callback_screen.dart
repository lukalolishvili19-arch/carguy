import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_provider.dart';

/// Handles `carguy://auth/callback?accessToken=&refreshToken=` (Google OAuth).
class AuthCallbackScreen extends ConsumerStatefulWidget {
  const AuthCallbackScreen({super.key, this.accessToken, this.refreshToken});
  final String? accessToken;
  final String? refreshToken;

  @override
  ConsumerState<AuthCallbackScreen> createState() => _AuthCallbackScreenState();
}

class _AuthCallbackScreenState extends ConsumerState<AuthCallbackScreen> {
  String? _error;

  @override
  void initState() {
    super.initState();
    Future.microtask(_handle);
  }

  Future<void> _handle() async {
    final a = widget.accessToken;
    final r = widget.refreshToken;
    if (a == null || r == null) {
      setState(() => _error = 'Missing tokens');
      return;
    }
    try {
      await ref.read(authProvider.notifier).setTokens(a, r);
      if (mounted) context.go('/');
    } catch (e) {
      setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_error!),
              TextButton(onPressed: () => context.go('/login'), child: const Text('Login')),
            ],
          ),
        ),
      );
    }
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}
