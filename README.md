# Bookmarks

A personal bookmark manager. Save a link (or a PDF/image), and AI writes the
title, a short summary, and a set of topic tags for you automatically. Browse,
search, and filter everything you've saved from the web app, a Chrome
extension, or an installed Android app.

**Live app:** https://bookmarks-featherlight.vercel.app

---

## What it does

- **Save anything with a URL** — articles, YouTube videos, Reddit/X posts,
  or any other web page. Paste the link and click **Analyze**; AI reads the
  page and fills in a title, a 2-sentence summary, and 2–5 topic tags.
- **Save files too** — upload a PDF or an image (JPG/PNG/WebP) instead of a
  URL, and AI reads/describes it the same way.
- **Edit anything AI gets wrong** — every field (title, summary, topics) is a
  normal text box you can overwrite before saving, and you can edit a
  bookmark again later.
- **Search and filter** — a keyword search box (matches title + summary) and
  a topic filter list, so you can narrow down a large collection fast.
- **Works without AI, too** — if you haven't set up an AI key (see below),
  you can still save a bookmark and fill in the title/summary/topics by
  hand.
- **Share sheet on Android** — once installed, "Bookmarks" shows up as a
  target in Android's native Share menu from any app (browser, Reddit,
  YouTube, etc.), so you can save a link without switching apps.
- **Light/dark mode** — toggle in Settings; remembered per device.
- **Private per account** — every account only ever sees its own bookmarks.
  There's no shared or public data between users.

## Limits

- **300 bookmarks per account.** This is a hard cap tied to the free-tier
  database plan the app runs on. If you hit it, delete something old to make
  room. (There's no paid tier to upgrade to — this is a small personal
  project, not a commercial product.)
- **You bring your own AI key.** There is no shared/free AI access baked
  into the app. AI tagging is a bring-your-own-API-key feature — see
  "Setting up AI tagging" below. Without a key, saving still works, just
  without the automatic title/summary/topics.
- **The Chrome extension is Chrome/Chromium-only** (Chrome, Edge, Brave,
  etc. — anything that supports Chrome extensions). It is not published to
  the Chrome Web Store; it's installed manually as an "unpacked" extension
  (see below).
- **The installable app is Android-only.** There's no iOS app and no
  Windows/Mac desktop app — those platforms don't support installing a site
  this way in the same one-tap manner. On any device, though, the site works
  fine simply opened in a normal browser tab, without installing anything.
- **PDF analysis isn't available with an OpenAI key.** If you choose OpenAI
  as your AI provider, image analysis works but PDF analysis does not (a
  known limitation of OpenAI's API, not a bug). Use Gemini or Anthropic
  (Claude) as your provider if you plan to save PDFs.
- **Some sites block automated fetching** (notably X/Twitter). If AI
  analysis fails on a post like this, the app will ask you to paste the
  post's text in manually instead.

## Getting an account

1. Go to https://bookmarks-featherlight.vercel.app
2. Click **Sign up**, enter an email and password.
3. Check your email for a confirmation link and click it.
4. Log in.

## Setting up AI tagging (optional but recommended)

AI tagging needs an API key from one of three providers. You only need one.
Free tiers exist for all three and are generally more than enough for
personal bookmark tagging.

1. Get an API key from whichever provider you prefer:
   - **Google Gemini** — https://aistudio.google.com/apikey
   - **Anthropic (Claude)** — https://console.anthropic.com/settings/keys
   - **OpenAI** — https://platform.openai.com/api-keys
2. In the app, go to **Settings** (top right / bottom of the page).
3. Choose your provider from the dropdown, paste in the key, click **Save**.

Your key is encrypted and stored securely server-side (Supabase Vault) — it
is never stored in plain text and never shown back to you after saving. You
can remove it any time from the same Settings page, which turns AI tagging
back off.

## Installing the Android app

This turns the site into a full-screen app icon on your home screen (no
browser address bar), and adds it as a Share target in Android.

1. Open https://bookmarks-featherlight.vercel.app in Chrome on your Android
   phone and log in.
2. Tap the **⋮** menu → **Add to Home screen** / **Install app**.
3. If you'd previously added a shortcut for this site, uninstall it first,
   then reinstall — Android caches some install info the first time, so a
   stale shortcut can prevent the Share option from showing up.
4. Once installed, open any app with a link (browser, YouTube, Reddit,
   etc.), use its **Share** button, and you'll see **Bookmarks** in the
   share sheet. Tapping it pre-fills the URL, ready to save.

## Installing the Chrome extension

The extension lets you save the page you're currently on with one click,
without leaving your browser tab.

1. Download/clone this repository to your computer.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top right toggle).
4. Click **Load unpacked** and select the `chrome-extension` folder from
   this repository.
5. Pin the extension (puzzle-piece icon in the toolbar → pin "Add
   Bookmark") so it's always one click away.
6. Click the extension icon, log in with your account email/password once
   — it stays logged in after that.

To use it: browse to any page, click the extension icon, click **Analyze**
to auto-fill title/summary/topics (or fill them in yourself), then **Add
bookmark**.

## Using the web app day to day

- **Add a bookmark:** click **Add bookmark**, paste a URL or switch to the
  "File" tab to upload a PDF/image, click **Analyze**, review/edit the
  fields, then save.
- **Find something later:** use the search box (matches title and summary)
  or click a topic in the sidebar to filter down to just that topic.
- **Fix or update a bookmark:** click a bookmark card's edit button, change
  any field, save.
- **Remove a bookmark:** click a bookmark card's delete button (asks for
  confirmation first).
- **Switch light/dark mode or manage your AI key:** go to **Settings**.
- **Sign out:** bottom of the Settings page.

## Privacy

- Each account's bookmarks, AI key, and settings are private to that
  account — there is no sharing or discovery between users built into the
  app.
- Your AI key is used only to call your chosen provider's API when you
  analyze a bookmark; it is not used for anything else and is never
  displayed back to you once saved.
- This is a small personal project run on free-tier infrastructure
  (Vercel + Supabase), not a company or commercial product — treat it
  accordingly (don't store anything highly sensitive in it).
