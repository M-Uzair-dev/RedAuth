import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import type { LoginMeta } from "../utils/getRequestInfo.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
const __dirname = dirname(fileURLToPath(import.meta.url));
import { emailQueue, type EmailData } from "../queues/email.queue.js";

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export const addEmailJob = async (data: EmailData) => {
  await emailQueue.add("send-email", data, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  });
};

export const sendEmail = async (to: string, subject: string, html: string) => {
  console.log("Sending email...");
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
  tokenId: string,
): Promise<void> => {
  const templatePath = path.join(__dirname, "../emails/emailVerification.html");
  let html = fs.readFileSync(templatePath, "utf-8");

  html = html.replace(/{{url}}/g, url);
  console.log("Adding email job to send email to : ", to);
  await addEmailJob({
    to,
    subject: "Verify Your Email Address",
    html,
    tokenId,
  });
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

  await addEmailJob({ to, subject: "New Login Detected", html, tokenId: "" });
};

const sendResetPasswordEmail = async (
  to: string,
  url: string,
  tokenId: string,
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

  await addEmailJob({ to, subject: "Reset Your Password", html, tokenId });
};
export default {
  sendVerificationEmail,
  sendLoginAlertEmail,
  sendResetPasswordEmail,
  sendEmail,
};
