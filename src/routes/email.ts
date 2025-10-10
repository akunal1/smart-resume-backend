import { Router } from 'express'
import { EmailRequest, EmailResponse } from '../types/scheduling'
import { sendEmail } from '../services/email.service'

const router: Router = Router()

// POST /api/email
router.post('/', async (req, res) => {
  try {
    const emailData: EmailRequest = req.body

    // Validate required fields
    if (!emailData.userEmail) {
      return res.status(400).json({ error: 'userEmail is required' })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailData.userEmail)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    // Send the email
    const result = await sendEmail({
      ...emailData,
      to: [emailData.userEmail, 'mail.kunal71@gmail.com'],
    })

    const response: EmailResponse = {
      messageId: result.messageId,
      status: 'sent',
    }

    res.json(response)
  } catch (error) {
    console.error('Email sending error:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to send email',
    })
  }
})

export default router
