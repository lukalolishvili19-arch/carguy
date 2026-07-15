import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AiService, AskDto } from './ai.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('conversations')
  conversations(@CurrentUser() user: AuthUser) {
    return this.ai.conversations(user.id);
  }

  @Get('conversations/:id')
  conversation(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ai.getConversation(id, user.id);
  }

  @Post('ask')
  ask(@CurrentUser() user: AuthUser, @Body() dto: AskDto) {
    return this.ai.ask(user.id, dto);
  }
}
