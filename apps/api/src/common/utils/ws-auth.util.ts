import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { JwtPayload } from '../../modules/auth/token.service';

/** Extracts and verifies the JWT access token from a socket handshake. */
export async function authenticateSocket(
  socket: Socket,
  jwt: JwtService,
  secret: string,
): Promise<JwtPayload | null> {
  const token =
    socket.handshake.auth?.token ||
    (socket.handshake.headers?.authorization as string | undefined)?.replace('Bearer ', '');

  if (!token) return null;
  try {
    return await jwt.verifyAsync<JwtPayload>(token, { secret });
  } catch {
    return null;
  }
}

export const userRoom = (userId: string) => `user:${userId}`;
export const conversationRoom = (conversationId: string) => `conversation:${conversationId}`;
