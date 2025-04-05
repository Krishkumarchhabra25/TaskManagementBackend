import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}
console.log('EMAIL_USER:', process.env.EMAIL_ADDRESS);
console.log('EMAIL_PASS:', process.env.PASS_PASS ? '✅ Loaded' : '❌ Missing');

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.PASS_PASS,
  },
});

// Verify connection on startup
transporter.verify((error) => {
  if (error) {
    console.error('Email transport verification failed:', error);
  } else {
    console.log('Email service ready');
  }
});

export const sendInvitationEmail = async (email: string, token: string): Promise<void> => {
  try {
    if (!process.env.EMAIL_ADDRESS || !process.env.PASS_PASS) {
      throw new Error('Email credentials not configured');
    }

    const invitationLink = `${process.env.CLIENT_URL}/accept-invite?token=${token}`;

    const mailOptions: EmailOptions = {
      to: email,
      subject: "You're invited to join our organization!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Organization Invitation</h2>
          <p>You've been invited to join our team on Task Management System.</p>
          <p>Click the button below to accept the invitation:</p>
          <a href="${invitationLink}" 
             style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">
            Accept Invitation
          </a>
          <p style="margin-top: 20px; color: #6b7280;">
            This link will expire in 72 hours. If you didn't request this, please ignore this email.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail({
      from: `"Task Management System" <${process.env.EMAIL_ADDRESS}>`,
      ...mailOptions
    });

    console.log(`[EMAIL] Invitation sent to ${email}`, info.messageId);
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send to ${email}:`, error);
    throw error; // Re-throw to handle in the invitation controller
  }
};