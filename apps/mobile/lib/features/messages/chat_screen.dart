import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../core/api/api_client.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/async_body.dart';

class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key, required this.conversationId});

  final String conversationId;

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  List<Map<String, dynamic>> _messages = [];
  bool _loading = true;
  Object? _error;
  bool _sending = false;
  final _textCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _textCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      final messages = await api.get(
        '/conversations/${widget.conversationId}/messages',
        (j) {
          if (j is List) {
            return j
                .whereType<Map>()
                .map((e) => Map<String, dynamic>.from(e))
                .toList();
          }
          return parseItemMaps(j);
        },
      );

      if (mounted) {
        setState(() {
          _messages = messages.reversed.toList();
        });
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  String? get _peerUserId {
    final auth = ref.read(authProvider);
    final myId = auth.user?.id;
    for (final msg in _messages) {
      final senderId = msg['senderId']?.toString();
      final sender = msg['sender'];
      final id = senderId ?? (sender is Map ? sender['id']?.toString() : null);
      if (id != null && id != myId) return id;
    }
    return null;
  }

  String get _title {
    final auth = ref.read(authProvider);
    final myId = auth.user?.id;
    for (final msg in _messages) {
      final sender = msg['sender'];
      if (sender is! Map) continue;
      if (sender['id']?.toString() == myId) continue;
      final profile = sender['profile'];
      if (profile is Map && profile['displayName'] != null) {
        return profile['displayName'].toString();
      }
      return sender['username']?.toString() ?? 'Chat';
    }
    return 'Chat';
  }

  Future<void> _send() async {
    final text = _textCtrl.text.trim();
    if (text.isEmpty || _sending) return;

    setState(() => _sending = true);
    _textCtrl.clear();
    try {
      final api = ref.read(apiClientProvider);
      final sent = await api.post(
        '/conversations/${widget.conversationId}/messages',
        (j) => Map<String, dynamic>.from(j as Map),
        data: {'content': text},
      );
      setState(() => _messages = [..._messages, sent]);
      _scrollToBottom();
    } catch (e) {
      _textCtrl.text = text;
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(ApiClient.errorMessage(e))),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _startCall() {
    final peerId = _peerUserId;
    if (peerId != null && peerId.isNotEmpty) {
      context.push('/call/$peerId');
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Cannot start call — peer not found')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final myId = auth.user?.id;

    return Scaffold(
      appBar: AppBar(
        title: Text(_title),
        actions: [
          IconButton(
            icon: const Icon(Icons.call),
            tooltip: 'Call',
            onPressed: _startCall,
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: AsyncBody<List<Map<String, dynamic>>>(
              loading: _loading,
              error: _error,
              data: _messages,
              onRetry: _load,
              isEmpty: (items) => items.isEmpty,
              empty: const Center(
                child: Text('No messages yet — say hello!', style: TextStyle(color: Colors.white54)),
              ),
              builder: (context, messages) => ListView.builder(
                controller: _scrollCtrl,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                itemCount: messages.length,
                itemBuilder: (context, i) {
                  final msg = messages[i];
                  final senderId = msg['senderId']?.toString() ??
                      (msg['sender'] is Map ? (msg['sender'] as Map)['id']?.toString() : null);
                  final isMine = senderId != null && senderId == myId;
                  final content = msg['content']?.toString() ?? '';
                  final created = msg['createdAt'] != null
                      ? DateTime.tryParse(msg['createdAt'].toString())
                      : null;

                  return Align(
                    alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      constraints: BoxConstraints(
                        maxWidth: MediaQuery.sizeOf(context).width * 0.78,
                      ),
                      decoration: BoxDecoration(
                        color: isMine
                            ? AppColors.brandRed.withValues(alpha: 0.85)
                            : const Color(0xFF2A2A2A),
                        borderRadius: BorderRadius.only(
                          topLeft: const Radius.circular(AppTheme.radius),
                          topRight: const Radius.circular(AppTheme.radius),
                          bottomLeft: Radius.circular(isMine ? AppTheme.radius : 4),
                          bottomRight: Radius.circular(isMine ? 4 : AppTheme.radius),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment:
                            isMine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                        children: [
                          Text(content),
                          if (created != null) ...[
                            const SizedBox(height: 4),
                            Text(
                              timeago.format(created, locale: 'en_short'),
                              style: TextStyle(
                                fontSize: 10,
                                color: Colors.white.withValues(alpha: 0.6),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
          Material(
            color: AppColors.brandGray,
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _textCtrl,
                        textCapitalization: TextCapitalization.sentences,
                        decoration: InputDecoration(
                          hintText: 'Type a message…',
                          filled: true,
                          fillColor: const Color(0xFF222222),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(24),
                            borderSide: BorderSide.none,
                          ),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        ),
                        onSubmitted: (_) => _send(),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.filled(
                      style: IconButton.styleFrom(
                        backgroundColor: AppColors.brandRed,
                        foregroundColor: Colors.white,
                      ),
                      onPressed: _sending ? null : _send,
                      icon: _sending
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Icon(Icons.send),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
