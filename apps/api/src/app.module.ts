import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { FollowModule } from './modules/follow/follow.module';
import { BusinessesModule } from './modules/businesses/businesses.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { PostsModule } from './modules/posts/posts.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { GarageModule } from './modules/garage/garage.module';
import { BookingModule } from './modules/booking/booking.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { DiscountsModule } from './modules/discounts/discounts.module';
import { ServicesModule } from './modules/services/services.module';
import { ReputationModule } from './modules/reputation/reputation.module';
import { ForumModule } from './modules/forum/forum.module';
import { NewsModule } from './modules/news/news.module';
import { EventsModule } from './modules/events/events.module';
import { InsuranceModule } from './modules/insurance/insurance.module';
import { AiModule } from './modules/ai/ai.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { MapModule } from './modules/map/map.module';
import { AdminModule } from './modules/admin/admin.module';
import { BillingModule } from './modules/billing/billing.module';
import { SearchModule } from './modules/search/search.module';
import { CallsModule } from './modules/calls/calls.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env'],
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    NotificationsModule,
    ReputationModule,
    AuthModule,
    UsersModule,
    ProfilesModule,
    FollowModule,
    BusinessesModule,
    MessagingModule,
    PostsModule,
    MarketplaceModule,
    GarageModule,
    BookingModule,
    ReviewsModule,
    DiscountsModule,
    ServicesModule,
    ForumModule,
    NewsModule,
    EventsModule,
    InsuranceModule,
    AiModule,
    UploadsModule,
    MapModule,
    AdminModule,
    BillingModule,
    SearchModule,
    CallsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
