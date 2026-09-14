import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './shared/filters/http-exception.filter';
import { ResponseTransformInterceptor } from './shared/interceptors/response-transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // ─── CORS ───
  const corsOrigins = process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3001',
  ];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // ─── Global Prefix ───
  // No global prefix — endpoints are at root as specified

  // ─── Global Pipes, Filters, Interceptors ───
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseTransformInterceptor());

  // ─── Swagger ───
  const swaggerConfig = new DocumentBuilder()
    .setTitle('HERFA API')
    .setDescription(
      'C2C Skilled-Services Marketplace REST API.\n\n' +
        '**Core Workflow:** Discovery → Request → Delivery → Feedback\n\n' +
        '**Roles:** customer, provider, admin\n\n' +
        '**Auth:** JWT Bearer token in Authorization header',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token',
      },
      'default',
    )
    .addTag('Auth', 'Authentication & authorization')
    .addTag('Users', 'User & provider profile management')
    .addTag('Discovery', 'Geospatial provider search (PostGIS)')
    .addTag('Jobs / Service Requests', 'Service request lifecycle')
    .addTag('Messaging', 'Real-time chat (WebSocket + REST)')
    .addTag('Reviews', 'Ratings & reviews')
    .addTag('Verification', 'Provider document verification')
    .addTag('Chatbot', 'AI-powered assistant (WebSocket /chatbot + REST)')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'HERFA API Documentation',
  });

  // ─── Start Server ───
  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`🚀 HERFA API running on http://localhost:${port}`);
  logger.log(`📖 Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
