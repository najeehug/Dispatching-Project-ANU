// Notifications via Resend (free — 3,000 emails/month)
// Falls back to console.log in dev if RESEND_API_KEY not set
const prisma   = require('../lib/db');
const APP_URL  = process.env.APP_BASE_URL || 'http://localhost:5173';
const FROM     = process.env.FROM_EMAIL   || 'onboarding@resend.dev';

let resend = null;
if (process.env.RESEND_API_KEY) {
  try {
    const { Resend } = require('resend');
    resend = new Resend(process.env.RESEND_API_KEY);
  } catch (e) {
    console.log('[Notifications] Resend not available');
  }
}

async function sendEmail({ to, subject, html, packageId, userId, type }) {
  let delivered  = false;
  let externalId = null;

  if (resend && to) {
    try {
      const { data } = await resend.emails.send({ from: FROM, to, subject, html });
      externalId = data?.id || null;
      delivered  = true;
    } catch (err) {
      console.error('[Resend error]', err.message);
    }
  } else {
    console.log(`\n[NOTIFICATION — no Resend key]\nTo: ${to}\nSubject: ${subject}\n`);
  }

  if (userId) {
    await prisma.notification.create({
      data: {
        userId,
        packageId: packageId || null,
        type,
        channel:   'email',
        message:   subject,
        delivered,
        externalId,
      },
    }).catch(() => {});
  }
}

// ── 1. Pin request ──────────────────────────────────────────────────────────
async function sendPinRequest(pkg) {
  const customer = pkg.customer
    || await prisma.user.findUnique({ where: { id: pkg.customerId } });

  const pinUrl = `${APP_URL}/pin/${pkg.id}`;

  await sendEmail({
    to:        customer.email,
    subject:   `Action needed: Set your delivery location for ${pkg.trackingNumber}`,
    html: `
      <p>Hi ${customer.name},</p>
      <p>Your package <strong>${pkg.trackingNumber}</strong> has arrived at the port in Antigua.</p>
      <p>Since addresses can be hard to find here, please drop a pin for your exact delivery location:</p>
      <p><a href="${pinUrl}" style="background:#059669;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Set delivery location</a></p>
      <p>Your package will be assigned to a driver once your pin is set.</p>
      <p>— FastCargo 268</p>
    `,
    packageId: pkg.id,
    userId:    customer.id,
    type:      'PIN_REQUEST',
  });

  await prisma.package.update({
    where: { id: pkg.id },
    data:  { status: 'PIN_REQUESTED' },
  }).catch(() => {});
}

// ── 2. Customs cleared ──────────────────────────────────────────────────────
async function sendCustomsClearedNotification(pkg) {
  const customer = await prisma.user.findUnique({ where: { id: pkg.customerId } });

  await sendEmail({
    to:      customer.email,
    subject: `Your package ${pkg.trackingNumber} has cleared customs!`,
    html: `
      <p>Hi ${customer.name},</p>
      <p>Great news — your package <strong>${pkg.trackingNumber}</strong> has cleared customs.</p>
      <p>A driver will be assigned shortly. Track your delivery here:</p>
      <p><a href="${APP_URL}/track/${pkg.trackingNumber}">Track my package</a></p>
      <p>— FastCargo 268</p>
    `,
    packageId: pkg.id,
    userId:    customer.id,
    type:      'CUSTOMS_CLEARED',
  });
}

// ── 3. Driver assigned ──────────────────────────────────────────────────────
async function sendDriverAssignment(pkg, driver) {
  const pinUrl = `https://www.google.com/maps?q=${pkg.pinLatitude},${pkg.pinLongitude}`;

  await sendEmail({
    to:      driver.email,
    subject: `New delivery: ${pkg.trackingNumber}`,
    html: `
      <p>Hi ${driver.name},</p>
      <p>You have a new delivery assigned:</p>
      <ul>
        <li><strong>Tracking:</strong> ${pkg.trackingNumber}</li>
        <li><strong>Pin location:</strong> <a href="${pinUrl}">Open in Google Maps</a></li>
        ${pkg.deliveryNotes ? `<li><strong>Notes:</strong> ${pkg.deliveryNotes}</li>` : ''}
      </ul>
      <p>— FastCargo 268 Dispatch</p>
    `,
    packageId: pkg.id,
    userId:    driver.id,
    type:      'DRIVER_ASSIGNED',
  });
}

// ── 4. Delivered ────────────────────────────────────────────────────────────
async function sendDeliveryConfirmation(pkg) {
  const customer = await prisma.user.findUnique({ where: { id: pkg.customerId } });

  await sendEmail({
    to:      customer.email,
    subject: `Your package ${pkg.trackingNumber} has been delivered!`,
    html: `
      <p>Hi ${customer.name},</p>
      <p>Your package <strong>${pkg.trackingNumber}</strong> has been delivered.</p>
      <p>Thank you for using FastCargo 268.</p>
      <p>— FastCargo 268</p>
    `,
    packageId: pkg.id,
    userId:    customer.id,
    type:      'DELIVERED',
  });
}

module.exports = {
  sendPinRequest,
  sendCustomsClearedNotification,
  sendDriverAssignment,
  sendDeliveryConfirmation,
};
