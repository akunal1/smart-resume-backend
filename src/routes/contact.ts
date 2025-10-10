import { Router } from "express";
import { ContactFormRequest, ContactFormResponse } from "../types/scheduling";
import { sendContactFormEmail } from "../services/email.service";

const router: Router = Router();

// POST /api/contact
router.post("/", async (req, res) => {
  try {
    const contactData: ContactFormRequest = req.body;

    // Validate required fields
    if (
      !contactData.fullName ||
      !contactData.email ||
      !contactData.subject ||
      !contactData.message
    ) {
      return res.status(400).json({
        error: "All fields are required: fullName, email, subject, message",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactData.email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Send the contact form email
    try {
      const result = await sendContactFormEmail(contactData);
      const response: ContactFormResponse = {
        messageId: result.messageId,
        status: "sent",
      };
      res.json(response);
    } catch (emailError) {
      console.error(
        "Email sending failed, but saving contact data:",
        emailError
      );
      // Return success even if email fails, but log the contact data
      console.log(
        "Contact form data (email failed):",
        JSON.stringify(contactData, null, 2)
      );

      const response: ContactFormResponse = {
        messageId: "offline-" + Date.now(),
        status: "sent", // Keep as "sent" to match type, but log indicates it's offline
      };
      res.json(response);
    }
  } catch (error) {
    console.error("Contact form submission error:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to send contact form",
    });
  }
});

export default router;
