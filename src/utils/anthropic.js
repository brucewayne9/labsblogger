import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

let client = null;

// Initialize OpenAI client
export function initializeAnthropic() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not found in environment variables');
  }

  client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  return client;
}

// Get or initialize client
function getClient() {
  if (!client) {
    client = initializeAnthropic();
  }
  return client;
}

// Wrapper for OpenAI API calls with error handling
export async function callClaude(prompt, options = {}) {
  const {
    model = 'gpt-4o',
    maxTokens = 4000,
    temperature = 0.7,
    systemPrompt = null,
  } = options;

  try {
    const openai = getClient();

    const messages = [];

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    const response = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    });

    return {
      success: true,
      content: response.choices[0].message.content,
      usage: {
        input_tokens: response.usage.prompt_tokens,
        output_tokens: response.usage.completion_tokens,
      },
    };
  } catch (error) {
    console.error('OpenAI API Error:', error.message);

    if (error.status === 429) {
      return {
        success: false,
        error: 'Rate limit reached. Please wait a moment and try again.',
      };
    }

    if (error.status === 401) {
      return {
        success: false,
        error: 'Invalid API key. Please check your OPENAI_API_KEY in .env file.',
      };
    }

    return {
      success: false,
      error: `API Error: ${error.message}`,
    };
  }
}

// Multi-turn conversation support
export class ConversationManager {
  constructor() {
    this.messages = [];
  }

  addUserMessage(content) {
    this.messages.push({
      role: 'user',
      content,
    });
  }

  addAssistantMessage(content) {
    this.messages.push({
      role: 'assistant',
      content,
    });
  }

  async sendMessage(prompt, options = {}) {
    const {
      model = 'gpt-4o',
      maxTokens = 4000,
      temperature = 0.7,
      systemPrompt = null,
    } = options;

    this.addUserMessage(prompt);

    try {
      const openai = getClient();

      const messages = [...this.messages];

      if (systemPrompt) {
        messages.unshift({
          role: 'system',
          content: systemPrompt,
        });
      }

      const response = await openai.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      });

      const assistantMessage = response.choices[0].message.content;
      this.addAssistantMessage(assistantMessage);

      return {
        success: true,
        content: assistantMessage,
        usage: {
          input_tokens: response.usage.prompt_tokens,
          output_tokens: response.usage.completion_tokens,
        },
      };
    } catch (error) {
      console.error('OpenAI API Error:', error.message);

      // Remove the failed user message
      this.messages.pop();

      return {
        success: false,
        error: `API Error: ${error.message}`,
      };
    }
  }

  getHistory() {
    return this.messages;
  }

  clear() {
    this.messages = [];
  }
}

// Estimate token count (rough approximation)
export function estimateTokens(text) {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

// Estimate cost based on tokens
export function estimateCost(inputTokens, outputTokens, model = 'gpt-4o') {
  // Pricing as of Jan 2025 (update as needed)
  const pricing = {
    'gpt-4o': {
      input: 2.50 / 1_000_000,  // $2.50 per million input tokens
      output: 10.00 / 1_000_000, // $10 per million output tokens
    },
    'gpt-4-turbo': {
      input: 10.00 / 1_000_000,
      output: 30.00 / 1_000_000,
    },
    'gpt-3.5-turbo': {
      input: 0.50 / 1_000_000,
      output: 1.50 / 1_000_000,
    },
  };

  const modelPricing = pricing[model] || pricing['gpt-4o'];
  const inputCost = inputTokens * modelPricing.input;
  const outputCost = outputTokens * modelPricing.output;

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}
