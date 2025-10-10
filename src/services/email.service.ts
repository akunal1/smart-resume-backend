import nodemailer from "nodemailer";
import {
  EmailRequest,
  MeetingRequest,
  ContactFormRequest,
} from "../types/scheduling";
import { config } from "../config/env";
import { generateICS } from "../lib/ics";

interface EmailPayload extends EmailRequest {
  to: string[];
}

// Create email transporter (supports both SMTP and OAuth2)
const createEmailTransporter = () => {
  // Try SMTP authentication first (simpler setup)
  if (config.EMAIL_USER && config.EMAIL_PASS) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: config.EMAIL_USER,
        pass: config.EMAIL_PASS,
      },
    });
  }

  // Fall back to OAuth2 if SMTP credentials are not available
  if (
    !config.GMAIL_SENDER ||
    !config.GOOGLE_CLIENT_ID ||
    !config.GOOGLE_CLIENT_SECRET ||
    !config.GOOGLE_REFRESH_TOKEN
  ) {
    throw new Error(
      "Email credentials not configured. Please set either EMAIL_USER/EMAIL_PASS for SMTP or GMAIL_SENDER/GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REFRESH_TOKEN for OAuth2 in your environment variables."
    );
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: config.GMAIL_SENDER,
      clientId: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      refreshToken: config.GOOGLE_REFRESH_TOKEN,
    },
  });
};

// Send email with AI summary and conversation history
export const sendEmail = async (
  emailData: EmailPayload
): Promise<{ messageId: string }> => {
  const transporter = createEmailTransporter();

  // Format email content
  const subject =
    emailData.subject || "Summary of Virtual Assistance Discussion";
  const htmlContent = formatEmailContent(emailData);
  const textContent = formatEmailText(emailData);

  // Prepare attachments
  const attachments = [];
  if (emailData.icsAttachment) {
    attachments.push({
      filename: "meeting.ics",
      content: Buffer.from(emailData.icsAttachment, "base64"),
      contentType: "text/calendar",
    });
  }

  const mailOptions = {
    from: config.EMAIL_USER || config.GMAIL_SENDER,
    to: emailData.to,
    subject,
    text: textContent,
    html: htmlContent,
    attachments,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    return { messageId: result.messageId };
  } catch (error) {
    console.error("Email sending failed:", error);
    throw new Error("Failed to send email");
  }
};

