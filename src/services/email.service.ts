import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import type { LoginMeta } from "../utils/getRequestInfo.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
const __dirname = dirname(fileURLToPath(import.meta.url));

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export const sendEmail = async (to: string, subject: string, html: string) => {
  await transporter.sendMail({
    from: `"Your App" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html,
  });
};

const sendVerificationEmail = async (
  to: string,
  url: string,
): Promise<void> => {
  const templatePath = path.join(__dirname, "../emails/emailVerification.html");
  let html = fs.readFileSync(templatePath, "utf-8");

  html = html.replace(/{{url}}/g, url);

  await sendEmail(to, "Verify Your Email Address", html);
};

const sendLoginAlertEmail = async (
  to: string,
  secureAccountUrl: string,
  loginMeta: LoginMeta,
): Promise<void> => {
  const templatePath = path.join(__dirname, "../emails/loginAlert.html");
  let html = fs.readFileSync(templatePath, "utf-8");

  html = html.replace(/{{device}}/g, loginMeta.device);
  html = html.replace(/{{browser}}/g, loginMeta.browser);
  html = html.replace(/{{location}}/g, loginMeta.location);
  html = html.replace(/{{time}}/g, loginMeta.time);
  html = html.replace(/{{ip}}/g, loginMeta.ip);
  html = html.replace(/{{secureAccountUrl}}/g, secureAccountUrl);

  await sendEmail(to, "New Login Detected", html);
};

const sendResetPasswordEmail = async (
  to: string,
  url: string,
): Promise<void> => {
  const templatePath = path.join(__dirname, "../emails/passwordReset.html");
  let html = fs.readFileSync(templatePath, "utf-8");

  const requestTime = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  html = html.replace(/{{url}}/g, url);
  html = html.replace(/{{expiry}}/g, "30 Minutes");
  html = html.replace(/{{requestTime}}/g, requestTime);

  await sendEmail(to, "Reset Your Password", html);
};
export default {
  sendVerificationEmail,
  sendLoginAlertEmail,
  sendResetPasswordEmail,
};
