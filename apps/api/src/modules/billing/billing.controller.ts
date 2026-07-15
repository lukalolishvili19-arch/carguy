import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { BillingService } from './billing.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

class ConfirmPaymentDto {
  @IsOptional() @IsString() @MaxLength(200) note?: string;
}

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Public()
  @Get('business-plan')
  plan() {
    return this.billing.getPlan();
  }

  @ApiBearerAuth()
  @Get('subscription')
  mine(@CurrentUser() user: AuthUser) {
    return this.billing.getMySubscription(user.id);
  }

  @ApiBearerAuth()
  @Post('business/checkout')
  checkout(@CurrentUser() user: AuthUser) {
    return this.billing.startCheckout(user.id);
  }

  @ApiBearerAuth()
  @Post('business/confirm')
  confirm(@CurrentUser() user: AuthUser, @Body() dto: ConfirmPaymentDto) {
    return this.billing.confirmPayment(user.id, dto.note);
  }

  @ApiBearerAuth()
  @Post('business/cancel')
  cancel(@CurrentUser() user: AuthUser) {
    return this.billing.cancel(user.id);
  }
}
