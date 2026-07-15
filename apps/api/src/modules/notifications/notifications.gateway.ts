import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { authenticateSocket, userRoom } from '../../common/utils/ws-auth.util';

@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: true, credentials: true },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
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
    this.logger.debug(`Notifications socket connected: ${payload.username}`);
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) client.leave(userRoom(client.data.userId));
  }

  /** Push a notification payload to a specific user. */
  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(userRoom(userId)).emit(event, data);
  }
}
