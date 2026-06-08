# 🎮 Ragay Dota Hub — Setup Guide

> **For non-IT users** — no coding needed. Just follow the steps one by one.

---

## ✅ What's Already Done (Don't Touch These)

Everything below is already set up for you:

| Item | Status |
|---|---|
| Google Apps Script (backend) | ✅ Live |
| Google Sheet (database) | ✅ Connected |
| Website code | ✅ Complete |
| Admin login system | ✅ Working |

---

## 🌐 How to Publish the Website (One Time Only)

### Step 1 — Update the Google Apps Script

The `Code.gs` file has been updated with your Sheet ID and secret key. You need to paste it into your Apps Script project.

1. Open your Apps Script project:
   👉 [script.google.com](https://script.google.com) → open your existing project
2. Select **all the code** in the editor (Ctrl+A) and **delete it**
3. Open the `Code.gs` file from your `Dotes` folder on your computer
4. Copy everything and paste it into the Apps Script editor
5. Click the **Save** button (floppy disk icon 💾)
6. Click **Deploy → Manage Deployments**
7. Click the **pencil (edit) icon** on your existing deployment
8. Change **Version** to **"New version"**
9. Click **Deploy**
10. Done — your backend is updated ✅

---

### Step 2 — Upload the Website to GitHub

1. Go to **[github.com](https://github.com)** — sign up for free if you don't have an account yet
2. Click the green **"New"** button (top left) to create a new repository
3. Name it: `ragay-dota-hub`
4. Leave everything else as default → click **"Create repository"**
5. On the next page, click **"uploading an existing file"**
6. Drag and drop these files from your `Dotes` folder:
   - `index.html`
   - `styles.css`
   - `auth.css`
   - `app.js`
   - `auth.js`
   - `vercel.json`
7. Scroll down and click **"Commit changes"**

---

### Step 3 — Host the Website on Vercel (Free)

1. Go to **[vercel.com](https://vercel.com)**
2. Click **"Sign Up"** → choose **"Continue with GitHub"**
3. After logging in, click **"Add New Project"**
4. Find `ragay-dota-hub` in the list → click **"Import"**
5. Don't change any settings → just click **"Deploy"**
6. Wait about 1 minute...
7. **Your website is live!** You'll get a free link like:
   `https://ragay-dota-hub.vercel.app`

> 💡 **Tip:** Every time you upload new files to GitHub, Vercel automatically updates your live website.

---

## 🔐 How to Log In as Admin

Open your website → click **"Admin Login"** on the right side of the menu bar.

| Field | Enter This |
|---|---|
| Username | `superadmin` |
| Password | `Admin@Ragay2026` |

> ⚠️ **Change your password** after your first login!
> Go to: Admin Panel → Settings → Change My Password

---

## 👑 Admin Roles — Who Can Do What

| Role | What They Can Do |
|---|---|
| **Super Admin** (you) | Everything — players, teams, tournaments, brackets, AND manage other admin accounts |
| **Tournament Organizer** | Create and edit tournaments and brackets only |
| **Team Builder** | Create and manage teams and rosters only |
| **Moderator** | Edit players and teams (cannot delete anything) |

---

## ➕ How to Add a New Admin Account

1. Log in as Super Admin
2. Click your name in the top menu → click **"Admin Panel"**
3. Click the **"Admins"** tab
4. Click the **"Add Admin"** button
5. Fill in the form:
   - **Username** — what they'll type to log in (no spaces, e.g. `rico_admin`)
   - **Display Name** — their real name (e.g. `Rico Santos`)
   - **Password** — a password for them (at least 8 characters)
   - **Role** — choose Tournament Organizer, Team Builder, or Moderator
6. Click **"Create Admin Account"**
7. Give them their username and password

---

## 🏆 How to Create a Tournament

1. Log in as Super Admin or Tournament Organizer
2. Go to **Admin Panel** → click the **"Tournaments"** tab
3. Click **"New Tournament"**
4. Fill in:
   - **Name** (e.g. `Ragay Cup 2026`)
   - **Format** (Single Elimination, Double Elimination, etc.)
   - **Max Teams** (4, 8, 16, or 32)
   - **Prize** (e.g. `₱5,000`)
   - **Start Date** and **End Date**
   - **Description** (optional — rules, venue, etc.)
5. Click **"Create Tournament"**
6. It will appear in the Tournaments section of the website immediately ✅

---

## 🗂️ How to Set Up a Bracket

1. Log in as admin
2. Scroll to the **Brackets** section of the website
3. Select your tournament from the dropdown
4. **Drag and drop** teams from the pool into the bracket slots
5. It saves automatically — everyone sees the same bracket live ✅

---

## 📊 How to View Your Data (Google Sheet)

All website data is stored in your Google Sheet. You can view or edit it directly there.

👉 **[Click here to open your Google Sheet](https://docs.google.com/spreadsheets/d/1VEcOA2EVA3GsCZ3a8eDSOygNAKFt_fKVAuLUAmif5Lg)**

| Tab Name | What's Inside |
|---|---|
| **Players** | All registered players |
| **Teams** | All teams |
| **Tournaments** | All tournaments |
| **Brackets** | Bracket data |
| **Admins** | Admin accounts (auto-filled when you add admins) |
| **Settings** | Website settings |

> 💡 **Tip:** You can add a tournament directly in the Google Sheet by typing data into the correct columns — no need to use the Admin Panel.

---

## ❓ Common Questions

**Q: The website shows demo data, not real data. Why?**
A: That's normal when the Google Sheet is empty or the Apps Script isn't updated yet. Register a player or add a tournament and it will show real data. The demo data is just a placeholder so the design looks good.

**Q: Someone forgot their admin password. What do I do?**
A: Open your Google Sheet → go to the **Admins** tab → delete their row → go back to the Admin Panel and create their account again with a new password.

**Q: Can I change the website's colors or text?**
A: Yes — edit the `styles.css` file for colors, or `index.html` for text. If you're not sure how, just tell Kiro what you want to change and it will do it for you.

**Q: Is hosting on Vercel really free?**
A: Yes. GitHub, Vercel, and Google Sheets are all free for this type of project with no limits you'll hit.

**Q: What if I want to update the website after it's live?**
A: Just edit the files on your computer, then re-upload them to GitHub. Vercel will automatically update the live site within 1 minute.

---

## 📌 Quick Reference Card

| Item | Details |
|---|---|
| 🌐 Live website | Your Vercel link (after deploying) |
| 📊 Google Sheet | [Open Sheet](https://docs.google.com/spreadsheets/d/1VEcOA2EVA3GsCZ3a8eDSOygNAKFt_fKVAuLUAmif5Lg) |
| ⚙️ Apps Script | [Open Script](https://script.google.com/macros/s/AKfycbz6lu8QXuoDEU3y0CW1cll2XaySLnSkyTWogL-TrTPXZCjkSJgguALSEqLljuH7BvjB/exec) |
| 👤 Super Admin username | `superadmin` |
| 🔑 Default password | `Admin@Ragay2026` |
| 🗝️ Secret key | `dotes2026` |

---

*Built for the Ragay Dota community · Powered by Google Sheets & Vercel · Free hosting*