// Format HTML email content
const formatEmailContent = (emailData: EmailPayload): string => {
  const userName = emailData.userName || "User";
  let html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 300;">Summary of Virtual Assistance Discussion</h1>
        <p style="color: #e8f8ff; margin: 10px 0 0 0; font-size: 16px;">Conversation insights and next steps</p>
      </div>

      <!-- Content -->
      <div style="padding: 30px; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; margin-bottom: 20px;">
        <!-- AI Summary -->
        <div style="margin-bottom: 25px;">
          <h2 style="color: #2c3e50; font-size: 20px; margin-bottom: 15px; border-bottom: 2px solid #4facfe; padding-bottom: 8px;">📋 Summary</h2>
          <div style="background: #f0f8ff; border: 1px solid #b8daff; padding: 20px; border-radius: 8px;">
            ${emailData.summary
              .split("\n")
              .map((line) =>
                line.startsWith("•")
                  ? `<div style="display: flex; align-items: flex-start; margin-bottom: 8px;">
                       <span style="color: #0066cc; margin-right: 8px; font-weight: bold;">•</span>
                       <span style="color: #495057; line-height: 1.5;">${line.substring(1).trim()}</span>
                     </div>`
                  : `<div style="margin-bottom: 8px;">
                       <strong style="color: #0066cc; font-size: 16px;">${line}</strong>
                     </div>`
              )
              .join("")}
          </div>
        </div>
  `;

  if (emailData.description) {
    html += `
        <!-- Additional Notes -->
        <div style="margin-bottom: 25px;">
          <h3 style="color: #2c3e50; font-size: 18px; margin-bottom: 10px; border-bottom: 2px solid #4facfe; padding-bottom: 5px;">📝 ${userName}'s Note</h3>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 3px solid #28a745;">
            <p style="margin: 0; line-height: 1.6; color: #495057;">${emailData.description.replace(/\n/g, "<br>")}</p>
          </div>
        </div>
    `;
  }

  if (emailData.conversation) {
    html += `
        <!-- Conversation History -->
        <div style="margin-bottom: 25px;">
          <h3 style="color: #2c3e50; font-size: 18px; margin-bottom: 10px; border-bottom: 2px solid #4facfe; padding-bottom: 5px;">💬 Conversation History</h3>
          <div style="background: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 13px; color: #495057; white-space: pre-wrap; max-height: 250px; overflow-y: auto; line-height: 1.4;">
            ${emailData.conversation}
          </div>
        </div>
    `;
  }

  html += `
      </div>

      <!-- Footer -->
      <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 0 0 10px 10px; border-top: 1px solid #dee2e6;">
        <p style="margin: 0; color: #6c757d; font-size: 14px;">
          Generated by <strong>AI Voice Assistant</strong> from your conversation.
        </p>
        <p style="margin: 10px 0 0 0; color: #adb5bd; font-size: 12px;">
          Powered by AI • Stay productive
        </p>
      </div>
    </div>
  `;

  return html;
};

// Format plain text email content
const formatEmailText = (emailData: EmailPayload): string => {
  const userName = emailData.userName || "User";
  let text = `Summary of Virtual Assistance Discussion\n`;
  text += `=====================================\n\n`;

  text += `SUMMARY:\n${emailData.summary}\n\n`;

  if (emailData.description) {
    text += `${userName}'s NOTE:\n${emailData.description}\n\n`;
  }

  if (emailData.conversation) {
    text += `CONVERSATION HISTORY:\n${emailData.conversation}\n\n`;
  }

  text += `---\nGenerated by AI Voice Assistant from your conversation.\n`;
  text += `Powered by AI • Stay productive`;

  return text;
};

