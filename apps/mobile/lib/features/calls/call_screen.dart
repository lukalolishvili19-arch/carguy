import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:go_router/go_router.dart';

import '../../core/sockets/socket_service.dart';
import '../../core/theme/app_theme.dart';

enum CallPhase { incoming, ringing, connected, ended }

class CallState {
  const CallState({
    this.phase = CallPhase.ringing,
    this.isMuted = false,
    this.isCameraOff = false,
    this.isFrontCamera = true,
    this.remoteUserId,
    this.sessionId,
    this.error,
  });

  final CallPhase phase;
  final bool isMuted;
  final bool isCameraOff;
  final bool isFrontCamera;
  final String? remoteUserId;
  final String? sessionId;
  final String? error;

  CallState copyWith({
    CallPhase? phase,
    bool? isMuted,
    bool? isCameraOff,
    bool? isFrontCamera,
    String? remoteUserId,
    String? sessionId,
    String? error,
  }) {
    return CallState(
      phase: phase ?? this.phase,
      isMuted: isMuted ?? this.isMuted,
      isCameraOff: isCameraOff ?? this.isCameraOff,
      isFrontCamera: isFrontCamera ?? this.isFrontCamera,
      remoteUserId: remoteUserId ?? this.remoteUserId,
      sessionId: sessionId ?? this.sessionId,
      error: error,
    );
  }
}

class CallController extends StateNotifier<CallState> {
  CallController({
    required this.remoteUserId,
    required this.sockets,
    CallPhase initialPhase = CallPhase.ringing,
    String? sessionId,
  }) : super(CallState(phase: initialPhase, remoteUserId: remoteUserId, sessionId: sessionId)) {
    _bindSocket();
    _initRenderers();
  }

  final String remoteUserId;
  final SocketService sockets;
  RTCPeerConnection? _peer;
  MediaStream? _localStream;
  final RTCVideoRenderer localRenderer = RTCVideoRenderer();
  final RTCVideoRenderer remoteRenderer = RTCVideoRenderer();
  Timer? _ringTimer;

  Future<void> _initRenderers() async {
    await localRenderer.initialize();
    await remoteRenderer.initialize();
    if (state.phase == CallPhase.ringing) {
      _ringTimer = Timer(const Duration(seconds: 45), () {
        if (state.phase == CallPhase.ringing) hangup();
      });
    }
  }

  void _bindSocket() {
    sockets.onCall('call:accepted', (data) async {
      final map = Map<String, dynamic>.from(data as Map);
      state = state.copyWith(sessionId: map['sessionId']?.toString(), phase: CallPhase.connected);
      await _ensurePeer();
      await _createOffer();
    });
    sockets.onCall('call:ringing', (data) {
      final map = Map<String, dynamic>.from(data as Map);
      state = state.copyWith(sessionId: map['sessionId']?.toString());
    });
    sockets.onCall('call:rejected', (_) => hangup());
    sockets.onCall('call:ended', (_) => hangup());
    sockets.onCall('call:offer', (data) async {
      final map = Map<String, dynamic>.from(data as Map);
      await _ensurePeer();
      await _peer!.setRemoteDescription(
        RTCSessionDescription(map['sdp']['sdp'] as String, map['sdp']['type'] as String),
      );
      final answer = await _peer!.createAnswer();
      await _peer!.setLocalDescription(answer);
      sockets.emitCall('call:answer', {
        'sessionId': state.sessionId ?? map['sessionId'],
        'targetUserId': remoteUserId,
        'sdp': answer.toMap(),
      });
      state = state.copyWith(phase: CallPhase.connected);
    });
    sockets.onCall('call:answer', (data) async {
      final map = Map<String, dynamic>.from(data as Map);
      final sdp = map['sdp'];
      await _peer?.setRemoteDescription(
        RTCSessionDescription(sdp['sdp'] as String, sdp['type'] as String),
      );
    });
    sockets.onCall('call:ice-candidate', (data) async {
      final map = Map<String, dynamic>.from(data as Map);
      final c = map['candidate'];
      if (c != null) {
        await _peer?.addCandidate(
          RTCIceCandidate(c['candidate'] as String?, c['sdpMid'] as String?, c['sdpMLineIndex'] as int?),
        );
      }
    });
  }

  Future<void> startOutgoing() async {
    sockets.emitCall('call:invite', {'calleeId': remoteUserId, 'video': true});
    // sessionId comes back via ack in production; also listen accepted
  }

  Future<void> accept() async {
    final id = state.sessionId;
    if (id != null) {
      sockets.emitCall('call:accept', {'sessionId': id});
    }
    state = state.copyWith(phase: CallPhase.connected);
    await _ensurePeer();
  }

  Future<void> reject() async {
    final id = state.sessionId;
    if (id != null) {
      sockets.emitCall('call:reject', {'sessionId': id});
    }
    await hangup();
  }

  Future<void> _ensurePeer() async {
    if (_peer != null) return;
    _peer = await createPeerConnection({
      'iceServers': [
        {'urls': 'stun:stun.l.google.com:19302'},
      ],
    });
    _localStream = await navigator.mediaDevices.getUserMedia({
      'audio': true,
      'video': {'facingMode': 'user'},
    });
    localRenderer.srcObject = _localStream;
    for (final track in _localStream!.getTracks()) {
      await _peer!.addTrack(track, _localStream!);
    }
    _peer!.onTrack = (event) {
      if (event.streams.isNotEmpty) {
        remoteRenderer.srcObject = event.streams[0];
      }
    };
    _peer!.onIceCandidate = (candidate) {
      sockets.emitCall('call:ice-candidate', {
        'sessionId': state.sessionId,
        'targetUserId': remoteUserId,
        'candidate': candidate.toMap(),
      });
    };
  }

