import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import OpenAI from 'openai';
import { PrismaService } from '../../prisma/prisma.service';

export class AskDto {
  @IsOptional() @IsString() conversationId?: string;
  @IsString() @MinLength(1) @MaxLength(4000) message!: string;
  @IsOptional() @IsString() imageUrl?: string;
}

const SYSTEM_PROMPT = `You are "CarGuy AI", an expert automotive mechanic assistant.
Help users diagnose car problems, understand dashboard warning lights, estimate repair costs,
recommend maintenance, and suggest what to check. Be concise, practical, and safety-conscious.
When a problem could be dangerous, tell the user to stop driving and seek a professional.
If asked about local workshops, recommend using CarGuy's Services directory and Map.`;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: OpenAI | null;
  private readonly model: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('ai.apiKey');
    this.model = this.config.get<string>('ai.model') ?? 'gpt-4o-mini';
    this.client = apiKey
      ? new OpenAI({ apiKey, baseURL: this.config.get<string>('ai.baseUrl') })
      : null;
  }

  async conversations(userId: string) {
    return this.prisma.aiConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, updatedAt: true },
    });
  }

  async getConversation(id: string, userId: string) {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: { id, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  async ask(userId: string, dto: AskDto) {
    let conversationId = dto.conversationId;
    if (!conversationId) {
      const created = await this.prisma.aiConversation.create({
        data: { userId, title: dto.message.slice(0, 60) },
      });
      conversationId = created.id;
    }

    await this.prisma.aiMessage.create({
      data: { conversationId, role: 'user', content: dto.message, imageUrl: dto.imageUrl },
    });

    const history = await this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    const answer = await this.generate(history, dto.imageUrl);

    const assistantMessage = await this.prisma.aiMessage.create({
      data: { conversationId, role: 'assistant', content: answer },
    });

    await this.prisma.aiConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return { conversationId, message: assistantMessage };
  }

  private async generate(
    history: { role: string; content: string; imageUrl?: string | null }[],
    imageUrl?: string,
  ): Promise<string> {
    if (!this.client) {
      return this.fallback(history[history.length - 1]?.content ?? '');
    }
    try {
      const messages: any[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map((m) => {
          if (m.role === 'user' && (m.imageUrl || imageUrl)) {
            return {
              role: 'user',
              content: [
                { type: 'text', text: m.content },
                { type: 'image_url', image_url: { url: m.imageUrl ?? imageUrl } },
              ],
            };
          }
          return { role: m.role, content: m.content };
        }),
      ];

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.4,
        max_tokens: 700,
      });
      return completion.choices[0]?.message?.content ?? this.fallback('');
    } catch (err) {
      this.logger.error(`AI generation failed: ${(err as Error).message}`);
      return this.fallback(history[history.length - 1]?.content ?? '');
    }
  }

  /** Rule-based fallback so the feature works without an AI key configured. */
  private fallback(question: string): string {
    const q = question.toLowerCase();
    if (q.includes('check engine') || q.includes('engine light')) {
      return "A check-engine light can mean anything from a loose fuel cap to a misfire or a failing oxygen sensor. First, make sure your fuel cap is tight. If the light is flashing, reduce power and get it checked immediately — a flashing light indicates an active misfire that can damage the catalytic converter. Get the fault codes read with an OBD-II scanner; most CarGuy service partners offer free diagnostics.";
    }
    if (q.includes('oil')) {
      return 'For most modern engines, use a fully-synthetic oil that matches your manufacturer spec (commonly 5W-30 or 0W-20 — check your owner\'s manual or the oil cap). Change roughly every 10,000–15,000 km for synthetic, or once a year. Track it in your CarGuy Garage so we can remind you.';
    }
    if (q.includes('tire') || q.includes('winter')) {
      return 'For winter, use dedicated winter tires (marked with the 3PMSF snowflake) once temperatures stay below ~7°C. They stay soft and grip far better than all-seasons on cold/snowy roads. Check tread depth (min 4mm for winter) and keep pressures at spec.';
    }
    return "I'm CarGuy AI. I can help diagnose issues, explain warning lights, estimate repair costs, and recommend maintenance. Tell me your car's make/model/year and describe the symptom (noise, light, smell, when it happens). For hands-on work, browse trusted workshops in the Services directory. (Set AI_API_KEY on the server to enable full AI answers.)";
  }
}
