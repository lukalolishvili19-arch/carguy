import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { CallsGateway } from './calls.gateway';
import { CallsService } from './calls.service';

@Module({
  imports: [ConfigModule, JwtModule.register({})],
  providers: [CallsService, CallsGateway],
  exports: [CallsService],
})
export class CallsModule {}
