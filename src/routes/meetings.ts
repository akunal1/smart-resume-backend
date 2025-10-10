import { Router } from 'express'
import { MeetingRequest, EmailResponse } from '../types/scheduling'
import { sendMeetingEmail } from '../services/email.service'

const router: Router = Router()

// POST /api/meetings
router.post('/', async (req, res) => {
  try {
    const meetingData: MeetingRequest = req.body

    // Validate required fields
    if (
      !meetingData.userEmail ||
      !meetingData.dateISO ||
      !meetingData.endDateISO
    ) {
      return res.status(400).json({
        error: 'Missing required fields: userEmail, dateISO, endDateISO',
      })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(meetingData.userEmail)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    // Validate date/time
    const startTime = new Date(meetingData.dateISO)
    const endTime = new Date(meetingData.endDateISO)

    if (startTime >= endTime) {
      return res
        .status(400)
        .json({ error: 'End time must be after start time' })
    }

    if (startTime <= new Date()) {
      return res
        .status(400)
        .json({ error: 'Meeting time must be in the future' })
    }

    // Ensure attendees include required emails
    const attendees = Array.from(
      new Set([
        meetingData.userEmail,
        'mail.kunal71@gmail.com',
        ...meetingData.attendees,
      ])
    )

    // Send meeting email with date/time details
    const emailResult = await sendMeetingEmail({
      ...meetingData,
      attendees,
    })

    const response: EmailResponse = {
      messageId: emailResult.messageId,
      status: 'sent',
    }

    res.json(response)
  } catch (error) {
    console.error('Meeting email error:', error)

    res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Failed to send meeting email',
    })
  }
})

export default router
