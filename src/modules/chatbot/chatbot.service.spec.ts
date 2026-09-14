import { describe, expect, it, jest } from '@jest/globals';
import { ChatbotService } from './chatbot.service';

describe('ChatbotService', () => {
  const makeService = (overrides: Record<string, any> = {}) => {
    const defaults = {
      sessionRepo: {
        findOne: jest.fn<(...args: any[]) => any>().mockResolvedValue({ id: 'session-1', userId: 'user-1', title: null }),
        create: jest.fn<(...args: any[]) => any>().mockImplementation((data) => data),
        save: jest.fn<(...args: any[]) => any>().mockImplementation((data) => Promise.resolve({ ...data, id: 'session-1' })),
        find: jest.fn<(...args: any[]) => any>().mockResolvedValue([]),
        delete: jest.fn<(...args: any[]) => any>().mockResolvedValue({ affected: 1 }),
        remove: jest.fn<(...args: any[]) => any>().mockResolvedValue({}),
      },
      messageRepo: {
        create: jest.fn<(...args: any[]) => any>().mockImplementation((data) => ({ ...data, createdAt: new Date() })),
        save: jest.fn<(...args: any[]) => any>().mockImplementation((data) => Promise.resolve({ ...data, id: 'msg-1', createdAt: new Date() })),
        find: jest.fn<(...args: any[]) => any>().mockResolvedValue([]),
        findAndCount: jest.fn<(...args: any[]) => any>().mockResolvedValue([[], 0]),
        delete: jest.fn<(...args: any[]) => any>().mockResolvedValue({ affected: 1 }),
      },
      llmService: {
        chatCompletion: jest.fn<(...args: any[]) => any>(),
      },
      toolExecutor: {
        execute: jest.fn<(...args: any[]) => any>(),
      },
    };
    return { service: new ChatbotService(
      overrides.sessionRepo || defaults.sessionRepo,
      overrides.messageRepo || defaults.messageRepo,
      overrides.llmService || defaults.llmService,
      overrides.toolExecutor || defaults.toolExecutor,
    ) as any, mocks: { ...defaults, ...overrides } };
  };

  it('returns the assistant content for a direct answer', async () => {
    const { service, mocks } = makeService();
    mocks.llmService.chatCompletion.mockResolvedValue({
      choices: [{ message: { role: 'assistant', content: 'Hello!', tool_calls: undefined }, finish_reason: 'stop' }],
    });

    const result = await service.handleMessage('user-1', 'customer', 'Hi');

    expect(result.content).toBe('Hello!');
    expect(result.sessionId).toBe('session-1');
  });

  it('executes a tool call loop and returns the final answer', async () => {
    const { service, mocks } = makeService();
    mocks.llmService.chatCompletion
      .mockResolvedValueOnce({
        choices: [{
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [{ id: 'call-1', type: 'function', function: { name: 'search_providers', arguments: '{"category":"plumbing"}' } }],
          },
          finish_reason: 'tool_calls',
        }],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Found 3 plumbers.', tool_calls: undefined }, finish_reason: 'stop' }],
      });

    mocks.toolExecutor.execute.mockResolvedValue({
      success: true,
      data: { providers: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }], total: 3 },
    });

    const result = await service.handleMessage('user-1', 'customer', 'Find me a plumber');

    expect(mocks.toolExecutor.execute).toHaveBeenCalledWith(
      'search_providers',
      { category: 'plumbing' },
      'user-1',
      'customer',
    );
    expect(result.content).toBe('Found 3 plumbers.');
    expect(mocks.llmService.chatCompletion).toHaveBeenCalledTimes(2);
  });

  it('returns a fallback when tool calls do not terminate', async () => {
    const { service, mocks } = makeService();
    mocks.llmService.chatCompletion.mockResolvedValue({
      choices: [{
        message: {
          role: 'assistant',
          content: null,
          tool_calls: [{ id: 'call-1', type: 'function', function: { name: 'search_providers', arguments: '{}' } }],
        },
        finish_reason: 'tool_calls',
      }],
    });
    mocks.toolExecutor.execute.mockResolvedValue({ success: true, data: {} });

    const result = await service.handleMessage('user-1', 'customer', 'Keep searching');

    expect(result.content).toContain('I apologize');
    expect(mocks.llmService.chatCompletion.mock.calls.length).toBeGreaterThanOrEqual(5);
  });
});