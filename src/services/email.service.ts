import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";
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
  console.log("=== Creating Email Transporter ===");

  // Try SendGrid SMTP first if API key is available (more reliable for cloud deployments)
  if (config.SENDGRID_API_KEY && config.SENDGRID_FROM_EMAIL) {
    console.log("Using SendGrid SMTP configuration");
    console.log("SendGrid SMTP settings:", {
      host: "smtp.sendgrid.net",
      port: 587,
      secure: false,
      user: "apikey",
    });

    return nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      secure: false,
      auth: {
        user: "apikey",
        pass: config.SENDGRID_API_KEY,
      },
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
    });
  }

  // Try SMTP authentication with Gmail (may be blocked on cloud platforms)
  if (config.EMAIL_USER && config.EMAIL_PASS) {
    console.log("Using SMTP configuration with Gmail");
    console.log("SMTP settings:", {
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      user: config.EMAIL_USER
        ? `${config.EMAIL_USER.substring(0, 3)}***`
        : "not set",
    });

    return nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: config.EMAIL_USER,
        pass: config.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 60000, // 60 seconds
      greetingTimeout: 30000, // 30 seconds
      socketTimeout: 60000, // 60 seconds
    });
  }

  // Fall back to OAuth2 if SMTP credentials are not available
  if (
    !config.GMAIL_SENDER ||
    !config.GOOGLE_CLIENT_ID ||
    !config.GOOGLE_CLIENT_SECRET ||
    !config.GOOGLE_REFRESH_TOKEN
  ) {
    console.log("Missing OAuth2 credentials, cannot create transporter");
    console.log("Available credentials:", {
      hasGmailSender: !!config.GMAIL_SENDER,
      hasGoogleClientId: !!config.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!config.GOOGLE_CLIENT_SECRET,
      hasGoogleRefreshToken: !!config.GOOGLE_REFRESH_TOKEN,
    });
    throw new Error(
      "Email credentials not configured. Please set either EMAIL_USER/EMAIL_PASS for SMTP or GMAIL_SENDER/GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REFRESH_TOKEN for OAuth2 in your environment variables."
    );
  }

  console.log("Using OAuth2 configuration with Gmail");
  console.log("OAuth2 settings:", {
    user: config.GMAIL_SENDER
      ? `${config.GMAIL_SENDER.substring(0, 3)}***`
      : "not set",
    hasClientId: !!config.GOOGLE_CLIENT_ID,
    hasClientSecret: !!config.GOOGLE_CLIENT_SECRET,
    hasRefreshToken: !!config.GOOGLE_REFRESH_TOKEN,
  });

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

// SendGrid email sending (more reliable for cloud deployments)
const sendEmailWithSendGrid = async (
  emailData: EmailPayload
): Promise<{ messageId: string }> => {
  if (!config.SENDGRID_API_KEY || !config.SENDGRID_FROM_EMAIL) {
    throw new Error("SendGrid credentials not configured");
  }

  console.log("=== Using SendGrid Email Service ===");
  sgMail.setApiKey(config.SENDGRID_API_KEY);

  const subject =
    emailData.subject || "Summary of Virtual Assistance Discussion";
  const htmlContent = formatEmailContent(emailData);
  const textContent = formatEmailText(emailData);

  const attachments = [];
  if (emailData.icsAttachment) {
    console.log("Adding ICS attachment to SendGrid email...");
    attachments.push({
      filename: "meeting.ics",
      content: emailData.icsAttachment,
      type: "text/calendar",
      disposition: "attachment",
    });
  }

  const msg = {
    to: emailData.to,
    from: {
      email: config.SENDGRID_FROM_EMAIL,
      name: "AI Assistant - Avinash Nayak",
    },
    replyTo: config.SENDGRID_FROM_EMAIL,
    subject,
    text: textContent,
    html: htmlContent,
    attachments,
    // Anti-spam headers
    headers: {
      "X-Priority": "3",
      "X-MSMail-Priority": "Normal",
      Importance: "Normal",
      "List-Unsubscribe": "<mailto:unsubscribe@avinashnayak.in>",
      "X-Mailer": "Smart Resume Assistant",
    },
    // Email categories for tracking
    categories: ["assistant-summary", "transactional"],
    // Custom args for tracking
    customArgs: {
      email_type: "assistant_summary",
      user_name: emailData.userName || "unknown",
    },
  };

  console.log("SendGrid message prepared:", {
    to: msg.to,
    from: msg.from,
    subject: msg.subject,
    attachmentsCount: attachments.length,
  });

  try {
    const response = await sgMail.sendMultiple(msg);
    console.log("SendGrid email sent successfully:", response[0].statusCode);
    return {
      messageId: response[0].headers["x-message-id"] || "sendgrid-success",
    };
  } catch (error) {
    console.error("SendGrid email failed:", error);
    throw error;
  }
};

