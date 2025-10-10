import { Router } from 'express'
import { askPerplexity } from '../services/perplexity.service'
import { config } from '../config/env'
import { ChatMessage, AISummaryResponse } from '../types/scheduling'

const router: Router = Router()

// POST /api/ai/summary
router.post('/summary', async (req, res) => {
  try {
    const { chatHistory } = req.body as { chatHistory: ChatMessage[] }

    if (!chatHistory || !Array.isArray(chatHistory)) {
      return res
        .status(400)
        .json({ error: 'chatHistory is required and must be an array' })
    }

    // Generate summary using AI
    const summary = await generateSummary(chatHistory)

    const response: AISummaryResponse = {
      summary: summary.summary,
      suggestedTitle: summary.title,
      suggestedMode: summary.suggestedMode,
    }

    res.json(response)
  } catch (error) {
    console.error('AI Summary error:', error)
    res.status(500).json({ error: 'Failed to generate summary' })
  }
})

// Helper function to generate summary using Perplexity AI
async function generateSummary(chatHistory: ChatMessage[]): Promise<{
  summary: string
  title: string
  suggestedMode?: 'email' | 'meeting'
}> {
  // Format conversation for AI
  const conversationText = chatHistory
    .slice(-10) // Last 10 messages for context
    .map(
      (msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    )
    .join('\n')

  const systemPrompt = `You are an AI assistant that summarizes conversations and suggests meeting titles.

Based on the following conversation, provide:
1. A concise summary in 3-5 bullet points covering decisions, blockers, next steps
2. A suggested meeting title (max 8 words)
3. Whether this seems like it needs a meeting ('meeting') or just an email follow-up ('email')

Keep the total summary under 120 words.

Conversation:
${conversationText}

Respond in JSON format:
{
  "summary": "• Point 1\n• Point 2\n• Point 3",
  "title": "Suggested Meeting Title",
  "suggestedMode": "meeting" or "email"
}`

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    {
      role: 'user' as const,
      content:
        'Please analyze this conversation and provide the summary, title, and suggested mode.',
    },
  ]

  let rawResponse: string | undefined

  try {
    const response = await askPerplexity(messages)
    rawResponse = response.choices[0].message.content

    // Parse the JSON response - handle markdown code blocks
    const content = rawResponse.trim()

    // Extract JSON from markdown code block if present
    let jsonContent = content
    if (content.startsWith('```json')) {
      const startIndex = content.indexOf('{')
      const endIndex = content.lastIndexOf('}')
      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        jsonContent = content.substring(startIndex, endIndex + 1)
      }
    } else if (content.includes('```json')) {
      // Handle case where ```json appears in the middle
      const jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/)
      if (jsonMatch && jsonMatch[1]) {
        jsonContent = jsonMatch[1]
      }
    }

    const parsed = JSON.parse(jsonContent)

    return {
      summary: parsed.summary || 'Summary not available',
      title: parsed.title || 'Meeting',
      suggestedMode: parsed.suggestedMode === 'meeting' ? 'meeting' : 'email',
    }
  } catch (error) {
    console.error('Summary generation failed:', error)
    console.error('Raw AI response:', rawResponse)
    // Fallback summary
    return {
      summary:
        '• Discussion about project requirements\n• Need for follow-up\n• Action items identified',
      title: 'Project Discussion',
      suggestedMode: 'email',
    }
  }
}

export default router
