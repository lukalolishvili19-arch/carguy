import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';

class CgBrandLogo extends StatelessWidget {
  const CgBrandLogo({super.key, this.size = 18, this.iconSize = 16});
  final double size;
  final double iconSize;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: size + 14,
          height: size + 14,
          decoration: BoxDecoration(
            color: AppColors.brandRed,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(Icons.directions_car, size: iconSize, color: Colors.white),
        ),
        const SizedBox(width: 8),
        Text.rich(
          TextSpan(
            style: TextStyle(fontSize: size, fontWeight: FontWeight.w900, color: Colors.white),
            children: const [
              TextSpan(text: 'Car'),
              TextSpan(text: 'Guy', style: TextStyle(color: AppColors.brandRed)),
            ],
          ),
        ),
      ],
    );
  }
}

class CgBackHeader extends StatelessWidget {
  const CgBackHeader({super.key, required this.title, this.right});
  final String title;
  final Widget? right;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: const BoxDecoration(
        color: AppColors.navBar,
        border: Border(bottom: BorderSide(color: AppColors.white08)),
      ),
      child: SafeArea(
        bottom: false,
        child: Row(
          children: [
            InkWell(
              onTap: () => context.pop(),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.arrow_back, size: 18),
              ),
            ),
            Expanded(
              child: Text(
                title,
                textAlign: TextAlign.center,
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
              ),
            ),
            SizedBox(width: 36, child: right),
          ],
        ),
      ),
    );
  }
}

class CgPill extends StatelessWidget {
  const CgPill({super.key, required this.text, this.active = false, this.onTap});
  final String text;
  final bool active;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: active ? AppColors.brandRed : Colors.white.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(999),
          border: active ? null : Border.all(color: Colors.white.withValues(alpha: 0.1)),
        ),
        child: Text(
          text,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: active ? Colors.white : Colors.white.withValues(alpha: 0.6),
          ),
        ),
      ),
    );
  }
}

class CgGlassCard extends StatelessWidget {
  const CgGlassCard({super.key, required this.child, this.padding, this.onTap});
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final card = Container(
      padding: padding ?? const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.brandGray,
        borderRadius: BorderRadius.circular(AppTheme.radius),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: child,
    );
    if (onTap == null) return card;
    return InkWell(onTap: onTap, borderRadius: BorderRadius.circular(AppTheme.radius), child: card);
  }
}

class CgPrimaryButton extends StatelessWidget {
  const CgPrimaryButton({super.key, required this.label, required this.onPressed, this.loading = false});
  final String label;
  final VoidCallback? onPressed;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: FilledButton(
        onPressed: loading ? null : onPressed,
        child: loading
            ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : Text(label),
      ),
    );
  }
}