// Format HTML meeting email content
const formatMeetingEmailContent = (
  meetingData: MeetingRequest,
  formattedStartTime: string,
  formattedEndTime: string
): string => {
  const userName = meetingData.userName || "User";
  let html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 300;">📅 Meeting Scheduled</h1>
        <p style="color: #e8e8e8; margin: 10px 0 0 0; font-size: 16px;">AI Assistant has arranged your meeting</p>
      </div>

      <!-- Meeting Details Card -->
      <div style="padding: 30px; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; margin-bottom: 20px;">
        <div style="background: #f8f9ff; border-left: 4px solid #667eea; padding: 25px; border-radius: 8px; margin-bottom: 25px;">

          <div style="display: flex; align-items: center; margin-bottom: 12px;">
            <span style="font-size: 18px; margin-right: 10px;">📅</span>
            <div>
              <strong style="color: #2c3e50;">Date & Time:</strong><br>
              <span style="color: #34495e; font-size: 16px;">${formattedStartTime} - ${formattedEndTime}</span>
            </div>
          </div>

          <div style="display: flex; align-items: center;">
            <span style="font-size: 18px; margin-right: 10px;">🌍</span>
            <div>
              <strong style="color: #2c3e50;">Timezone:</strong>
              <span style="color: #34495e;">${meetingData.timezone}</span>
            </div>
          </div>
        </div>
  `;

  if (meetingData.description) {
    html += `
        <!-- Additional Notes -->
        <div style="margin-bottom: 25px;">
          <h3 style="color: #2c3e50; font-size: 18px; margin-bottom: 10px; border-bottom: 2px solid #667eea; padding-bottom: 5px;">📝 ${userName}'s Note</h3>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 3px solid #28a745;">
            <p style="margin: 0; line-height: 1.6; color: #495057;">${meetingData.description.replace(/\n/g, "<br>")}</p>
          </div>
        </div>
    `;
  }

  html += `
        <!-- AI Summary -->
        <div style="margin-bottom: 25px;">
          <h3 style="color: #2c3e50; font-size: 18px; margin-bottom: 10px; border-bottom: 2px solid #667eea; padding-bottom: 5px;">Summary of Virtual Assistance Discussion</h3>
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px;">
            ${meetingData.summary
              .split("\n")
              .map((line) =>
                line.startsWith("•")
                  ? `<div style="display: flex; align-items: flex-start; margin-bottom: 8px;">
                       <span style="color: #856404; margin-right: 8px; font-weight: bold;">•</span>
                       <span style="color: #495057; line-height: 1.5;">${line.substring(1).trim()}</span>
                     </div>`
                  : `<div style="margin-bottom: 8px;">
                       <strong style="color: #856404; font-size: 16px;">${line}</strong>
                     </div>`
              )
              .join("")}
          </div>
        </div>
  `;

  if (meetingData.conversation) {
    html += `
        <!-- Conversation History -->
        <div style="margin-bottom: 25px;">
          <h3 style="color: #2c3e50; font-size: 18px; margin-bottom: 10px; border-bottom: 2px solid #667eea; padding-bottom: 5px;">💬 Conversation History</h3>
          <div style="background: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 13px; color: #495057; white-space: pre-wrap; max-height: 250px; overflow-y: auto; line-height: 1.4;">
            ${meetingData.conversation}
          </div>
        </div>
    `;
  }

  html += `
      </div>

      <!-- Footer -->
      <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 0 0 10px 10px; border-top: 1px solid #dee2e6;">
        <p style="margin: 0; color: #6c757d; font-size: 14px;">
          This meeting was scheduled by <strong>AI Voice Assistant</strong> based on your conversation.
        </p>
        <p style="margin: 10px 0 0 0; color: #adb5bd; font-size: 12px;">
          Powered by AI • Keep your calendar updated
        </p>
      </div>
    </div>
  `;

  return html;
};

// Format plain text meeting email content
const formatMeetingEmailText = (
  meetingData: MeetingRequest,
  formattedStartTime: string,
  formattedEndTime: string
): string => {
  const userName = meetingData.userName || "User";
  let text = `📅 MEETING SCHEDULED\n`;
  text += `====================\n\n`;

  text += `DATE & TIME: ${formattedStartTime} - ${formattedEndTime}\n`;
  text += `TIMEZONE: ${meetingData.timezone}\n\n`;

  if (meetingData.description) {
    text += `${userName}'s NOTE:\n${meetingData.description}\n\n`;
  }

  text += `SUMMARY OF VIRTUAL ASSISTANCE DISCUSSION:\n${meetingData.summary}\n\n`;

  if (meetingData.conversation) {
    text += `CONVERSATION HISTORY:\n${meetingData.conversation}\n\n`;
  }

  text += `---\nThis meeting was scheduled by AI Voice Assistant based on your conversation.\n`;
  text += `Powered by AI • Keep your calendar updated`;

  return text;
};

// Send meeting email with date/time details
export const sendMeetingEmail = async (
  meetingData: MeetingRequest
): Promise<{ messageId: string }> => {
  const transporter = createEmailTransporter();

  // Format date/time for display
  const startTime = new Date(meetingData.dateISO);
  const endTime = new Date(meetingData.endDateISO);

  const timeOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: meetingData.timezone,
  };

  const formattedStartTime = startTime.toLocaleString("en-US", timeOptions);
  const formattedEndTime = endTime.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: meetingData.timezone,
  });

  // Prepare recipients
  const recipients = Array.from(
    new Set([
      meetingData.userEmail,
      "mail.kunal71@gmail.com",
      ...meetingData.attendees,
    ])
  );

  // Create concise subject (truncate if too long)
  const maxSubjectLength = 50;
  const truncatedSummary =
    meetingData.summary.length > maxSubjectLength - 9 // Account for "Meeting: "
      ? `${meetingData.summary.substring(0, maxSubjectLength - 12)}...` // -9 for "Meeting: " and -3 for "..."
      : meetingData.summary;
  const subject = `Meeting: ${truncatedSummary}`;
  const htmlContent = formatMeetingEmailContent(
    meetingData,
    formattedStartTime,
    formattedEndTime
  );
  const textContent = formatMeetingEmailText(
    meetingData,
    formattedStartTime,
    formattedEndTime
  );

  const mailOptions = {
    from: config.EMAIL_USER || config.GMAIL_SENDER,
    to: recipients,
    subject,
    text: textContent,
    html: htmlContent,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    return { messageId: result.messageId };
  } catch (error) {
    console.error("Meeting email sending failed:", error);
    throw new Error("Failed to send meeting email");
  }
};

