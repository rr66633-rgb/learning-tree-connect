import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { ChildrenModule } from './children/children.module';
import { AttendanceModule } from './attendance/attendance.module';
import { DailyReportsModule } from './daily-reports/daily-reports.module';
import { ObservationsModule } from './observations/observations.module';
import { FinanceModule } from './finance/finance.module';
import { HrModule } from './hr/hr.module';
import { TransportationModule } from './transportation/transportation.module';
import { CommunicationModule } from './communication/communication.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { NotificationsModule } from './notifications/notifications.module';
import { GatewayModule } from './gateway/gateway.module';
import { PrismaModule } from './common/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    GatewayModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    ChildrenModule,
    AttendanceModule,
    DailyReportsModule,
    ObservationsModule,
    FinanceModule,
    HrModule,
    TransportationModule,
    CommunicationModule,
    AnalyticsModule,
    LoyaltyModule,
    NotificationsModule,
  ],
})
export class AppModule {}