  Future<void> _createOffer() async {
    final offer = await _peer!.createOffer();
    await _peer!.setLocalDescription(offer);
    sockets.emitCall('call:offer', {
      'sessionId': state.sessionId,
      'targetUserId': remoteUserId,
      'sdp': offer.toMap(),
    });
  }

  Future<void> toggleMute() async {
    final audio = _localStream?.getAudioTracks().firstOrNull;
    if (audio != null) {
      audio.enabled = !audio.enabled;
      state = state.copyWith(isMuted: !audio.enabled);
    }
  }

  Future<void> toggleCamera() async {
    final video = _localStream?.getVideoTracks().firstOrNull;
    if (video != null) {
      video.enabled = !video.enabled;
      state = state.copyWith(isCameraOff: !video.enabled);
    }
  }

  Future<void> flipCamera() async {
    final videoTracks = _localStream?.getVideoTracks() ?? [];
    for (final track in videoTracks) {
      await Helper.switchCamera(track);
    }
    state = state.copyWith(isFrontCamera: !state.isFrontCamera);
  }

  Future<void> hangup() async {
    _ringTimer?.cancel();
    if (state.sessionId != null) {
      sockets.emitCall('call:hangup', {'sessionId': state.sessionId});
    }
    await _peer?.close();
    _peer = null;
    await _localStream?.dispose();
    _localStream = null;
    state = state.copyWith(phase: CallPhase.ended);
  }

  Future<void> disposeResources() async {
    sockets.offCall('call:accepted');
    sockets.offCall('call:ringing');
    sockets.offCall('call:rejected');
    sockets.offCall('call:ended');
    sockets.offCall('call:offer');
    sockets.offCall('call:answer');
    sockets.offCall('call:ice-candidate');
    _ringTimer?.cancel();
    await _peer?.close();
    await _localStream?.dispose();
    await localRenderer.dispose();
    await remoteRenderer.dispose();
  }
}

final callControllerProvider = StateNotifierProvider.autoDispose
    .family<CallController, CallState, ({String userId, CallPhase phase, String? sessionId})>((ref, args) {
  final sockets = ref.watch(socketServiceProvider);
  final controller = CallController(
    remoteUserId: args.userId,
    sockets: sockets,
    initialPhase: args.phase,
    sessionId: args.sessionId,
  );
  ref.onDispose(() => controller.disposeResources());
  if (args.phase == CallPhase.ringing) {
    controller.startOutgoing();
  }
  return controller;
});

class CallScreen extends ConsumerWidget {
  const CallScreen({
    super.key,
    required this.userId,
    this.incoming = false,
    this.sessionId,
  });

  final String userId;
  final bool incoming;
  final String? sessionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final phase = incoming ? CallPhase.incoming : CallPhase.ringing;
    final key = (userId: userId, phase: phase, sessionId: sessionId);
    final call = ref.watch(callControllerProvider(key));
    final controller = ref.read(callControllerProvider(key).notifier);

    return PopScope(
      canPop: call.phase == CallPhase.ended,
      onPopInvokedWithResult: (didPop, _) async {
        if (!didPop) await controller.hangup();
      },
      child: Scaffold(
        backgroundColor: Colors.black,
        body: SafeArea(
          child: Stack(
            children: [
              Positioned.fill(
                child: call.phase == CallPhase.connected
                    ? RTCVideoView(controller.remoteRenderer, objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover)
                    : Container(
                        color: AppColors.brandBlack,
                        alignment: Alignment.center,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const CircleAvatar(radius: 48, child: Icon(Icons.person, size: 48)),
                            const SizedBox(height: 16),
                            Text(userId, style: const TextStyle(color: Colors.white70)),
                            const SizedBox(height: 8),
                            Text(
                              _statusLabel(call.phase),
                              style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
              ),
              Positioned(
                right: 16,
                top: 16,
                width: 110,
                height: 160,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: RTCVideoView(controller.localRenderer, mirror: true),
                ),
              ),
              Positioned(
                left: 0,
                right: 0,
                bottom: 32,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    if (call.phase == CallPhase.incoming) ...[
                      _RoundBtn(icon: Icons.call_end, color: Colors.red, onTap: controller.reject),
                      _RoundBtn(icon: Icons.call, color: Colors.green, onTap: controller.accept),
                    ] else ...[
                      _RoundBtn(
                        icon: call.isMuted ? Icons.mic_off : Icons.mic,
                        color: Colors.white24,
                        onTap: controller.toggleMute,
                      ),
                      _RoundBtn(
                        icon: call.isCameraOff ? Icons.videocam_off : Icons.videocam,
                        color: Colors.white24,
                        onTap: controller.toggleCamera,
                      ),
                      _RoundBtn(icon: Icons.cameraswitch, color: Colors.white24, onTap: controller.flipCamera),
                      _RoundBtn(
                        icon: Icons.call_end,
                        color: AppColors.brandRed,
                        onTap: () async {
                          await controller.hangup();
                          if (context.mounted) context.pop();
                        },
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _statusLabel(CallPhase phase) {
    switch (phase) {
      case CallPhase.incoming:
        return 'Incoming call';
      case CallPhase.ringing:
        return 'Calling…';
      case CallPhase.connected:
        return 'Connected';
      case CallPhase.ended:
        return 'Ended';
    }
  }
}

class _RoundBtn extends StatelessWidget {
  const _RoundBtn({required this.icon, required this.color, required this.onTap});
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: color,
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(width: 64, height: 64, child: Icon(icon, color: Colors.white)),
      ),
    );
  }
}
