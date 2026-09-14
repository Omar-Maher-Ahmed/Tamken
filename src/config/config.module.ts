import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema: Joi.object({
        // Database
        DATABASE_HOST: Joi.string().default('localhost'),
        DATABASE_PORT: Joi.number().default(5432),
        DATABASE_USER: Joi.string().default('herfa'),
        DATABASE_PASSWORD: Joi.string().default('herfa_secret'),
        DATABASE_NAME: Joi.string().default('herfa_db'),

        // Redis
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().default(6379),
        REDIS_PASSWORD: Joi.string().allow('').default(''),

        // JWT
        JWT_SECRET: Joi.string().required(),
        JWT_ACCESS_EXPIRATION: Joi.string().default('15m'),
        JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),

        // App
        PORT: Joi.number().default(3000),
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        CORS_ORIGINS: Joi.string().default('http://localhost:3001'),

        // LLM (Groq / Together / any OpenAI-compatible API)
        LLM_API_KEY: Joi.string().allow('').default(''),
        LLM_API_URL: Joi.string().default('https://api.groq.com/openai/v1'),
        LLM_MODEL: Joi.string().default('llama-3.3-70b-versatile'),
        LLM_MAX_TOKENS: Joi.number().default(1024),
        LLM_TEMPERATURE: Joi.number().default(0.3),
      }),
    }),
  ],
})
export class AppConfigModule {}
