import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClaimStatus } from '@prisma/client';
import { ClaimDto, InsuranceService, QuoteDto } from './insurance.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('insurance')
@Controller('insurance')
export class InsuranceController {
  constructor(private readonly insurance: InsuranceService) {}

  @Public()
  @Get('companies')
  companies() {
    return this.insurance.companies();
  }

  @Public()
  @Get('plans')
  plans() {
    return this.insurance.listPlans();
  }

  @Public()
  @Get('compare')
  compare(@Query('ids') ids: string) {
    return this.insurance.comparePlans((ids ?? '').split(',').filter(Boolean));
  }

  @ApiBearerAuth()
  @Get('policies')
  policies(@CurrentUser() user: AuthUser) {
    return this.insurance.myPolicies(user.id);
  }

  @ApiBearerAuth()
  @Post('quote')
  quote(@CurrentUser() user: AuthUser, @Body() dto: QuoteDto) {
    return this.insurance.quote(user.id, dto);
  }

  @ApiBearerAuth()
  @Patch('policies/:id/activate')
  activate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.insurance.activatePolicy(id, user.id);
  }

  @ApiBearerAuth()
  @Get('claims')
  claims(@CurrentUser() user: AuthUser) {
    return this.insurance.myClaims(user.id);
  }

  @ApiBearerAuth()
  @Post('claims')
  fileClaim(@CurrentUser() user: AuthUser, @Body() dto: ClaimDto) {
    return this.insurance.fileClaim(user.id, dto);
  }

  @ApiBearerAuth()
  @Patch('claims/:id/status')
  updateClaim(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('status') status: ClaimStatus,
  ) {
    return this.insurance.updateClaimStatus(id, status, user.role);
  }
}