// Send contact form email
export const sendContactFormEmail = async (
  contactData: ContactFormRequest
): Promise<{ messageId: string }> => {
  const transporter = createEmailTransporter();

  // Format contact form email content
  const subject = `Portfolio Contact: ${contactData.subject}`;
  const htmlContent = formatContactFormContent(contactData);
  const textContent = formatContactFormText(contactData);

  const mailOptions = {
    from: config.EMAIL_USER || config.GMAIL_SENDER,
    to: ["mail.kunal71@gmail.com"], // Send to portfolio owner
    replyTo: contactData.email, // Allow replying to the sender
    subject,
    text: textContent,
    html: htmlContent,
  };

  try {
    console.log("Attempting to send email with config:", {
      from: config.EMAIL_USER || config.GMAIL_SENDER,
      to: ["mail.kunal71@gmail.com"],
      subject,
    });
    const result = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", result.messageId);
    return { messageId: result.messageId };
  } catch (error) {
    console.error("Contact form email sending failed:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      code: error instanceof Error && "code" in error ? error.code : "No code",
      stack: error instanceof Error ? error.stack : "No stack",
    });
    throw new Error(
      `Failed to send contact form email: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
};

// Format HTML content for contact form
const formatContactFormContent = (contactData: ContactFormRequest): string => {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 10px;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 300;">New Portfolio Contact</h1>
        <p style="color: #e8f8ff; margin: 10px 0 0 0; font-size: 16px;">Someone reached out through your portfolio</p>
      </div>

      <!-- Content -->
      <div style="padding: 30px;">
        <!-- Contact Details -->
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Contact Information</h2>
          <div style="display: table; width: 100%;">
            <div style="display: table-row;">
              <div style="display: table-cell; padding: 5px 0; font-weight: bold; width: 120px;">Name:</div>
              <div style="display: table-cell; padding: 5px 0;">${contactData.fullName}</div>
            </div>
            <div style="display: table-row;">
              <div style="display: table-cell; padding: 5px 0; font-weight: bold;">Email:</div>
              <div style="display: table-cell; padding: 5px 0;"><a href="mailto:${contactData.email}" style="color: #4facfe;">${contactData.email}</a></div>
            </div>
            ${
              contactData.company
                ? `
            <div style="display: table-row;">
              <div style="display: table-cell; padding: 5px 0; font-weight: bold;">Company:</div>
              <div style="display: table-cell; padding: 5px 0;">${contactData.company}</div>
            </div>
            `
                : ""
            }
          </div>
        </div>

        <!-- Message -->
        <div style="margin-bottom: 20px;">
          <h2 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Message</h2>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #4facfe;">
            <h3 style="color: #333; margin: 0 0 10px 0; font-size: 16px;">${contactData.subject}</h3>
            <div style="color: #555; line-height: 1.6; white-space: pre-wrap;">${contactData.message}</div>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px;">
          <p>This message was sent from your portfolio contact form.</p>
          <p>You can reply directly to this email to respond to ${contactData.fullName}.</p>
        </div>
      </div>
    </div>
  `;
};

// Format text content for contact form
const formatContactFormText = (contactData: ContactFormRequest): string => {
  return `
New Portfolio Contact

Contact Information:
Name: ${contactData.fullName}
Email: ${contactData.email}
${contactData.company ? `Company: ${contactData.company}` : ""}

Subject: ${contactData.subject}

Message:
${contactData.message}

---
This message was sent from your portfolio contact form.
You can reply directly to this email to respond to ${contactData.fullName}.
  `.trim();
};
