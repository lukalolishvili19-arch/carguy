import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/auth/auth_provider.dart';
import 'core/i18n/app_localizations.dart';
import 'core/router/app_router.dart';
import 'core/sockets/socket_service.dart';
import 'core/theme/app_theme.dart';
import 'shared/widgets/mobile_phone_frame.dart';

class CarGuyApp extends ConsumerStatefulWidget {
  const CarGuyApp({super.key});

  @override
  ConsumerState<CarGuyApp> createState() => _CarGuyAppState();
}

class _CarGuyAppState extends ConsumerState<CarGuyApp> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      await ref.read(authProvider.notifier).bootstrap();
      final auth = ref.read(authProvider);
      if (auth.status == AuthStatus.authenticated) {
        ref.read(socketServiceProvider).connect();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(goRouterProvider);
    final locale = ref.watch(localeProvider);

    ref.listen(authProvider, (prev, next) {
      final sockets = ref.read(socketServiceProvider);
      if (next.status == AuthStatus.authenticated) {
        sockets.disconnect();
        sockets.connect();
      } else if (next.status == AuthStatus.unauthenticated) {
        sockets.disconnect();
      }
    });

    return MaterialApp.router(
      title: 'CarGuy',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.dark,
      locale: locale,
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      routerConfig: router,
      builder: (context, child) {
        final content = IncomingCallBinder(child: child ?? const SizedBox.shrink());
        return MobilePhoneFrame(child: content);
      },
    );
  }
}

/// Listens for `call:incoming` and navigates to the call screen.
class IncomingCallBinder extends ConsumerStatefulWidget {
  const IncomingCallBinder({super.key, required this.child});
  final Widget child;

  @override
  ConsumerState<IncomingCallBinder> createState() => _IncomingCallBinderState();
}

class _IncomingCallBinderState extends ConsumerState<IncomingCallBinder> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      final sockets = ref.read(socketServiceProvider);
      sockets.onCall('call:incoming', (data) {
        final map = Map<String, dynamic>.from(data as Map);
        final callerId = map['callerId']?.toString();
        final sessionId = map['sessionId']?.toString();
        if (callerId == null || !mounted) return;
        final router = ref.read(goRouterProvider);
        router.push('/call/$callerId?incoming=1&sessionId=${sessionId ?? ''}');
      });
    });
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
