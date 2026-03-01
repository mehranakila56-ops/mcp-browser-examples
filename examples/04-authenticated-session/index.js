/**
 * Example 04: Authenticated Session
 * 
 * Demonstrates how to maintain a logged-in session across multiple
 * browser automation runs using AnchorBrowser's persistent sessions.
 * 
 * This example:
 * 1. Creates a browser session with stored cookies/auth
 * 2. Navigates to a protected page
 * 3. Performs an authenticated action
 * 4. The session state persists for future runs
 * 
 * Use cases:
 * - Automating GitHub actions without re-logging in
 * - Accessing enterprise dashboards that require SSO
 * - Maintaining Twitter/LinkedIn sessions for monitoring
 */

const puppeteer = require('puppeteer-core');

const ANCHOR_API_KEY = process.env.ANCHOR_API_KEY;
const SESSION_PROFILE = process.env.SESSION_PROFILE || 'github-automation';

if (!ANCHOR_API_KEY) {
  console.error('❌ ANCHOR_API_KEY environment variable is required');
  process.exit(1);
}

async function createOrReuseSession() {
  // Check if we have an existing persistent session
  const listRes = await fetch('https://api.anchorbrowser.io/v1/sessions', {
    headers: {
      'anchor-api-key': ANCHOR_API_KEY,
      'Content-Type': 'application/json',
    },
  });
  
  if (listRes.ok) {
    const sessions = await listRes.json();
    const existing = sessions.find(s => s.profile === SESSION_PROFILE && s.status === 'active');
    if (existing) {
      console.log(`♻️  Reusing existing session: ${existing.id}`);
      return existing.cdp_url;
    }
  }

  // Create a new session with a profile to persist cookies
  console.log(`🆕 Creating new session with profile: ${SESSION_PROFILE}`);
  const createRes = await fetch('https://api.anchorbrowser.io/v1/sessions', {
    method: 'POST',
    headers: {
      'anchor-api-key': ANCHOR_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      profile: {
        id: SESSION_PROFILE,
        persistent: true,  // Persist cookies and auth state
      },
      fingerprint: {
        screen: { width: 1920, height: 1080 },
      },
    }),
  });

  if (!createRes.ok) {
    const error = await createRes.text();
    throw new Error(`Failed to create session: ${error}`);
  }

  const session = await createRes.json();
  console.log(`✅ Session created: ${session.id}`);
  return session.cdp_url;
}

async function runAuthenticatedSession() {
  const cdpUrl = await createOrReuseSession();

  const browser = await puppeteer.connect({
    browserWSEndpoint: cdpUrl,
    defaultViewport: null,
  });

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  console.log('📂 Navigating to GitHub (should be logged in if session persists)...');
  await page.goto('https://github.com/notifications', {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });

  // Check if we're logged in
  const isLoggedIn = await page.evaluate(() => {
    // Check for user avatar or notification bell (only visible when logged in)
    return !!document.querySelector('[aria-label="View profile and more"]') ||
           !!document.querySelector('.Header-link[href="/notifications"]');
  });

  if (isLoggedIn) {
    console.log('✅ Already authenticated via persistent session!');
    
    // Get notification count as proof of authenticated access
    const notifCount = await page.evaluate(() => {
      const badge = document.querySelector('.notification-indicator .count');
      return badge ? badge.textContent.trim() : '0';
    });
    
    console.log(`🔔 Unread notifications: ${notifCount}`);

    // Take a screenshot as evidence
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({
      path: `authenticated-session-${timestamp}.png`,
      fullPage: false,
    });
    console.log(`📸 Screenshot saved: authenticated-session-${timestamp}.png`);
    
  } else {
    console.log('⚠️  Not logged in. You need to log in first via the live URL:');
    console.log('   https://live.anchorbrowser.io?profile=' + SESSION_PROFILE);
    console.log('   After logging in, run this script again to use the persisted session.');
  }

  await browser.disconnect();
}

runAuthenticatedSession().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
