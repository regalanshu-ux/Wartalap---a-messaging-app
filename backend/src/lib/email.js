import nodemailer from "nodemailer";

export const sendOtpEmail = async (email, otp) => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const emailFrom = process.env.EMAIL_FROM || '"वार्तालाप Support" <no-reply@wartalap.com>';

  const isSmtpConfigured = smtpHost && smtpPort && smtpUser && smtpPass;

  if (!isSmtpConfigured) {
    console.log("\n==================================================");
    console.log("               OTP EMAIL VERIFICATION             ");
    console.log("==================================================");
    console.log(` To:      ${email}`);
    console.log(` Code:    ${otp}`);
    console.log("--------------------------------------------------");
    console.log(" [Notice] SMTP configuration not detected in .env.");
    console.log(" Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS");
    console.log(" to send actual emails.");
    console.log("==================================================\n");
    return true;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort) || 587,
      secure: smtpPort === "465",
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const mailOptions = {
      from: emailFrom,
      to: email,
      subject: `${otp} is your वार्तालाप verification code`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="display: inline-block; width: 50px; height: 50px; border-radius: 12px; background-color: #4f46e5; text-align: center; line-height: 50px; font-size: 24px; color: #ffffff; font-weight: bold;">वा</div>
            <h2 style="color: #1f2937; margin-top: 15px; font-size: 22px;">Confirm Your Email Address</h2>
          </div>
          <p style="font-size: 15px; color: #4b5563; line-height: 1.6; text-align: center;">Thank you for joining वार्तालाप! Use the 6-digit one-time password (OTP) below to verify your email. This code is valid for 10 minutes:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #4f46e5; letter-spacing: 6px; padding: 12px 30px; background-color: #f3f4f6; border-radius: 10px; border: 2px dashed #4f46e5; display: inline-block;">${otp}</span>
          </div>
          <p style="font-size: 13px; color: #9ca3af; text-align: center; margin-top: 35px; border-top: 1px solid #f3f4f6; padding-top: 15px;">If you did not initiate this request, you can safely ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] OTP verification email sent successfully to: ${email}`);
    return true;
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send OTP to ${email}:`, error);
    throw error;
  }
};
