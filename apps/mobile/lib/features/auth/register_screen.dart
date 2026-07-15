import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/cg_widgets.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _name = TextEditingController();
  final _username = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _asBusiness = false;
  bool _loading = false;
  bool _obscure = true;

  @override
  void dispose() {
    _name.dispose();
    _username.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _loading = true);
    try {
      await ref.read(authProvider.notifier).register(
            email: _email.text.trim(),
            password: _password.text,
            username: _username.text.trim(),
            displayName: _name.text.trim(),
            asBusiness: _asBusiness,
          );
      if (!mounted) return;
      context.go(_asBusiness ? '/billing/checkout' : '/');
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
    return Scaffold(
      backgroundColor: AppColors.brandBlack,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
          children: [
            const CgBrandLogo(),
            const SizedBox(height: 28),
            const Text('Create Account', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            Text('Join the automotive community', style: TextStyle(color: Colors.white.withValues(alpha: 0.5))),
            const SizedBox(height: 28),
            TextField(controller: _name, decoration: const InputDecoration(hintText: 'Full Name')),
            const SizedBox(height: 12),
            TextField(controller: _username, decoration: const InputDecoration(hintText: 'Username')),
            const SizedBox(height: 12),
            TextField(controller: _email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(hintText: 'Email address')),
            const SizedBox(height: 12),
            TextField(
              controller: _password,
              obscureText: _obscure,
              decoration: InputDecoration(
                hintText: 'Password',
                suffixIcon: IconButton(
                  onPressed: () => setState(() => _obscure = !_obscure),
                  icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                ),
              ),
            ),
            const SizedBox(height: 12),
            CgGlassCard(
              child: CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                value: _asBusiness,
                activeColor: AppColors.brandRed,
                onChanged: (v) => setState(() => _asBusiness = v ?? false),
                title: const Text('Business account — 10 ₾/month', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                subtitle: Text('List your company in Services after checkout', style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.45))),
                controlAffinity: ListTileControlAffinity.leading,
              ),
            ),
            const SizedBox(height: 20),
            CgPrimaryButton(label: 'Create Account', loading: _loading, onPressed: _submit),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text('Already have an account? ', style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 13)),
                GestureDetector(
                  onTap: () => context.go('/login'),
                  child: const Text('Sign In', style: TextStyle(color: AppColors.brandRed, fontWeight: FontWeight.w800, fontSize: 13)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
