import { google } from 'googleapis'
import { MeetingRequest, MeetingResponse } from '../types/scheduling'
import { config } from '../config/env'

// Initialize Google Auth
const getGoogleAuth = () => {
  if (!config.GOOGLE_CLIENT_EMAIL || !config.GOOGLE_PRIVATE_KEY) {
    throw new Error(
      'Google Calendar service account credentials not configured. Please set GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY in your environment variables.'
    )
  }

  // Process the private key - remove quotes and convert \n to actual newlines
  const privateKey = config.GOOGLE_PRIVATE_KEY.replace(/^"|"$/g, '') // Remove surrounding quotes
    .replace(/\\n/g, '\n') // Convert \n to actual newlines
    .replace(/\\"/g, '"') // Unescape quotes if any

  console.log('Private key starts with:', privateKey.substring(0, 50))
  console.log(
    'Private key ends with:',
    privateKey.substring(privateKey.length - 50)
  )

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: config.GOOGLE_CLIENT_EMAIL,
      private_key: privateKey,
    },
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
  })
}

// Get authorized client
const getCalendarClient = () => {
  const auth = getGoogleAuth()
  return google.calendar({ version: 'v3', auth })
}

// Create a Google Meet event
export const createGoogleMeetEvent = async (
  meetingData: MeetingRequest
): Promise<{
  eventId: string
  htmlLink: string
  hangoutLink: string
}> => {
  const calendar = getCalendarClient()

  // Prepare event data
  const event = {
    summary: meetingData.summary || 'Meeting scheduled via AI Assistant',
    description: formatEventDescription(meetingData),
    start: {
      dateTime: meetingData.dateISO,
      timeZone: meetingData.timezone,
    },
    end: {
      dateTime: meetingData.endDateISO,
      timeZone: meetingData.timezone,
    },
    // Note: Service accounts cannot invite attendees without Domain-Wide Delegation
    // Attendees will be notified via email instead
    reminders: {
      useDefault: true,
    },
    // Note: Conference data creation may not be supported for service accounts
    // Will create calendar event and add Meet link via email instead
  }

  try {
    const response = await calendar.events.insert({
      calendarId: config.GOOGLE_CALENDAR_ID || 'primary',
      requestBody: event,
      // Removed conferenceDataVersion since we're not creating conference data
    })

    if (!response.data.id || !response.data.htmlLink) {
      throw new Error('Failed to create calendar event')
    }

    return {
      eventId: response.data.id,
      htmlLink: response.data.htmlLink,
      hangoutLink: '', // No Meet link created via Calendar API
    }
  } catch (error) {
    console.error('Google Calendar API error:', error)
    throw new Error('Failed to create calendar event')
  }
}

// Format event description with AI summary and conversation history
const formatEventDescription = (meetingData: MeetingRequest): string => {
  let description = ''

  if (meetingData.summary) {
    description += `AI Summary:\n${meetingData.summary}\n\n`
  }

  if (meetingData.description) {
    description += `Additional Notes:\n${meetingData.description}\n\n`
  }

  if (meetingData.conversation) {
    description += `Conversation History:\n${meetingData.conversation}`
  }

  return description.trim()
}

// Update an existing event
export const updateGoogleMeetEvent = async (
  eventId: string,
  updates: Partial<MeetingRequest>
): Promise<void> => {
  const calendar = getCalendarClient()

  const event = {
    summary: updates.summary,
    description: updates.description
      ? formatEventDescription(updates as MeetingRequest)
      : undefined,
    start: updates.dateISO
      ? {
          dateTime: updates.dateISO,
          timeZone: updates.timezone,
        }
      : undefined,
    end: updates.endDateISO
      ? {
          dateTime: updates.endDateISO,
          timeZone: updates.timezone,
        }
      : undefined,
    // Note: Service accounts cannot invite attendees without Domain-Wide Delegation
  }

  try {
    await calendar.events.update({
      calendarId: config.GOOGLE_CALENDAR_ID || 'primary',
      eventId,
      requestBody: event,
      // Removed sendUpdates since we're not inviting attendees through Calendar API
    })
  } catch (error) {
    console.error('Google Calendar update error:', error)
    throw new Error('Failed to update calendar event')
  }
}

// Delete an event
export const deleteGoogleMeetEvent = async (eventId: string): Promise<void> => {
  const calendar = getCalendarClient()

  try {
    await calendar.events.delete({
      calendarId: config.GOOGLE_CALENDAR_ID || 'primary',
      eventId,
      // Removed sendUpdates since we're not inviting attendees through Calendar API
    })
  } catch (error) {
    console.error('Google Calendar delete error:', error)
    throw new Error('Failed to delete calendar event')
  }
}
