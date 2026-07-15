import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/cg_widgets.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _page = PageController();
  int _slide = 0;

  static const _slides = [
    (
      image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&h=900&fit=crop&auto=format',
      title: 'Your Car Community',
      body: 'Connect with thousands of car enthusiasts, share builds, and discover amazing rides from around the world.',
    ),
    (
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=900&fit=crop&auto=format',
      title: 'Find Trusted Services',
      body: 'Book mechanics, detailing, tuning workshops and more — all rated and verified by real car owners.',
    ),
    (
      image: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&h=900&fit=crop&auto=format',
      title: 'Buy, Sell & Trade',
      body: 'Browse thousands of cars, parts, and accessories. List your vehicle in minutes and sell fast.',
    ),
  ];

  Future<void> _done() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('onboarding_done', true);
    ref.invalidate(onboardingDoneProvider);
    if (mounted) context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    final s = _slides[_slide];
    return Scaffold(
      backgroundColor: AppColors.brandBlack,
      body: Column(
        children: [
          Expanded(
            child: Stack(
              fit: StackFit.expand,
              children: [
                PageView.builder(
                  controller: _page,
                  itemCount: _slides.length,
                  onPageChanged: (i) => setState(() => _slide = i),
                  itemBuilder: (_, i) => CachedNetworkImage(
                    imageUrl: _slides[i].image,
                    fit: BoxFit.cover,
                  ),
                ),
                Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Colors.transparent, Colors.black54, Colors.black],
                    ),
                  ),
                ),
                Positioned(
                  top: MediaQuery.paddingOf(context).top + 16,
                  left: 20,
                  child: const CgBrandLogo(size: 16),
                ),
                Positioned(
                  left: 20,
                  right: 20,
                  bottom: 32,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(s.title, style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w900, height: 1.15)),
                      const SizedBox(height: 10),
                      Text(s.body, style: TextStyle(fontSize: 14, height: 1.45, color: Colors.white.withValues(alpha: 0.7))),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(_slides.length, (i) {
                    final active = i == _slide;
                    return AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      width: active ? 24 : 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: active ? AppColors.brandRed : Colors.white24,
                        borderRadius: BorderRadius.circular(999),
                      ),
                    );
                  }),
                ),
                const SizedBox(height: 20),
                if (_slide < _slides.length - 1)
                  Row(
                    children: [
                      TextButton(onPressed: _done, child: const Text('Skip', style: TextStyle(color: AppColors.white40))),
                      const SizedBox(width: 12),
                      Expanded(
                        child: CgPrimaryButton(
                          label: 'Get Started',
                          onPressed: () => _page.nextPage(duration: const Duration(milliseconds: 300), curve: Curves.easeOut),
                        ),
                      ),
                    ],
                  )
                else
                  CgPrimaryButton(label: 'Get Started', onPressed: _done),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
