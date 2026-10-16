import { FunctionDeclaration, Type } from '@google/genai';
import { searchDocuments } from './rag.ts';

export type Tool = {
  declaration: FunctionDeclaration;
  requiresConfirmation: boolean;
  handler: (args: any, userId: number) => Promise<any>;
};

export const tools: Record<string, Tool> = {
  calculator: {
    declaration: {
      name: 'calculator',
      description: 'Perform basic arithmetic operations',
      parameters: {
        type: Type.OBJECT,
        properties: {
          expression: { type: Type.STRING, description: 'The math expression (e.g., 2 + 2)' }
        },
        required: ['expression']
      }
    },
    requiresConfirmation: false,
    handler: async (args: { expression: string }) => {
      try {
        // Safe evaluation
        return { result: eval(args.expression.replace(/[^0-9+\-*/().]/g, '')) };
      } catch (e) {
        return { error: 'Invalid expression' };
      }
    }
  },
  date_time: {
    declaration: {
      name: 'date_time',
      description: 'Get current date and time',
      parameters: { type: Type.OBJECT, properties: {}, required: [] }
    },
    requiresConfirmation: false,
    handler: async () => ({ now: new Date().toISOString() })
  },
  document_search: {
    declaration: {
      name: 'document_search',
      description: 'Search user uploaded documents',
      parameters: {
        type: Type.OBJECT,
        properties: {
          prompt: { type: Type.STRING, description: 'The search prompt' }
        },
        required: ['prompt']
      }
    },
    requiresConfirmation: true,
    handler: async (args: { prompt: string }, userId: number) => {
      const results = await searchDocuments(userId, args.prompt);
      return { results };
    }
  }
};
