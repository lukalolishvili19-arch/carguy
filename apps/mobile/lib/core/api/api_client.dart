import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config.dart';

const _accessKey = 'carguy_access_token';
const _refreshKey = 'carguy_refresh_token';

class TokenStore {
  TokenStore(this._storage);
  final FlutterSecureStorage _storage;
  String? access;
  String? refresh;

  Future<void> load() async {
    access = await _storage.read(key: _accessKey);
    refresh = await _storage.read(key: _refreshKey);
  }

  Future<void> set(String accessToken, String refreshToken) async {
    access = accessToken;
    refresh = refreshToken;
    await _storage.write(key: _accessKey, value: accessToken);
    await _storage.write(key: _refreshKey, value: refreshToken);
  }

  Future<void> clear() async {
    access = null;
    refresh = null;
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
  }
}

class ApiClient {
  ApiClient(this.tokens) {
    dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        connectTimeout: const Duration(seconds: 20),
        receiveTimeout: const Duration(seconds: 30),
        headers: {'Content-Type': 'application/json'},
      ),
    );
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final t = tokens.access;
          if (t != null) options.headers['Authorization'] = 'Bearer $t';
          handler.next(options);
        },
        onError: (error, handler) async {
          if (error.response?.statusCode == 401 &&
              tokens.refresh != null &&
              error.requestOptions.extra['__retry'] != true) {
            try {
              final refreshed = await _refresh();
              if (refreshed) {
                final req = error.requestOptions;
                req.extra['__retry'] = true;
                req.headers['Authorization'] = 'Bearer ${tokens.access}';
                final res = await dio.fetch(req);
                return handler.resolve(res);
              }
            } catch (_) {
              await tokens.clear();
            }
          }
          handler.next(error);
        },
      ),
    );
  }

  late final Dio dio;
  final TokenStore tokens;
  bool _refreshing = false;

  Future<bool> _refresh() async {
    if (_refreshing) return false;
    _refreshing = true;
    try {
      final res = await Dio().post(
        '${AppConfig.apiBaseUrl}/auth/refresh',
        data: {'refreshToken': tokens.refresh},
      );
      final data = res.data is Map && res.data['data'] != null ? res.data['data'] : res.data;
      await tokens.set(data['accessToken'] as String, data['refreshToken'] as String);
      return true;
    } finally {
      _refreshing = false;
    }
  }

  /// Unwraps `{ success, data }` envelope.
  Future<T> unwrap<T>(Future<Response> future, T Function(dynamic json) parse) async {
    final res = await future;
    final body = res.data;
    final raw = body is Map && body.containsKey('data') ? body['data'] : body;
    return parse(raw);
  }

  Future<T> get<T>(String path, T Function(dynamic) parse, {Map<String, dynamic>? query}) {
    return unwrap(dio.get(path, queryParameters: query), parse);
  }

  Future<T> post<T>(String path, T Function(dynamic) parse, {Object? data}) {
    return unwrap(dio.post(path, data: data), parse);
  }

  Future<T> put<T>(String path, T Function(dynamic) parse, {Object? data}) {
    return unwrap(dio.put(path, data: data), parse);
  }

  Future<T> patch<T>(String path, T Function(dynamic) parse, {Object? data}) {
    return unwrap(dio.patch(path, data: data), parse);
  }

  Future<T> delete<T>(String path, T Function(dynamic) parse) {
    return unwrap(dio.delete(path), parse);
  }

  Future<Map<String, dynamic>> uploadLocal(String filePath, String filename) async {
    final form = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath, filename: filename),
    });
    return unwrap(
      dio.post('/uploads/local', data: form),
      (j) => Map<String, dynamic>.from(j as Map),
    );
  }

  Future<Map<String, dynamic>> uploadBytes(List<int> bytes, String filename) async {
    final form = FormData.fromMap({
      'file': MultipartFile.fromBytes(bytes, filename: filename),
    });
    return unwrap(
      dio.post('/uploads/local', data: form),
      (j) => Map<String, dynamic>.from(j as Map),
    );
  }

  static String errorMessage(Object error) {
    if (error is DioException) {
      final data = error.response?.data;
      if (data is Map) {
        final msg = data['message'];
        if (msg is List && msg.isNotEmpty) return msg.first.toString();
        if (msg != null) return msg.toString();
      }
      return error.message ?? 'Network error';
    }
    return error.toString();
  }
}

final tokenStoreProvider = Provider<TokenStore>((ref) {
  return TokenStore(const FlutterSecureStorage());
});

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(ref.watch(tokenStoreProvider));
});
