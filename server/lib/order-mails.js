import path from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE_CONFIRMATION = path.resolve(__dirname, '../../suivis/src/assets/confirmation.html');
const TEMPLATE_IN_PROGRESS = path.resolve(__dirname, '../../suivis/src/assets/livraison.html');

const templateCache = new Map();

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function loadTemplate(filePath) {
  if (!templateCache.has(filePath)) {
    const html = await readFile(filePath, 'utf8');
    templateCache.set(filePath, html);
  }
  return templateCache.get(filePath);
}

function extractFirstName(fullName = '') {
  const name = String(fullName || '').trim();
  if (!name) return 'Client';
  return name.split(/\s+/)[0] || 'Client';
}

function buildTrackingLink(orderNumber) {
  const base = (process.env.SUIVIS_URL || 'https://suivis.broreps.fr').replace(/\/$/, '');
  return `${base}/?order=${encodeURIComponent(String(orderNumber || ''))}`;
}

function applyTemplateVars(html, vars) {
  return html
    .replaceAll('{ order.name }', String(vars.orderName || ''))
    .replaceAll('{ customer.first_name }', String(vars.firstName || 'Client'))
    // Existing templates already point to suivis.broreps.fr; replace with deep-link.
    .replaceAll('https://suivis.broreps.fr', String(vars.trackingLink || 'https://suivis.broreps.fr'));
}

async function sendMail({ to, subject, html }) {
  if (!to) return;
  const transporter = getTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"BroReps" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}

export async function sendOrderConfirmationEmail({ to, customerName, orderNumber }) {
  if (!to || !orderNumber) return;
  const raw = await loadTemplate(TEMPLATE_CONFIRMATION);
  const html = applyTemplateVars(raw, {
    orderName: orderNumber,
    firstName: extractFirstName(customerName),
    trackingLink: buildTrackingLink(orderNumber),
  });

  await sendMail({
    to,
    subject: `Commande ${orderNumber} confirmee - BroReps`,
    html,
  });
}

export async function sendOrderInProgressEmail({ to, customerName, orderNumber }) {
  if (!to || !orderNumber) return;
  const raw = await loadTemplate(TEMPLATE_IN_PROGRESS);
  const html = applyTemplateVars(raw, {
    orderName: orderNumber,
    firstName: extractFirstName(customerName),
    trackingLink: buildTrackingLink(orderNumber),
  });

  await sendMail({
    to,
    subject: `Commande ${orderNumber} en cours de livraison - BroReps`,
    html,
  });
}
