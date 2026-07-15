import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IsArray, IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, PaginationDto } from '../../common/dto/pagination.dto';
import { uniqueSlug } from '../../common/utils/slug.util';

export class CreateArticleDto {
  @IsString() @MinLength(5) @MaxLength(200) title!: string;
  @IsOptional() @IsString() excerpt?: string;
  @IsString() @MinLength(20) content!: string;
  @IsOptional() @IsString() coverUrl?: string;
  @IsString() categorySlug!: string;
  @IsOptional() @IsString() authorName?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() sourceUrl?: string;
  @IsOptional() @IsBoolean() isPublished?: boolean;
  @IsOptional() @IsBoolean() isEditorPick?: boolean;
  @IsOptional() @IsBoolean() isTrending?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}

export class QueryArticleDto extends PaginationDto {
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() tag?: string;
}

@Injectable()
export class NewsService {
  constructor(private readonly prisma: PrismaService) {}

  categories() {
    return this.prisma.newsCategory.findMany({ orderBy: { name: 'asc' } });
  }

  async create(dto: CreateArticleDto) {
    const category = await this.prisma.newsCategory.findUnique({
      where: { slug: dto.categorySlug },
    });
    if (!category) throw new NotFoundException('News category not found');
    const { tags, categorySlug, isPublished, ...rest } = dto;
    return this.prisma.article.create({
      data: {
        ...rest,
        categoryId: category.id,
        slug: uniqueSlug(dto.title),
        authorName: dto.authorName ?? 'CarGuy Editorial',
        isPublished: isPublished ?? true,
        publishedAt: isPublished === false ? null : new Date(),
        tags: tags?.length ? { create: tags.map((tag) => ({ tag })) } : undefined,
      },
      include: { category: true, tags: true },
    });
  }

  async list(query: QueryArticleDto) {
    const where: Prisma.ArticleWhereInput = {
      isPublished: true,
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.tag ? { tags: { some: { tag: query.tag } } } : {}),
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { publishedAt: 'desc' },
        include: { category: true, tags: true },
      }),
      this.prisma.article.count({ where }),
    ]);
    return paginate(items, total, query.page, query.limit);
  }

  async highlights() {
    const [trending, editorPicks, popular] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where: { isPublished: true, isTrending: true },
        take: 6,
        orderBy: { publishedAt: 'desc' },
        include: { category: true },
      }),
      this.prisma.article.findMany({
        where: { isPublished: true, isEditorPick: true },
        take: 6,
        orderBy: { publishedAt: 'desc' },
        include: { category: true },
      }),
      this.prisma.article.findMany({
        where: { isPublished: true },
        take: 6,
        orderBy: { viewCount: 'desc' },
        include: { category: true },
      }),
    ]);
    return { trending, editorPicks, popular };
  }

  async findBySlug(slug: string) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: { category: true, tags: true },
    });
    if (!article) throw new NotFoundException('Article not found');
    await this.prisma.article.update({ where: { slug }, data: { viewCount: { increment: 1 } } });
    return article;
  }

  async remove(id: string) {
    await this.prisma.article.delete({ where: { id } });
    return { message: 'Article deleted' };
  }
}
