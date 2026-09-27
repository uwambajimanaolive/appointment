const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const { Resend } = require('resend');

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);
const adminEmail = process.env.ADMIN_EMAIL || 'uwambajimanaolive77@gmail.com';
const resend = new Resend(process.env.RESEND_API_KEY);

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    next();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'form.html'));
});

app.get('/health', (req, res) => {
    res.json({ ok: true, adminEmail });
});

function buildEmailHtml(data) {
    return `
    <h3>New Appointment Request</h3>
    <p><strong>Full Name:</strong> ${data.fullname || ''}</p>
    <p><strong>National ID / Passport:</strong> ${data.nid || ''}</p>
    <p><strong>Phone Number:</strong> ${data.phone || ''}</p>
    <p><strong>Email Address:</strong> ${data.email || ''}</p>
    <p><strong>Department:</strong> ${data.department || ''}</p>
    <p><strong>Transfer Letter:</strong> ${data.referral || ''}</p>
    <p><strong>Preferred Date:</strong> ${data.app_date || ''}</p>
    <p><strong>Preferred Time Slot:</strong> ${data.app_time || ''}</p>
    <p><strong>Reason for Visit / Symptoms:</strong> ${data.notes || 'No additional notes'}</p>
  `;
}

app.post('/api/appointment', async (req, res) => {
    const data = req.body || {};
    const required = ['fullname', 'nid', 'phone', 'email', 'department', 'referral', 'app_date', 'app_time'];

    const missing = required.filter((field) => !String(data[field] || '').trim());

    if (missing.length) {
        return res.status(400).json({
            success: false,
            message: `Missing required fields: ${missing.join(', ')}`
        });
    }

    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) {
        return res.status(500).json({
            success: false,
            message: 'Resend API key and sender email are not configured. Set RESEND_API_KEY and RESEND_FROM in .env.'
        });
    }

    try {
        const result = await resend.emails.send({
            from: process.env.RESEND_FROM,
            to: adminEmail,
            reply_to: data.email,
            subject: `New Appointment Request - ${data.fullname}`,
            html: buildEmailHtml(data)
        });

        if (result && result.error) {
            throw new Error(result.error.message || 'Resend send failed');
        }

        return res.json({
            success: true,
            message: 'Appointment submitted successfully.'
        });
    } catch (error) {
        console.error('Email send failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to send appointment email. Check Resend API key and sender email.'
        });
    }
});

app.listen(port, () => {
    console.log(`Appointment server running at http://localhost:${port}`);
    console.log(`Admin email: ${adminEmail}`);
});

