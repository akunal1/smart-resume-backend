import { MeetingRequest } from '../types/scheduling'

// Generate ICS (iCalendar) content for meeting fallback
export const generateICS = (meetingData: MeetingRequest): string => {
  const now = new Date()
  const uid = `meeting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@ai-assistant`
  const dtstamp = formatICSTime(now)
  const dtstart = formatICSTime(new Date(meetingData.dateISO))
  const dtend = formatICSTime(new Date(meetingData.endDateISO))

  let ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AI Assistant//Meeting//EN
METHOD:REQUEST
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}
DTSTART:${dtstart}
DTEND:${dtend}
SUMMARY:${meetingData.summary || 'Meeting'}
DESCRIPTION:${formatICSText(meetingData.description || '')}
LOCATION:Google Meet
STATUS:CONFIRMED
SEQUENCE:0
`

  // Add attendees
  meetingData.attendees.forEach((email) => {
    ics += `ATTENDEE;CN=${email};RSVP=TRUE:mailto:${email}\n`
  })

  // Add organizer
  ics += `ORGANIZER:mailto:mail.kunal71@gmail.com\n`

  ics += `END:VEVENT
END:VCALENDAR`

  return ics
}

// Format date/time for ICS format (UTC)
const formatICSTime = (date: Date): string => {
  const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000)
  return utcDate
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
}

// Format text for ICS (escape special characters)
const formatICSText = (text: string): string => {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
}

// Generate ICS for calendar import (METHOD:PUBLISH)
export const generateICSPublish = (meetingData: MeetingRequest): string => {
  const now = new Date()
  const uid = `meeting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@ai-assistant`
  const dtstamp = formatICSTime(now)
  const dtstart = formatICSTime(new Date(meetingData.dateISO))
  const dtend = formatICSTime(new Date(meetingData.endDateISO))

  let ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AI Assistant//Meeting//EN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}
DTSTART:${dtstart}
DTEND:${dtend}
SUMMARY:${meetingData.summary || 'Meeting'}
DESCRIPTION:${formatICSText(meetingData.description || '')}
LOCATION:Google Meet
STATUS:CONFIRMED
SEQUENCE:0
`

  // Add attendees (optional for publish method)
  meetingData.attendees.forEach((email) => {
    ics += `ATTENDEE;CN=${email}:mailto:${email}\n`
  })

  ics += `END:VEVENT
END:VCALENDAR`

  return ics
}
