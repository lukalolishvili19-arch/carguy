import 'package:flutter/foundation.dart';

/// App-wide configuration. Override via `--dart-define=API_BASE_URL=...`
class AppConfig {
  static const _apiFromEnv = String.fromEnvironment('API_BASE_URL');
  static const _googleFromEnv = String.fromEnvironment('GOOGLE_AUTH_URL');

  /// Android emulator reaches the host machine via 10.0.2.2; everything else uses localhost.
  static String get apiBaseUrl {
    if (_apiFromEnv.isNotEmpty) return _apiFromEnv;
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:4000/api';
    }
    return 'http://localhost:4000/api';
  }

  /// Socket.IO base (without `/api` path)
  static String get socketBaseUrl {
    final u = Uri.parse(apiBaseUrl);
    return '${u.scheme}://${u.host}:${u.hasPort ? u.port : (u.scheme == 'https' ? 443 : 80)}';
  }

  static String get googleAuthUrl {
    if (_googleFromEnv.isNotEmpty) return _googleFromEnv;
    return '$apiBaseUrl/auth/google';
  }

  static const appScheme = 'carguy';
}
