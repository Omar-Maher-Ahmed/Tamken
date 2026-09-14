import { LLMToolDefinition } from '../llm/llm.types';

export const CHATBOT_TOOLS: LLMToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'search_providers',
      description:
        'Search for service providers on the Tamken platform. Returns a list of providers matching the criteria.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description:
              'Service category filter. One of: cleaning, plumbing, electrical, carpentry, painting, moving, other',
          },
          city: {
            type: 'string',
            description: 'City name to filter providers by location',
          },
          minRating: {
            type: 'number',
            description: 'Minimum average rating (0-5)',
          },
          maxPrice: {
            type: 'number',
            description: 'Maximum hourly rate',
          },
          page: {
            type: 'number',
            description: 'Page number for pagination (default 1)',
          },
          limit: {
            type: 'number',
            description: 'Results per page, max 50 (default 20)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_provider_details',
      description:
        'Get detailed information about a specific service provider by their profile ID.',
      parameters: {
        type: 'object',
        properties: {
          providerId: {
            type: 'string',
            description: 'The UUID of the provider profile',
          },
        },
        required: ['providerId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_user_jobs',
      description:
        'List the current user service requests (jobs). Works for both customers and providers.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description:
              'Filter by status: pending, accepted, in_progress, completed, cancelled',
          },
          page: {
            type: 'number',
            description: 'Page number (default 1)',
          },
          limit: {
            type: 'number',
            description: 'Results per page (default 20)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_job_status',
      description:
        'Get the status and details of a specific service request (job).',
      parameters: {
        type: 'object',
        properties: {
          jobId: {
            type: 'string',
            description: 'The UUID of the service request',
          },
        },
        required: ['jobId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_user_profile',
      description: 'Get the current user profile information.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_platform_info',
      description:
        'Get general information about the Tamken platform, how it works, or FAQ topics. Use for questions like "how does this work?", "what services are available?", "how do I sign up?", etc.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description:
              'The topic to get info about. Examples: "how_it_works", "services", "signup", "pricing", "verification", "payment", "cancellation"',
          },
        },
        required: ['topic'],
      },
    },
  },
];
