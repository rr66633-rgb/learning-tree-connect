import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Naashah API')
    .setDescription('API documentation for Naashah - Nursery & Kindergarten Management Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('tenants', 'Tenant/School management')
    .addTag('users', 'User management')
    .addTag('children', 'Child management')
    .addTag('attendance', 'Attendance tracking')
    .addTag('daily-reports', 'Daily reports')
    .addTag('observations', 'EYFS Observations')
    .addTag('finance', 'Billing & Finance')
    .addTag('hr', 'Human Resources')
    .addTag('transportation', 'Bus & Transportation')
    .addTag('communication', 'Messaging & Notifications')
    .addTag('analytics', 'Reports & Analytics')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🌳 Naashah API running on port ${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
