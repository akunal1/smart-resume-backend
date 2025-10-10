import { config } from '../config/env'

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions'

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface PerplexityResponse {
  id: string
  model: string
  choices: Array<{
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export const askPerplexity = async (
  messages: PerplexityMessage[]
): Promise<PerplexityResponse> => {
  const response = await fetch(PERPLEXITY_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages,
      stream: false,
      temperature: 0.3,
      max_tokens: 1000,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Perplexity API error response:', errorText)
    throw new Error(
      `Perplexity API error: ${response.status} ${response.statusText} - ${errorText}`
    )
  }

  return response.json()
}