// Send email with AI summary and conversation history
export const sendEmail = async (
  emailData: EmailPayload
): Promise<{ messageId: string }> => {
  console.log("=== Email Service Debug Start ===");
  console.log("Email data received:", {
    to: emailData.to,
    subject: emailData.subject,
    hasIcsAttachment: !!emailData.icsAttachment,
    userName: emailData.userName,
  });

  // Log environment configuration (without sensitive data)
  console.log("Environment config check:", {
    hasEmailUser: !!config.EMAIL_USER,
    hasEmailPass: !!config.EMAIL_PASS,
    hasGmailSender: !!config.GMAIL_SENDER,
    hasGoogleClientId: !!config.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!config.GOOGLE_CLIENT_SECRET,
    hasGoogleRefreshToken: !!config.GOOGLE_REFRESH_TOKEN,
    hasSendGridApiKey: !!config.SENDGRID_API_KEY,
    hasSendGridFromEmail: !!config.SENDGRID_FROM_EMAIL,
    nodeEnv: config.NODE_ENV,
  });

  // Try SendGrid first if available (more reliable for cloud deployments)
  if (config.SENDGRID_API_KEY && config.SENDGRID_FROM_EMAIL) {
    try {
      console.log("Attempting email via SendGrid...");
      const result = await sendEmailWithSendGrid(emailData);
      console.log("=== Email Service Debug End (SendGrid Success) ===");
      return result;
    } catch (sendGridError) {
      console.error("SendGrid failed, falling back to SMTP:", sendGridError);
    }
  } else {
    console.log("SendGrid not configured, using SMTP...");
  }

  try {
    console.log("Creating email transporter...");
    const transporter = createEmailTransporter();
    console.log("Transporter created successfully");

    // Verify transporter connection with timeout (skip in production due to cloud platform restrictions)
    if (config.NODE_ENV === "development") {
      console.log("Verifying SMTP connection (development mode only)...");
      const verifyPromise = transporter.verify();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Connection verification timeout after 30s")),
          30000
        )
      );

      try {
        await Promise.race([verifyPromise, timeoutPromise]);
        console.log("SMTP connection verified successfully");
      } catch (verifyError) {
        console.warn("SMTP verification failed in development:", verifyError);
        console.log("Proceeding without verification...");
      }
    } else {
      console.log(
        "Skipping SMTP verification in production (cloud platform may block verification)"
      );
    }

    // Format email content
    console.log("Formatting email content...");
    const subject =
      emailData.subject || "Summary of Virtual Assistance Discussion";
    const htmlContent = formatEmailContent(emailData);
    const textContent = formatEmailText(emailData);
    console.log("Email content formatted");

    // Prepare attachments
    const attachments = [];
    if (emailData.icsAttachment) {
      console.log("Adding ICS attachment...");
      attachments.push({
        filename: "meeting.ics",
        content: Buffer.from(emailData.icsAttachment, "base64"),
        contentType: "text/calendar",
      });
    }

    const mailOptions = {
      from:
        config.SENDGRID_FROM_EMAIL || config.EMAIL_USER || config.GMAIL_SENDER,
      to: emailData.to,
      subject,
      text: textContent,
      html: htmlContent,
      attachments,
    };

    console.log("Mail options prepared:", {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      attachmentsCount: attachments.length,
    });

    console.log("Sending email...");
    const result = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", result.messageId);
    console.log("=== Email Service Debug End (Success) ===");
    return { messageId: result.messageId };
  } catch (error) {
    console.error("=== Primary Email Sending Failed ===");
    const err = error as any;
    console.error("Error type:", err.constructor?.name || "Unknown");
    console.error("Error code:", err.code || "No code");
    console.error("Error message:", err.message || "No message");
    console.error("Error stack:", err.stack || "No stack");
    console.error(
      "Full error object:",
      JSON.stringify(err, Object.getOwnPropertyNames(err))
    );

    // If SMTP fails, try OAuth2 if available
    if (
      config.GMAIL_SENDER &&
      config.GOOGLE_CLIENT_ID &&
      config.GOOGLE_CLIENT_SECRET &&
      config.GOOGLE_REFRESH_TOKEN
    ) {
      console.log("=== Attempting OAuth2 Fallback ===");
      try {
        console.log("Creating OAuth2 transporter...");
        const oauth2Transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            type: "OAuth2",
            user: config.GMAIL_SENDER,
            clientId: config.GOOGLE_CLIENT_ID,
            clientSecret: config.GOOGLE_CLIENT_SECRET,
            refreshToken: config.GOOGLE_REFRESH_TOKEN,
          },
        });

        console.log("OAuth2 transporter created, verifying connection...");
        await oauth2Transporter.verify();
        console.log("OAuth2 connection verified successfully");

        const subject =
          emailData.subject || "Summary of Virtual Assistance Discussion";
        const htmlContent = formatEmailContent(emailData);
        const textContent = formatEmailText(emailData);

        const attachments = [];
        if (emailData.icsAttachment) {
          attachments.push({
            filename: "meeting.ics",
            content: Buffer.from(emailData.icsAttachment, "base64"),
            contentType: "text/calendar",
          });
        }

        const mailOptions = {
          from: config.GMAIL_SENDER,
          to: emailData.to,
          subject,
          text: textContent,
          html: htmlContent,
          attachments,
        };

        console.log("Sending email via OAuth2...");
        const result = await oauth2Transporter.sendMail(mailOptions);
        console.log("Email sent via OAuth2:", result.messageId);
        console.log("=== Email Service Debug End (OAuth2 Success) ===");
        return { messageId: result.messageId };
      } catch (oauth2Error) {
        console.error("=== OAuth2 Email Sending Also Failed ===");
        const oauthErr = oauth2Error as any;
        console.error(
          "OAuth2 Error type:",
          oauthErr.constructor?.name || "Unknown"
        );
        console.error("OAuth2 Error code:", oauthErr.code || "No code");
        console.error(
          "OAuth2 Error message:",
          oauthErr.message || "No message"
        );
        console.error(
          "OAuth2 Full error:",
          JSON.stringify(oauthErr, Object.getOwnPropertyNames(oauthErr))
        );
        console.log("=== Email Service Debug End (Total Failure) ===");
        throw new Error(
          `Failed to send email via both SMTP and OAuth2. SMTP Error: ${err.message}, OAuth2 Error: ${oauthErr.message}`
        );
      }
    } else {
      console.log("OAuth2 credentials not available, cannot attempt fallback");
      console.log("Available OAuth2 config:", {
        hasGmailSender: !!config.GMAIL_SENDER,
        hasGoogleClientId: !!config.GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!config.GOOGLE_CLIENT_SECRET,
        hasGoogleRefreshToken: !!config.GOOGLE_REFRESH_TOKEN,
      });
    }

    console.log("=== Email Service Debug End (Failure) ===");
    throw new Error(`Failed to send email: ${err.message}`);
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
          Generated by <strong>AI Voice Assistant</strong> from your conversation with Avinash Nayak.
        </p>
        <p style="margin: 10px 0; color: #adb5bd; font-size: 12px;">
          This is an automated summary of your discussion. No spam, just insights.
        </p>
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #dee2e6;">
          <p style="margin: 0; color: #adb5bd; font-size: 11px;">
            Avinash Nayak | AI Solutions Developer<br>
            📧 <a href="mailto:avizpvtltd@gmail.com" style="color: #0066cc; text-decoration: none;">avizpvtltd@gmail.com</a> | 
            🌐 <a href="https://avinashnayak.in" style="color: #0066cc; text-decoration: none;">avinashnayak.in</a>
          </p>
          <p style="margin: 10px 0 0 0; color: #adb5bd; font-size: 10px;">
            If you received this email by mistake, you can safely ignore it. 
            <a href="mailto:unsubscribe@avinashnayak.in" style="color: #0066cc; text-decoration: none;">Unsubscribe</a>
          </p>
        </div>
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

  text += `---\nGenerated by AI Voice Assistant from your conversation with Avinash Nayak.\n`;
  text += `This is an automated summary of your discussion. No spam, just insights.\n\n`;
  text += `Avinash Nayak | AI Solutions Developer\n`;
  text += `📧 avizpvtltd@gmail.com | 🌐 avinashnayak.in\n\n`;
  text += `If you received this email by mistake, you can safely ignore it.\n`;
  text += `To unsubscribe: unsubscribe@avinashnayak.in`;

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
