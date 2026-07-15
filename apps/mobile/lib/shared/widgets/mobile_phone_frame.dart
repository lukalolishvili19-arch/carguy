import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// On wide web/desktop, frames the app like the Figma mobile prototype (390×844).
class MobilePhoneFrame extends StatelessWidget {
  const MobilePhoneFrame({super.key, required this.child});
  final Widget child;

  static const phoneWidth = 390.0;
  static const phoneHeight = 844.0;

  @override
  Widget build(BuildContext context) {
    // Real phones / small windows: full bleed.
    final size = MediaQuery.sizeOf(context);
    final useFrame = kIsWeb && size.width > phoneWidth + 48;

    if (!useFrame) return child;

    return ColoredBox(
      color: const Color(0xFF050505),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: phoneWidth,
              height: phoneHeight,
              decoration: BoxDecoration(
                color: AppColors.brandBlack,
                borderRadius: BorderRadius.circular(40),
                border: Border.all(color: Colors.white.withValues(alpha: 0.12), width: 2),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.55),
                    blurRadius: 40,
                    offset: const Offset(0, 20),
                  ),
                ],
              ),
              clipBehavior: Clip.antiAlias,
              child: Stack(
                children: [
                  // Notch / status area visual
                  Positioned(
                    top: 0,
                    left: 0,
                    right: 0,
                    child: Container(
                      height: 44,
                      alignment: Alignment.center,
                      child: Container(
                        width: 120,
                        height: 28,
                        decoration: BoxDecoration(
                          color: Colors.black,
                          borderRadius: BorderRadius.circular(20),
                        ),
                      ),
                    ),
                  ),
                  Positioned.fill(
                    child: MediaQuery(
                      data: MediaQuery.of(context).copyWith(
                        size: const Size(phoneWidth, phoneHeight),
                        padding: const EdgeInsets.only(top: 44, bottom: 16),
                        viewPadding: const EdgeInsets.only(top: 44, bottom: 16),
                        devicePixelRatio: 2,
                      ),
                      child: child,
                    ),
                  ),
                  Positioned(
                    bottom: 6,
                    left: 0,
                    right: 0,
                    child: Center(
                      child: Container(
                        width: 112,
                        height: 4,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.25),
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'CarGuy · Mobile preview',
              style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.35)),
            ),
          ],
        ),
      ),
    );
  }
}
