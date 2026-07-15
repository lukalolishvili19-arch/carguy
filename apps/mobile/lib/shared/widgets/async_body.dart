import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';

/// Parses list responses from `items`, `data`, or a raw JSON array.
List<Map<String, dynamic>> parseItemMaps(dynamic json) {
  if (json is List) {
    return json
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }
  if (json is Map) {
    final raw = json['items'] ?? json['data'];
    if (raw is List) {
      return raw
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    }
  }
  return [];
}

/// Wraps async UI states: loading, error, empty, and data.
class AsyncBody<T> extends StatelessWidget {
  const AsyncBody({
    super.key,
    required this.loading,
    required this.data,
    required this.builder,
    this.error,
    this.isEmpty,
    this.empty,
    this.onRetry,
    this.loadingWidget,
  });

  final bool loading;
  final Object? error;
  final T? data;
  final Widget Function(BuildContext context, T data) builder;
  final bool Function(T data)? isEmpty;
  final Widget? empty;
  final VoidCallback? onRetry;
  final Widget? loadingWidget;

  @override
  Widget build(BuildContext context) {
    if (loading && data == null) {
      return loadingWidget ??
          const Center(
            child: Padding(
              padding: EdgeInsets.all(32),
              child: CircularProgressIndicator(color: AppColors.brandRed),
            ),
          );
    }

    if (error != null && data == null) {
      return _ErrorView(
        message: ApiClient.errorMessage(error!),
        onRetry: onRetry,
      );
    }

    if (data == null) {
      return empty ??
          const Center(
            child: Text('No data', style: TextStyle(color: Colors.white54)),
          );
    }

    if (isEmpty != null && isEmpty!(data as T)) {
      return empty ??
          const Center(
            child: Text('Nothing here yet', style: TextStyle(color: Colors.white54)),
          );
    }

    return builder(context, data as T);
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 48, color: AppColors.brandRed.withValues(alpha: 0.8)),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white70),
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
