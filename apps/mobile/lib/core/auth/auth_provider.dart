import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../../shared/models/models.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthState {
  const AuthState({this.status = AuthStatus.unknown, this.user});
  final AuthStatus status;
  final User? user;

  AuthState copyWith({AuthStatus? status, User? user}) =>
      AuthState(status: status ?? this.status, user: user ?? this.user);
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this._api, this._tokens) : super(const AuthState());

  final ApiClient _api;
  final TokenStore _tokens;

  Future<void> bootstrap() async {
    await _tokens.load();
    if (_tokens.access == null) {
      state = const AuthState(status: AuthStatus.unauthenticated);
      return;
    }
    try {
      final user = await _api.get('/auth/me', (j) => User.fromJson(Map<String, dynamic>.from(j as Map)));
      state = AuthState(status: AuthStatus.authenticated, user: user);
    } catch (e) {
      debugPrint('session restore failed: $e');
      await _tokens.clear();
      state = const AuthState(status: AuthStatus.unauthenticated);
    }
  }

  Future<void> login(String email, String password) async {
    final session = await _api.post(
      '/auth/login',
      (j) => AuthSession.fromJson(Map<String, dynamic>.from(j as Map)),
      data: {'email': email, 'password': password},
    );
    await _tokens.set(session.accessToken, session.refreshToken);
    state = AuthState(status: AuthStatus.authenticated, user: session.user);
  }

  Future<void> register({
    required String email,
    required String password,
    required String username,
    required String displayName,
    bool asBusiness = false,
  }) async {
    final session = await _api.post(
      '/auth/register',
      (j) => AuthSession.fromJson(Map<String, dynamic>.from(j as Map)),
      data: {
        'email': email,
        'password': password,
        'username': username,
        'displayName': displayName,
        'asBusiness': asBusiness,
      },
    );
    await _tokens.set(session.accessToken, session.refreshToken);
    state = AuthState(status: AuthStatus.authenticated, user: session.user);
  }

  Future<void> setTokens(String access, String refresh) async {
    await _tokens.set(access, refresh);
    await refreshMe();
  }

  Future<void> refreshMe() async {
    final user = await _api.get('/auth/me', (j) => User.fromJson(Map<String, dynamic>.from(j as Map)));
    state = AuthState(status: AuthStatus.authenticated, user: user);
  }

  Future<void> logout() async {
    try {
      if (_tokens.refresh != null) {
        await _api.post('/auth/logout', (_) => null, data: {'refreshToken': _tokens.refresh});
      }
    } catch (_) {}
    await _tokens.clear();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(apiClientProvider), ref.watch(tokenStoreProvider));
});
