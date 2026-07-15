import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, limit = 12) {
    const query = q.trim();
    if (!query) {
      return { users: [], posts: [], listings: [], businesses: [], query };
    }

    const [users, posts, listings, businesses] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: query, mode: 'insensitive' } },
            { profile: { displayName: { contains: query, mode: 'insensitive' } } },
          ],
          isActive: true,
          isBanned: false,
        },
        take: limit,
        select: {
          id: true,
          username: true,
          role: true,
          profile: { select: { displayName: true, avatarUrl: true } },
        },
      }),
      this.prisma.post.findMany({
        where: {
          content: { contains: query, mode: 'insensitive' },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              role: true,
              profile: { select: { displayName: true, avatarUrl: true } },
            },
          },
          media: true,
        },
      }),
      this.prisma.listing.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { brand: { contains: query, mode: 'insensitive' } },
            { model: { contains: query, mode: 'insensitive' } },
          ],
          status: 'ACTIVE',
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.business.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { city: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { query, users, posts, listings, businesses };
  }
}
