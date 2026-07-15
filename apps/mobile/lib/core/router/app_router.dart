import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../auth/auth_provider.dart';
import '../../features/ai/ai_screen.dart';
import '../../features/auth/auth_callback_screen.dart';
import '../../features/auth/login_screen.dart';
import '../../features/auth/onboarding_screen.dart';
import '../../features/auth/register_screen.dart';
import '../../features/billing/checkout_screen.dart';
import '../../features/booking/booking_screen.dart';
import '../../features/calls/call_screen.dart';
import '../../features/create/create_screen.dart';
import '../../features/dashboard/dashboard_screen.dart';
import '../../features/discounts/discounts_screen.dart';
import '../../features/events/event_detail_screen.dart';
import '../../features/events/events_screen.dart';
import '../../features/explore/explore_screen.dart';
import '../../features/feed/feed_screen.dart';
import '../../features/forum/forum_screen.dart';
import '../../features/forum/thread_detail_screen.dart';
import '../../features/garage/garage_screen.dart';
import '../../features/insurance/insurance_screen.dart';
import '../../features/map/map_screen.dart';
import '../../features/marketplace/create_listing_screen.dart';
import '../../features/marketplace/listing_detail_screen.dart';
import '../../features/marketplace/marketplace_screen.dart';
import '../../features/messages/chat_screen.dart';
import '../../features/messages/messages_screen.dart';
import '../../features/news/news_detail_screen.dart';
import '../../features/news/news_screen.dart';
import '../../features/notifications/notifications_screen.dart';
import '../../features/profile/my_profile_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/search/search_screen.dart';
import '../../features/services/service_detail_screen.dart';
import '../../features/services/services_screen.dart';
import '../../features/settings/settings_screen.dart';
import '../../features/shell/app_shell.dart';
import '../../features/vin/vin_screen.dart';

final _rootKey = GlobalKey<NavigatorState>();
final _shellKey = GlobalKey<NavigatorState>();

final onboardingDoneProvider = FutureProvider<bool>((ref) async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getBool('onboarding_done') ?? false;
});

final goRouterProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authProvider);
  final onboarding = ref.watch(onboardingDoneProvider);

  return GoRouter(
    navigatorKey: _rootKey,
    initialLocation: '/',
    refreshListenable: _AuthRefresh(ref),
    redirect: (context, state) {
      final status = auth.status;
      if (status == AuthStatus.unknown) return null;
      final loc = state.matchedLocation;
      final done = onboarding.asData?.value;

      if (done == false && loc != '/onboarding') return '/onboarding';
      if (done == true && loc == '/onboarding') {
        return status == AuthStatus.authenticated ? '/' : '/login';
      }

      final isAuthRoute = loc == '/login' || loc == '/register';
      final needsAuth = loc.startsWith('/messages') ||
          loc.startsWith('/garage') ||
          loc.startsWith('/booking') ||
          loc.startsWith('/ai') ||
          loc.startsWith('/settings') ||
          loc.startsWith('/dashboard') ||
          loc.startsWith('/notifications') ||
          loc.startsWith('/billing') ||
          loc.startsWith('/create') ||
          loc.startsWith('/call');
      if (status == AuthStatus.unauthenticated && needsAuth) return '/login';
      if (status == AuthStatus.authenticated && isAuthRoute) return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/onboarding', builder: (_, __) => const OnboardingScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      GoRoute(
        path: '/auth/callback',
        builder: (_, state) => AuthCallbackScreen(
          accessToken: state.uri.queryParameters['accessToken'],
          refreshToken: state.uri.queryParameters['refreshToken'],
        ),
      ),
      GoRoute(
        path: '/call/:userId',
        builder: (_, state) => CallScreen(
          userId: state.pathParameters['userId']!,
          incoming: state.uri.queryParameters['incoming'] == '1',
          sessionId: state.uri.queryParameters['sessionId'],
        ),
      ),
      ShellRoute(
        navigatorKey: _shellKey,
        builder: (context, state, child) => AppShell(location: state.uri.toString(), child: child),
        routes: [
          GoRoute(path: '/', builder: (_, __) => const FeedScreen()),
          GoRoute(path: '/explore', builder: (_, __) => const ExploreScreen()),
          GoRoute(path: '/create', builder: (_, __) => const CreateScreen()),
          GoRoute(path: '/garage', builder: (_, __) => const GarageScreen()),
          GoRoute(path: '/profile', builder: (_, __) => const MyProfileScreen()),
          GoRoute(path: '/vin', builder: (_, __) => const VinScreen()),
          GoRoute(path: '/marketplace', builder: (_, __) => const MarketplaceScreen()),
          GoRoute(path: '/marketplace/sell', builder: (_, __) => const CreateListingScreen()),
          GoRoute(
            path: '/marketplace/:slug',
            builder: (_, state) => ListingDetailScreen(slug: state.pathParameters['slug']!),
          ),
          GoRoute(path: '/map', builder: (_, __) => const MapScreen()),
          GoRoute(path: '/messages', builder: (_, __) => const MessagesScreen()),
          GoRoute(
            path: '/messages/:id',
            builder: (_, state) => ChatScreen(conversationId: state.pathParameters['id']!),
          ),
          GoRoute(path: '/news', builder: (_, __) => const NewsScreen()),
          GoRoute(
            path: '/news/:slug',
            builder: (_, state) => NewsDetailScreen(slug: state.pathParameters['slug']!),
          ),
          GoRoute(path: '/services', builder: (_, __) => const ServicesScreen()),
          GoRoute(
            path: '/services/:slug',
            builder: (_, state) => ServiceDetailScreen(slug: state.pathParameters['slug']!),
          ),
          GoRoute(path: '/forum', builder: (_, __) => const ForumScreen()),
          GoRoute(
            path: '/forum/:slug',
            builder: (_, state) => ThreadDetailScreen(slug: state.pathParameters['slug']!),
          ),
          GoRoute(path: '/events', builder: (_, __) => const EventsScreen()),
          GoRoute(
            path: '/events/:slug',
            builder: (_, state) => EventDetailScreen(slug: state.pathParameters['slug']!),
          ),
          GoRoute(path: '/insurance', builder: (_, __) => const InsuranceScreen()),
          GoRoute(path: '/ai', builder: (_, __) => const AiScreen()),
          GoRoute(path: '/discounts', builder: (_, __) => const DiscountsScreen()),
          GoRoute(path: '/booking', builder: (_, __) => const BookingScreen()),
          GoRoute(path: '/dashboard', builder: (_, __) => const DashboardScreen()),
          GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
          GoRoute(path: '/search', builder: (_, __) => const SearchScreen()),
          GoRoute(path: '/notifications', builder: (_, __) => const NotificationsScreen()),
          GoRoute(path: '/billing/checkout', builder: (_, __) => const CheckoutScreen()),
          GoRoute(
            path: '/u/:username',
            builder: (_, state) => ProfileScreen(username: state.pathParameters['username']!),
          ),
        ],
      ),
    ],
  );
});

class _AuthRefresh extends ChangeNotifier {
  _AuthRefresh(this.ref) {
    ref.listen(authProvider, (_, __) => notifyListeners());
    ref.listen(onboardingDoneProvider, (_, __) => notifyListeners());
  }
  final Ref ref;
}
