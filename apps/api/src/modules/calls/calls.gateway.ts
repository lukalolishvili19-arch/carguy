import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { authenticateSocket, userRoom } from '../../common/utils/ws-auth.util';
import { CallsService } from './calls.service';

@WebSocketGateway({
  namespace: '/calls',
  cors: { origin: true, credentials: true },
})
export class CallsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(CallsGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly calls: CallsService,
  ) {}

  async handleConnection(client: Socket) {
    const payload = await authenticateSocket(
      client,
      this.jwt,
      this.config.get<string>('jwt.accessSecret')!,
    );
    if (!payload) {
      client.disconnect();
      return;
    }
    client.data.userId = payload.sub;
    client.join(userRoom(payload.sub));
    this.logger.debug(`Calls socket connected: ${payload.username}`);
  }

  handleDisconnect() {}

  @SubscribeMessage('call:invite')
  async onInvite(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { calleeId: string; video?: boolean },
  ) {
    const callerId = client.data.userId as string;
    const session = await this.calls.createSession(callerId, body.calleeId, body.video ?? true);
    this.server.to(userRoom(body.calleeId)).emit('call:incoming', {
      sessionId: session.id,
      callerId,
      video: body.video ?? true,
    });
    client.emit('call:ringing', { sessionId: session.id, calleeId: body.calleeId });
    return { sessionId: session.id, status: 'ringing' };
  }

  @SubscribeMessage('call:accept')
  async onAccept(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { sessionId: string },
  ) {
    const session = await this.calls.accept(body.sessionId, client.data.userId);
    this.server.to(userRoom(session.callerId)).emit('call:accepted', {
      sessionId: session.id,
      calleeId: session.calleeId,
    });
    return { sessionId: session.id, status: 'active' };
  }

  @SubscribeMessage('call:reject')
  async onReject(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { sessionId: string },
  ) {
    const session = await this.calls.reject(body.sessionId, client.data.userId);
    this.server.to(userRoom(session.callerId)).emit('call:rejected', { sessionId: session.id });
    return { ok: true };
  }

  @SubscribeMessage('call:hangup')
  async onHangup(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { sessionId: string },
  ) {
    const session = await this.calls.hangup(body.sessionId, client.data.userId);
    const peerId = session.callerId === client.data.userId ? session.calleeId : session.callerId;
    this.server.to(userRoom(peerId)).emit('call:ended', { sessionId: session.id });
    return { ok: true };
  }

  @SubscribeMessage('call:offer')
  onOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { sessionId: string; targetUserId: string; sdp: unknown },
  ) {
    this.server.to(userRoom(body.targetUserId)).emit('call:offer', {
      sessionId: body.sessionId,
      fromUserId: client.data.userId,
      sdp: body.sdp,
    });
  }

  @SubscribeMessage('call:answer')
  onAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { sessionId: string; targetUserId: string; sdp: unknown },
  ) {
    this.server.to(userRoom(body.targetUserId)).emit('call:answer', {
      sessionId: body.sessionId,
      fromUserId: client.data.userId,
      sdp: body.sdp,
    });
  }

  @SubscribeMessage('call:ice-candidate')
  onIce(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { sessionId: string; targetUserId: string; candidate: unknown },
  ) {
    this.server.to(userRoom(body.targetUserId)).emit('call:ice-candidate', {
      sessionId: body.sessionId,
      fromUserId: client.data.userId,
      candidate: body.candidate,
    });
  }
}
