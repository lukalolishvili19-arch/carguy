import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/cg_widgets.dart';

class AiMessage {
  AiMessage({required this.role, required this.content});
  final String role;
  final String content;
}

final aiConversationProvider = StateProvider<List<AiMessage>>((ref) => []);

class AiScreen extends ConsumerStatefulWidget {
  const AiScreen({super.key});

  @override
  ConsumerState<AiScreen> createState() => _AiScreenState();
}

class _AiScreenState extends ConsumerState<AiScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  bool _sending = false;
  String? _conversationId;

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty || _sending) return;
    if (ref.read(authProvider).status != AuthStatus.authenticated) {
      context.push('/login');
      return;
    }
    setState(() => _sending = true);
    _input.clear();
    ref.read(aiConversationProvider.notifier).state = [
      ...ref.read(aiConversationProvider),
      AiMessage(role: 'user', content: text),
    ];
    try {
      final res = await ref.read(apiClientProvider).post(
        '/ai/ask',
        (j) => Map<String, dynamic>.from(j as Map),
        data: {'message': text, if (_conversationId != null) 'conversationId': _conversationId},
      );
      _conversationId = res['conversationId']?.toString() ?? _conversationId;
      final reply = res['message'] is Map
          ? (res['message'] as Map)['content']?.toString()
          : res['reply']?.toString() ?? res['content']?.toString() ?? 'No response';
      ref.read(aiConversationProvider.notifier).state = [
        ...ref.read(aiConversationProvider),
        AiMessage(role: 'assistant', content: reply ?? 'No response'),
      ];
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(ApiClient.errorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final messages = ref.watch(aiConversationProvider);
    return Scaffold(
      backgroundColor: AppColors.brandBlack,
      body: Column(
        children: [
          const CgBackHeader(title: 'AI Mechanic'),
          Expanded(
            child: messages.isEmpty
                ? const Center(child: Text('Ask the AI Mechanic…', style: TextStyle(color: AppColors.white40)))
                : ListView.builder(
                    controller: _scroll,
                    padding: const EdgeInsets.all(16),
                    itemCount: messages.length,
                    itemBuilder: (_, i) {
                      final m = messages[i];
                      final mine = m.role == 'user';
                      return Align(
                        alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color: mine ? AppColors.brandRed : AppColors.brandGray,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Text(m.content),
                        ),
                      );
                    },
                  ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _input,
                      decoration: const InputDecoration(hintText: 'Ask the AI Mechanic…'),
                      onSubmitted: (_) => _send(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _sending ? null : _send,
                    style: IconButton.styleFrom(backgroundColor: AppColors.brandRed),
                    icon: const Icon(Icons.send),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
