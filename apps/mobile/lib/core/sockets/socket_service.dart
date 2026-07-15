import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../api/api_client.dart';
import '../auth/auth_provider.dart';
import '../config.dart';

typedef SocketHandler = void Function(dynamic data);

class SocketService {
  SocketService(this._tokens);

  final TokenStore _tokens;
  io.Socket? chat;
  io.Socket? notifications;
  io.Socket? calls;

  void connect() {
    final token = _tokens.access;
    if (token == null) return;
    final opts = <String, dynamic>{
      'transports': ['websocket'],
      'auth': {'token': token},
      'autoConnect': false,
    };

    chat = io.io('${AppConfig.socketBaseUrl}/chat', opts)..connect();
    notifications = io.io('${AppConfig.socketBaseUrl}/notifications', opts)..connect();
    calls = io.io('${AppConfig.socketBaseUrl}/calls', opts)..connect();

    chat?.onConnect((_) => debugPrint('socket chat connected'));
    calls?.onConnect((_) => debugPrint('socket calls connected'));
    notifications?.onConnect((_) => debugPrint('socket notifications connected'));
  }

  void disconnect() {
    chat?.dispose();
    notifications?.dispose();
    calls?.dispose();
    chat = null;
    notifications = null;
    calls = null;
  }

  void emitCall(String event, Map<String, dynamic> data) {
    calls?.emit(event, data);
  }

  void onCall(String event, SocketHandler handler) {
    calls?.on(event, handler);
  }

  void offCall(String event) {
    calls?.off(event);
  }
}

final socketServiceProvider = Provider<SocketService>((ref) {
  final service = SocketService(ref.watch(tokenStoreProvider));
  ref.listen(authProvider, (prev, next) {
    if (next.status == AuthStatus.authenticated) {
      service.disconnect();
      service.connect();
    } else if (next.status == AuthStatus.unauthenticated) {
      service.disconnect();
    }
  });
  return service;
});
