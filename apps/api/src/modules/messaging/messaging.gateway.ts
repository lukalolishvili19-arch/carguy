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
import {
  authenticateSocket,
  conversationRoom,
} from '../../common/utils/ws-auth.util';
import { MessagingService } from './messaging.service';
import { SendMessageDto } from './dto/message.dto';

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: true, credentials: true },
})
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(MessagingGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly messaging: MessagingService,
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
    this.logger.debug(`Chat socket connected: ${payload.username}`);
  }

  handleDisconnect() {}

  @SubscribeMessage('conversation:join')
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() { conversationId }: { conversationId: string },
  ) {
    await this.messaging.assertMembership(conversationId, client.data.userId);
    client.join(conversationRoom(conversationId));
    return { joined: conversationId };
  }

  @SubscribeMessage('conversation:leave')
  onLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() { conversationId }: { conversationId: string },
  ) {
    client.leave(conversationRoom(conversationId));
    return { left: conversationId };
  }

  @SubscribeMessage('message:send')
  async onMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string } & SendMessageDto,
  ) {
    const { conversationId, ...dto } = payload;
    const message = await this.messaging.sendMessage(conversationId, client.data.userId, dto);
    this.server.to(conversationRoom(conversationId)).emit('message:new', message);
    return message;
  }

  @SubscribeMessage('typing')
  onTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() { conversationId, isTyping }: { conversationId: string; isTyping: boolean },
  ) {
    client.to(conversationRoom(conversationId)).emit('typing', {
      userId: client.data.userId,
      isTyping,
    });
  }
}
