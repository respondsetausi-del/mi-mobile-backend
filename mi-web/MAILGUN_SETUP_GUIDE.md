# 📧 Mailgun Email Setup Guide - MI Mobile Indicator

## 🎯 Overview
This guide will help you set up Mailgun (free tier) to send password reset emails and other transactional emails.

---

## 📋 Step-by-Step Setup

### 1️⃣ Create Mailgun Account

1. Go to https://www.mailgun.com/
2. Click "Sign Up" (completely free to start)
3. Verify your email address
4. Complete account registration

**Free Tier Benefits:**
- ✅ 100 emails per day (sufficient for small-medium apps)
- ✅ No credit card required
- ✅ Sandbox domain provided instantly
- ✅ 5 verified recipient addresses

---

### 2️⃣ Get Your API Credentials

After logging into Mailgun dashboard:

1. **Find Your API Key:**
   - Go to **Settings** → **API Keys**
   - Copy your **Private API Key**
   - Example: `key-1234567890abcdef1234567890abcdef`

2. **Find Your Sandbox Domain:**
   - Go to **Sending** → **Domains**
   - You'll see a sandbox domain like: `sandbox1234567890abcdef.mailgun.org`
   - Copy this domain name

---

### 3️⃣ Verify Email Recipients (Free Tier Only)

Since the free tier only sends to verified addresses:

1. Go to **Sending** → **Authorized Recipients**
2. Click **Add Recipient**
3. Enter email addresses you want to send to:
   - `respondscooby@gmail.com` ✅
   - Add up to 5 email addresses
4. Each recipient will receive a verification email
5. They must click the verification link

---

### 4️⃣ Configure Your Application

Update `/app/backend/.env` file:

```env
# Replace these placeholders with your actual Mailgun credentials
MAILGUN_API_KEY=key-1234567890abcdef1234567890abcdef
MAILGUN_DOMAIN=sandbox1234567890abcdef.mailgun.org
```

**Important:** Remove "your_mailgun_api_key_here" and replace with real values!

---

### 5️⃣ Restart Backend Service

```bash
sudo supervisorctl restart backend
```

Check logs to confirm:
```bash
tail -f /var/log/supervisor/backend.err.log
```

You should see: `Email service enabled using: mailgun`

---

### 6️⃣ Test Password Reset

**Test with verified email:**

```bash
curl -X POST http://localhost:8001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "respondscooby@gmail.com"}'
```

Check your email inbox - you should receive the password reset email!

---

## 🚀 Upgrade to Paid Plan (Optional)

If you need to send to unlimited recipients:

1. Go to **Billing** in Mailgun dashboard
2. Add payment method
3. Upgrade to **Foundation Plan** ($15/month)
4. Add your custom domain for professional emails

**Paid Plan Benefits:**
- Send to unlimited recipients
- No verification required
- Custom domain (e.g., `noreply@yourdomain.com`)
- 50,000 emails/month
- Better deliverability

---

## 📧 Email Examples

### Password Reset Email
```
Subject: 🔒 Your MI Mobile Indicator Password Has Been Reset
From: MI Mobile Indicator <postmaster@sandbox...mailgun.org>
To: respondscooby@gmail.com

Content: Professional HTML template with temporary password
```

### User Approval Email
```
Subject: ✅ Your Signal Master Account is Approved!
From: MI Mobile Indicator <postmaster@sandbox...mailgun.org>
To: user@example.com

Content: Welcome message with next steps
```

---

## 🔧 Troubleshooting

### Issue: Emails not sending

**Check 1: API Key configured?**
```bash
grep MAILGUN /app/backend/.env
```

**Check 2: Backend logs**
```bash
tail -f /var/log/supervisor/backend.err.log | grep -i mailgun
```

**Check 3: Email verified?**
- Free tier only sends to verified addresses
- Check Mailgun dashboard → Authorized Recipients

### Issue: 401 Unauthorized

- API key is incorrect
- Double-check you copied the **Private API Key**
- Make sure no extra spaces in .env file

### Issue: 404 Not Found

- Domain is incorrect
- Check Mailgun dashboard → Domains
- Copy the exact sandbox domain

---

## 📊 Current Configuration

**File: `/app/backend/.env`**
```env
MAILGUN_API_KEY=your_mailgun_api_key_here
MAILGUN_DOMAIN=your_sandbox_domain_here
```

**File: `/app/backend/email_service.py`**
- ✅ Supports both SendGrid and Mailgun
- ✅ Automatic fallback to console logging if not configured
- ✅ Professional HTML email templates
- ✅ Error handling and logging

---

## ✅ Verification Checklist

- [ ] Mailgun account created
- [ ] API key copied from dashboard
- [ ] Sandbox domain copied from dashboard
- [ ] Recipient email verified (respondscooby@gmail.com)
- [ ] `.env` file updated with real credentials
- [ ] Backend service restarted
- [ ] Test email sent successfully

---

## 🆘 Need Help?

**Mailgun Documentation:**
- https://documentation.mailgun.com/docs/mailgun/quickstart/
- https://www.mailgun.com/blog/it-and-engineering/send-email-using-python/

**Application Status:**
- Email service is configured and ready
- Just needs valid API credentials
- Test endpoint available at `/api/auth/forgot-password`

---

## 🎉 Quick Start Summary

```bash
# 1. Sign up at mailgun.com
# 2. Get API key and sandbox domain
# 3. Verify respondscooby@gmail.com
# 4. Update .env file:

MAILGUN_API_KEY=key-xxxxxxxxxxxxx
MAILGUN_DOMAIN=sandboxxxxxxxxxxx.mailgun.org

# 5. Restart backend
sudo supervisorctl restart backend

# 6. Test
curl -X POST http://localhost:8001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "respondscooby@gmail.com"}'

# 7. Check email!
```

---

**That's it! Your email system will be fully operational once you add the Mailgun credentials.**
