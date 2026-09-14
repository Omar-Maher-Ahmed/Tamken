import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LLMCompletionRequest,
  LLMCompletionResponse,
  LLMMessage,
  LLMToolDefinition,
} from './llm.types';

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly temperature: number;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>(
      'LLM_API_URL',
      'https://api.groq.com/openai/v1',
    );
    this.apiKey = this.configService.get<string>('LLM_API_KEY', '');
    this.model = this.configService.get<string>(
      'LLM_MODEL',
      'llama-3.3-70b-versatile',
    );
    this.maxTokens = this.configService.get<number>('LLM_MAX_TOKENS', 1024);
    this.temperature = this.configService.get<number>('LLM_TEMPERATURE', 0.3);

    if (!this.apiKey) {
      this.logger.warn(
        'LLM_API_KEY is not set — chatbot will not function',
      );
    }
  }

  async chatCompletion(
    messages: LLMMessage[],
    tools?: LLMToolDefinition[],
    toolChoice: 'auto' | 'none' | 'required' = 'auto',
  ): Promise<LLMCompletionResponse> {
    const body: LLMCompletionRequest = {
      model: this.model,
      messages,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = toolChoice;
    }

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.apiUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          this.logger.error(
            `LLM API error (${response.status}): ${errorBody}`,
          );
          throw new HttpException(
            `LLM API returned ${response.status}`,
            HttpStatus.BAD_GATEWAY,
          );
        }

        const data = (await response.json()) as LLMCompletionResponse;
        this.logger.debug(
          `LLM response: ${data.choices?.length} choices, finish_reason=${data.choices?.[0]?.finish_reason}`,
        );
        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (error instanceof HttpException) {
          throw error;
        }

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          this.logger.warn(
            `LLM request failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new HttpException(
      `LLM API failed after ${maxRetries} attempts: ${lastError?.message}`,
      HttpStatus.BAD_GATEWAY,
    );
  }
}
