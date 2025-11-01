# FreeInvoice.info Enhancement Plan - Freemium Edition

## 💎 Business Model

### FREE TIER (Unlimited, Local-Only)
- ✅ **Unlimited invoice generation** - No limits on creating invoices
- ✅ **Unlimited logo uploads** - Add your branding for free
- ✅ **Client-side PDF export** - Download using html2pdf.js
- ✅ **2-3 basic templates** - Professional invoice designs
- ✅ **IndexedDB storage** - Local browser storage, no account needed
- ✅ **Dark mode & multilingual** - Full UI features
- ❌ **No cloud sync** - Data stays on your device only
- ❌ **No premium templates** - Limited to basic designs
- ❌ **No email sending** - Cannot email invoices directly
- ❌ **No advanced features** - No recurring invoices, reports, etc.

### PREMIUM TIER ($5-10/month)
- ✅ **Cloud backup & multi-device sync** - Access invoices anywhere
- ✅ **Server-side PDF generation** - Higher quality, better fonts
- ✅ **Premium template marketplace** - 10+ professional designs
- ✅ **Unlimited email sending** - Send invoices directly to clients
- ✅ **Advanced features** - Recurring invoices, payment tracking, financial reports
- ✅ **Priority support** - Faster response times
- ✅ **All free tier features** - Plus unlimited cloud storage

---

## 🎉 Phase 1: Core UI/UX ✅ COMPLETE

**Status:** ✅ Implemented and Tested (November 2025)

### What's Been Implemented

**Mobile Responsiveness**
- Responsive grid layout with breakpoints (desktop/tablet/mobile)
- Mobile-first "Show Preview" floating button
- Full-screen preview modal on mobile devices
- Optimized touch targets and spacing

**Dark Mode**
- Complete theme system with CSS variables
- Theme toggle with localStorage persistence
- System preference detection (`prefers-color-scheme`)
- Smooth 0.2s transitions between themes
- Professional gradient backgrounds and glassmorphism effects

**Multilingual Support**
- English and Bengali (বাংলা) translations
- svelte-i18n integration
- Language selector in header
- All UI strings internationalized

**Professional Header**
- Sticky header with branding
- Navigation links (Home, Saved Invoices)
- Language selector and theme toggle
- Responsive design

**Files Created:**
- `src/lib/theme.js` - Theme store with localStorage
- `src/lib/i18n/setup.js` - i18n configuration
- `src/lib/i18n/en.json` - English translations
- `src/lib/i18n/bn.json` - Bengali translations
- `src/components/ThemeToggle.svelte` - Theme switcher
- `src/components/LanguageSelector.svelte` - Language dropdown
- `src/components/Header.svelte` - Application header
- `src/routes/+layout.js` - Disable SSR for client-only app

**Files Modified:**
- `src/app.css` - Added theme CSS variables
- `src/routes/+layout.svelte` - Header integration and i18n init
- `src/routes/+page.svelte` - Responsive layout and i18n

**Test Results:**
- ✅ Desktop (1440x900): Perfect 2-column layout
- ✅ Tablet (768x1024): Optimized 2fr-3fr ratio
- ✅ Mobile (375x667): Single column with preview toggle
- ✅ Theme switching: Works flawlessly
- ✅ Language switching: English/Bengali confirmed

---

## 🔐 Phase 2: Authentication System (1-2 weeks)

### Goal
Add optional magic link authentication for premium users. Free users can continue using the app WITHOUT logging in.

### Magic Link Authentication

**Why Magic Links?**
- Passwordless = better UX
- No password management
- More secure (time-limited tokens)
- Email verification built-in

**Authentication Flow:**
1. User clicks "Sign In" button
2. Enters email address
3. Receives email with magic link
4. Clicks link → auto-login with session token
5. Session stored in localStorage + Cloudflare KV

**UI Components to Create:**

1. **AuthModal.svelte** - Email input for magic link
   ```svelte
   <script>
     let email = $state('');
     let loading = $state(false);
     let sent = $state(false);
   </script>

   <dialog>
     {#if !sent}
       <input type="email" bind:value={email} placeholder="Enter your email" />
       <button onclick={sendMagicLink}>Send Magic Link</button>
     {:else}
       <p>Check your email for a login link!</p>
     {/if}
   </dialog>
   ```

2. **UserMenu.svelte** - Profile dropdown when logged in
   - Show user email
   - Show tier badge (Free/Premium)
   - "Upgrade to Premium" button (if free)
   - "Manage Subscription" link (if premium)
   - "Sign Out" button

3. **TierBadge.svelte** - Visual indicator of user tier
   ```svelte
   {#if tier === 'premium'}
     <span class="badge premium">✨ Premium</span>
   {:else}
     <span class="badge free">Free</span>
   {/if}
   ```

**Files to Create:**
- `/src/lib/auth/authStore.js` - Auth state management
  ```javascript
  import { writable } from 'svelte/store';

  export const user = writable(null);
  export const userTier = writable('free'); // 'free' | 'premium'
  export const authToken = writable(null);
  export const isAuthenticated = writable(false);
  ```

- `/src/lib/auth/authService.js` - API client for auth
  ```javascript
  export async function sendMagicLink(email) {
    const response = await fetch('/api/auth/send-magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return response.json();
  }

  export async function verifyMagicLink(token) {
    const response = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    return response.json();
  }

  export async function logout() {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${get(authToken)}` }
    });
    // Clear local state
    user.set(null);
    userTier.set('free');
    authToken.set(null);
    isAuthenticated.set(false);
    localStorage.removeItem('authToken');
  }
  ```

- `/src/components/AuthModal.svelte` - Login UI
- `/src/components/UserMenu.svelte` - Profile dropdown
- `/src/components/TierBadge.svelte` - Tier indicator

**Files to Modify:**
- `/src/components/Header.svelte` - Add login button and user menu
  ```svelte
  <script>
    import { user, isAuthenticated } from '$lib/auth/authStore.js';
    import UserMenu from './UserMenu.svelte';
    import AuthModal from './AuthModal.svelte';

    let showAuthModal = $state(false);
  </script>

  <header>
    <nav><!-- existing nav --></nav>

    {#if $isAuthenticated}
      <UserMenu user={$user} />
    {:else}
      <button onclick={() => showAuthModal = true}>Sign In</button>
    {/if}
  </header>

  {#if showAuthModal}
    <AuthModal onClose={() => showAuthModal = false} />
  {/if}
  ```

- `/src/routes/+layout.svelte` - Initialize auth on app load
  ```svelte
  <script>
    import { onMount } from 'svelte';
    import { authToken, user, userTier, isAuthenticated } from '$lib/auth/authStore.js';

    onMount(async () => {
      // Check for stored auth token
      const token = localStorage.getItem('authToken');
      if (token) {
        authToken.set(token);
        // Verify token is still valid
        const profile = await fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json());

        if (profile.user) {
          user.set(profile.user);
          userTier.set(profile.user.tier);
          isAuthenticated.set(true);
        } else {
          // Token invalid, clear it
          localStorage.removeItem('authToken');
        }
      }
    });
  </script>
  ```

**Key Decision:** Authentication is OPTIONAL - free tier works without login

---

## ☁️ Phase 3: Backend Infrastructure (1-2 weeks)

### Cloudflare Stack

**Why Cloudflare?**
- Already using Cloudflare Pages
- Workers run at edge (low latency)
- D1 is SQLite-based (easy to work with)
- KV for fast session storage
- No separate server needed
- Pay-as-you-go (cheap at low volume)

**Components:**

1. **Cloudflare Workers** - API routes
2. **Cloudflare D1** - SQLite database for users & invoices
3. **Cloudflare KV** - Key-value store for sessions & magic links
4. **Resend** - Transactional email service

### Database Schema (D1)

**File:** `/schema.sql`

```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  tier TEXT DEFAULT 'free' CHECK(tier IN ('free', 'premium')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_users_email ON users(email);

-- Invoices table (cloud backups)
CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  invoice_data TEXT NOT NULL,  -- JSON blob of full invoice
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_invoices_user ON invoices(user_id);
CREATE INDEX idx_invoices_updated ON invoices(updated_at);

-- Subscriptions table (Stripe integration)
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT CHECK(status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_end INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
```

### Cloudflare KV Namespaces

**File:** `/wrangler.toml`

```toml
name = "freeinvoice"
main = "src/index.js"
compatibility_date = "2025-11-02"

# KV Namespaces
[[kv_namespaces]]
binding = "MAGIC_LINKS"
id = "your-kv-namespace-id-1"
preview_id = "your-preview-id-1"

[[kv_namespaces]]
binding = "SESSIONS"
id = "your-kv-namespace-id-2"
preview_id = "your-preview-id-2"

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "freeinvoice-db"
database_id = "your-d1-database-id"

# Environment Variables
[vars]
FRONTEND_URL = "https://freeinvoice.info"

# Secrets (set via: wrangler secret put SECRET_NAME)
# RESEND_API_KEY
# STRIPE_SECRET_KEY
# STRIPE_WEBHOOK_SECRET
```

### API Routes to Create

**Authentication:**

1. **`/functions/api/auth/send-magic-link.js`**
   ```javascript
   export async function onRequestPost(context) {
     const { email } = await context.request.json();

     // Validate email
     if (!email || !email.includes('@')) {
       return new Response(JSON.stringify({ error: 'Invalid email' }), {
         status: 400,
         headers: { 'Content-Type': 'application/json' }
       });
     }

     // Generate secure token
     const token = crypto.randomUUID();

     // Store in KV with 15 minute expiry
     await context.env.MAGIC_LINKS.put(token, email, {
       expirationTtl: 900 // 15 minutes
     });

     // Send email via Resend
     const magicLink = `${context.env.FRONTEND_URL}/auth/verify?token=${token}`;

     await fetch('https://api.resend.com/emails', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${context.env.RESEND_API_KEY}`,
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({
         from: 'FreeInvoice <noreply@freeinvoice.info>',
         to: email,
         subject: 'Sign in to FreeInvoice',
         html: `
           <h2>Sign in to FreeInvoice</h2>
           <p>Click the link below to sign in:</p>
           <a href="${magicLink}">Sign In</a>
           <p>This link expires in 15 minutes.</p>
         `
       })
     });

     return new Response(JSON.stringify({ success: true }), {
       headers: { 'Content-Type': 'application/json' }
     });
   }
   ```

2. **`/functions/api/auth/verify.js`**
   ```javascript
   export async function onRequestPost(context) {
     const { token } = await context.request.json();

     // Check if token exists in KV
     const email = await context.env.MAGIC_LINKS.get(token);

     if (!email) {
       return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
         status: 401,
         headers: { 'Content-Type': 'application/json' }
       });
     }

     // Create or get user from D1
     let user = await context.env.DB.prepare(
       'SELECT * FROM users WHERE email = ?'
     ).bind(email).first();

     if (!user) {
       // Create new user
       const userId = crypto.randomUUID();
       await context.env.DB.prepare(
         'INSERT INTO users (id, email, tier, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
       ).bind(userId, email, 'free', Date.now(), Date.now()).run();

       user = { id: userId, email, tier: 'free' };
     }

     // Generate session token
     const sessionToken = crypto.randomUUID();

     // Store session in KV (30 days)
     await context.env.SESSIONS.put(sessionToken, JSON.stringify(user), {
       expirationTtl: 2592000 // 30 days
     });

     // Delete magic link token (one-time use)
     await context.env.MAGIC_LINKS.delete(token);

     return new Response(JSON.stringify({
       user,
       sessionToken
     }), {
       headers: { 'Content-Type': 'application/json' }
     });
   }
   ```

3. **`/functions/api/auth/logout.js`**
   ```javascript
   export async function onRequestPost(context) {
     const authHeader = context.request.headers.get('Authorization');
     const token = authHeader?.replace('Bearer ', '');

     if (token) {
       await context.env.SESSIONS.delete(token);
     }

     return new Response(JSON.stringify({ success: true }), {
       headers: { 'Content-Type': 'application/json' }
     });
   }
   ```

**User Profile:**

4. **`/functions/api/user/profile.js`**
   ```javascript
   export async function onRequestGet(context) {
     const authHeader = context.request.headers.get('Authorization');
     const token = authHeader?.replace('Bearer ', '');

     if (!token) {
       return new Response('Unauthorized', { status: 401 });
     }

     const userJson = await context.env.SESSIONS.get(token);
     if (!userJson) {
       return new Response('Unauthorized', { status: 401 });
     }

     const user = JSON.parse(userJson);

     // Get subscription status
     const subscription = await context.env.DB.prepare(
       'SELECT * FROM subscriptions WHERE user_id = ?'
     ).bind(user.id).first();

     return new Response(JSON.stringify({
       user: {
         ...user,
         subscription: subscription || null
       }
     }), {
       headers: { 'Content-Type': 'application/json' }
     });
   }
   ```

### Email Service Setup (Resend)

**Steps:**
1. Sign up at resend.com
2. Verify domain (freeinvoice.info)
3. Get API key
4. Add to Cloudflare secrets: `wrangler secret put RESEND_API_KEY`

---

## 🔄 Phase 4: Cloud Sync - Premium Only (1 week)

### Hybrid Storage Strategy

**Free Users:** IndexedDB only (current behavior)
**Premium Users:** IndexedDB + Cloud sync

### Implementation

**Storage Layer Modification:**

**File:** `/src/lib/db.js` (modify existing)

```javascript
import { get as idbGet, set as idbSet, del as idbDel, keys as idbKeys } from 'idb-keyval';
import { authToken, userTier } from '$lib/auth/authStore.js';
import { get } from 'svelte/store';

// Existing IndexedDB functions remain the same
export async function saveInvoice(id, invoiceData) {
  // Always save to IndexedDB (offline support)
  const plainInvoiceObject = JSON.parse(JSON.stringify(invoiceData));
  await idbSet(`ig.invoice.${id}`, plainInvoiceObject);

  // If premium user and online, sync to cloud
  const tier = get(userTier);
  const token = get(authToken);

  if (tier === 'premium' && token && navigator.onLine) {
    try {
      await syncToCloud(id, plainInvoiceObject, token);
    } catch (error) {
      console.error('Cloud sync failed, data saved locally:', error);
      // Queue for later sync
      await queueForSync(id);
    }
  }
}

async function syncToCloud(id, invoiceData, token) {
  const response = await fetch('/api/invoices/sync', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ id, invoiceData })
  });

  if (!response.ok) {
    throw new Error('Sync failed');
  }

  return response.json();
}

async function queueForSync(id) {
  const queue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
  if (!queue.includes(id)) {
    queue.push(id);
    localStorage.setItem('syncQueue', JSON.stringify(queue));
  }
}

export async function processSyncQueue() {
  const queue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
  const token = get(authToken);

  if (!token || queue.length === 0) return;

  for (const id of queue) {
    try {
      const invoice = await getInvoice(id);
      if (invoice) {
        await syncToCloud(id, invoice, token);
        // Remove from queue on success
        queue.splice(queue.indexOf(id), 1);
      }
    } catch (error) {
      console.error(`Failed to sync ${id}:`, error);
      // Keep in queue for next attempt
    }
  }

  localStorage.setItem('syncQueue', JSON.stringify(queue));
}
```

**API Endpoint:**

**File:** `/functions/api/invoices/sync.js`

```javascript
export async function onRequestPost(context) {
  const authHeader = context.request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userJson = await context.env.SESSIONS.get(token);
  if (!userJson) {
    return new Response('Unauthorized', { status: 401 });
  }

  const user = JSON.parse(userJson);

  // Check if premium
  if (user.tier !== 'premium') {
    return new Response(JSON.stringify({
      error: 'Cloud sync is a premium feature'
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { id, invoiceData } = await context.request.json();

  // Save to D1
  await context.env.DB.prepare(`
    INSERT INTO invoices (id, user_id, invoice_data, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      invoice_data = excluded.invoice_data,
      updated_at = excluded.updated_at
  `).bind(
    id,
    user.id,
    JSON.stringify(invoiceData),
    Date.now(),
    Date.now()
  ).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestGet(context) {
  // Get all cloud invoices for user
  const authHeader = context.request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userJson = await context.env.SESSIONS.get(token);
  if (!userJson) {
    return new Response('Unauthorized', { status: 401 });
  }

  const user = JSON.parse(userJson);

  const { results } = await context.env.DB.prepare(
    'SELECT id, invoice_data, updated_at FROM invoices WHERE user_id = ? ORDER BY updated_at DESC'
  ).bind(user.id).all();

  return new Response(JSON.stringify({
    invoices: results.map(r => ({
      id: r.id,
      invoice: JSON.parse(r.invoice_data),
      updatedAt: r.updated_at
    }))
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

**UI Component:**

**File:** `/src/components/SyncStatus.svelte`

```svelte
<script>
  import { userTier, isAuthenticated } from '$lib/auth/authStore.js';
  import { onMount } from 'svelte';
  import { processSyncQueue } from '$lib/db.js';

  let syncStatus = $state('synced'); // 'synced' | 'syncing' | 'error'

  onMount(() => {
    // Process sync queue on mount
    if ($isAuthenticated && $userTier === 'premium') {
      processSyncQueue();
    }

    // Process queue when coming back online
    window.addEventListener('online', () => {
      if ($isAuthenticated && $userTier === 'premium') {
        syncStatus = 'syncing';
        processSyncQueue().then(() => {
          syncStatus = 'synced';
        });
      }
    });
  });
</script>

{#if $isAuthenticated && $userTier === 'premium'}
  <div class="sync-status">
    {#if syncStatus === 'synced'}
      <span class="text-green-600">☁️ Synced</span>
    {:else if syncStatus === 'syncing'}
      <span class="text-blue-600">↻ Syncing...</span>
    {:else}
      <span class="text-red-600">✗ Sync Error</span>
    {/if}
  </div>
{/if}
```

---

## 📄 Phase 5: Server-Side PDF - Premium Only (1 week)

### Better Quality PDFs for Premium Users

**Free Users:** Client-side PDF (html2pdf.js) - current behavior
**Premium Users:** Server-side PDF with Puppeteer/Playwright

### Why Server-Side PDF?

- Higher resolution
- Better font rendering
- Proper page breaks
- Custom page sizes
- PDF/A compliance (archival)
- Consistent output across devices

### Implementation

**API Endpoint:**

**File:** `/functions/api/pdf/generate.js`

```javascript
import { chromium } from '@cloudflare/puppeteer';

export async function onRequestPost(context) {
  const authHeader = context.request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userJson = await context.env.SESSIONS.get(token);
  if (!userJson) {
    return new Response('Unauthorized', { status: 401 });
  }

  const user = JSON.parse(userJson);

  // Check if premium
  if (user.tier !== 'premium') {
    return new Response(JSON.stringify({
      error: 'High-quality PDF is a premium feature'
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { invoiceHTML, settings } = await context.request.json();

  // Launch browser
  const browser = await chromium.launch(context.env.BROWSER);
  const page = await browser.newPage();

  // Set content
  await page.setContent(invoiceHTML, { waitUntil: 'networkidle0' });

  // Generate PDF
  const pdf = await page.pdf({
    format: settings.pageSize || 'Letter',
    margin: {
      top: settings.margin || '0.5in',
      right: settings.margin || '0.5in',
      bottom: settings.margin || '0.5in',
      left: settings.margin || '0.5in'
    },
    printBackground: true,
    scale: settings.scale || 1
  });

  await browser.close();

  // Return PDF as base64
  return new Response(JSON.stringify({
    pdf: btoa(String.fromCharCode(...new Uint8Array(pdf))),
    size: pdf.length
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

**Client Service:**

**File:** `/src/lib/pdf/serverPdfService.js`

```javascript
import { authToken } from '$lib/auth/authStore.js';
import { get } from 'svelte/store';

export async function generateServerPDF(invoiceHTML, settings = {}) {
  const token = get(authToken);

  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch('/api/pdf/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ invoiceHTML, settings })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'PDF generation failed');
  }

  const { pdf, size } = await response.json();

  // Convert base64 to blob
  const binary = atob(pdf);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'application/pdf' });

  return { blob, size };
}
```

**Update Main Page:**

**File:** `/src/routes/+page.svelte` (modify existing `saveAsPDF` function)

```javascript
import { userTier } from '$lib/auth/authStore.js';
import { generateServerPDF } from '$lib/pdf/serverPdfService.js';

const saveAsPDF = async (useServer = false) => {
  if (typeof window === 'undefined' || !previewRef) return;

  isGeneratingPDF = true;

  try {
    if (useServer && $userTier === 'premium') {
      // Server-side PDF for premium users
      const invoiceHTML = previewRef.innerHTML;
      const { blob } = await generateServerPDF(invoiceHTML, {
        pageSize: 'Letter',
        margin: '0.5in',
        scale: 1
      });

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice.invoiceTo || 'unknown'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // Client-side PDF (free users or fallback)
      // ... existing html2pdf.js code ...
    }
  } catch (error) {
    console.error('PDF generation failed:', error);
  } finally {
    isGeneratingPDF = false;
  }
};
```

---

## 💳 Phase 6: Stripe Integration (1 week)

### Subscription Management

**Pricing:**
- **Free:** $0/month - Unlimited local invoices
- **Premium:** $5-10/month - Cloud sync, premium PDF, email, templates, advanced features

### Stripe Setup

1. Create Stripe account
2. Create product "FreeInvoice Premium"
3. Create price ($10/month recurring)
4. Set up webhook endpoint
5. Add secrets to Cloudflare

### API Endpoints

**File:** `/functions/api/stripe/create-checkout.js`

```javascript
import Stripe from 'stripe';

export async function onRequestPost(context) {
  const authHeader = context.request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userJson = await context.env.SESSIONS.get(token);
  if (!userJson) {
    return new Response('Unauthorized', { status: 401 });
  }

  const user = JSON.parse(userJson);

  const stripe = new Stripe(context.env.STRIPE_SECRET_KEY);

  // Create or get Stripe customer
  let customerId = user.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id }
    });
    customerId = customer.id;
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{
      price: context.env.STRIPE_PRICE_ID, // Set in environment
      quantity: 1
    }],
    success_url: `${context.env.FRONTEND_URL}/upgrade-success`,
    cancel_url: `${context.env.FRONTEND_URL}/pricing`
  });

  return new Response(JSON.stringify({
    url: session.url
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

**File:** `/functions/api/stripe/webhook.js`

```javascript
import Stripe from 'stripe';

export async function onRequestPost(context) {
  const stripe = new Stripe(context.env.STRIPE_SECRET_KEY);
  const sig = context.request.headers.get('stripe-signature');
  const body = await context.request.text();

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      context.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle events
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      await handleCheckoutComplete(context, session);
      break;

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      await handleSubscriptionChange(context, subscription);
      break;
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleCheckoutComplete(context, session) {
  const userId = session.metadata?.userId;

  if (userId) {
    // Update user to premium
    await context.env.DB.prepare(
      'UPDATE users SET tier = ? WHERE id = ?'
    ).bind('premium', userId).run();

    // Create subscription record
    await context.env.DB.prepare(`
      INSERT INTO subscriptions (id, user_id, stripe_customer_id, stripe_subscription_id, status, current_period_end, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      userId,
      session.customer,
      session.subscription,
      'active',
      Date.now() + 2592000000, // 30 days
      Date.now(),
      Date.now()
    ).run();
  }
}

async function handleSubscriptionChange(context, subscription) {
  // Update subscription status
  await context.env.DB.prepare(
    'UPDATE subscriptions SET status = ?, current_period_end = ?, updated_at = ? WHERE stripe_subscription_id = ?'
  ).bind(
    subscription.status,
    subscription.current_period_end * 1000,
    Date.now(),
    subscription.id
  ).run();

  // If canceled, downgrade user to free
  if (subscription.status === 'canceled') {
    const sub = await context.env.DB.prepare(
      'SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ?'
    ).bind(subscription.id).first();

    if (sub) {
      await context.env.DB.prepare(
        'UPDATE users SET tier = ? WHERE id = ?'
      ).bind('free', sub.user_id).run();
    }
  }
}
```

**UI Component:**

**File:** `/src/components/PricingModal.svelte`

```svelte
<script>
  import { authToken } from '$lib/auth/authStore.js';

  let loading = $state(false);

  async function startCheckout() {
    loading = true;

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${$authToken}`
        }
      });

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Checkout failed:', error);
    } finally {
      loading = false;
    }
  }
</script>

<dialog class="pricing-modal">
  <h2>Upgrade to Premium</h2>

  <div class="pricing-card">
    <h3>Premium</h3>
    <p class="price">$10/month</p>

    <ul>
      <li>✅ Cloud backup & multi-device sync</li>
      <li>✅ High-quality PDF generation</li>
      <li>✅ Premium templates</li>
      <li>✅ Unlimited email sending</li>
      <li>✅ Recurring invoices</li>
      <li>✅ Payment tracking</li>
      <li>✅ Financial reports</li>
    </ul>

    <button onclick={startCheckout} disabled={loading}>
      {loading ? 'Loading...' : 'Upgrade Now'}
    </button>
  </div>
</dialog>
```

---

## 🎨 Phase 7: Premium Templates (1-2 weeks)

### Template Marketplace

**Free Users:** 2-3 basic templates
**Premium Users:** 10+ premium templates

### Implementation

**File Structure:**
```
src/templates/
├── free/
│   ├── default/
│   │   ├── preview.svelte
│   │   └── config.json
│   ├── modern/
│   │   ├── preview.svelte
│   │   └── config.json
│   └── minimal/
│       ├── preview.svelte
│       └── config.json
├── premium/
│   ├── elegant/
│   ├── creative/
│   ├── corporate/
│   ├── bold/
│   ├── tech/
│   ├── artistic/
│   └── professional/
```

**Template Config Example:**
```json
{
  "id": "elegant",
  "name": "Elegant",
  "tier": "premium",
  "description": "Sophisticated design with serif fonts",
  "thumbnail": "/templates/premium/elegant/thumb.png",
  "colors": {
    "primary": "#1f2937",
    "accent": "#d1d5db"
  }
}
```

**Template Selector Component:**

**File:** `/src/components/TemplateSelector.svelte`

```svelte
<script>
  import { userTier } from '$lib/auth/authStore.js';
  import { templates } from '$lib/templateRegistry.js';

  let selectedTemplate = $state('default');
  let showUpgradeModal = $state(false);

  function selectTemplate(templateId, tier) {
    if (tier === 'premium' && $userTier !== 'premium') {
      showUpgradeModal = true;
      return;
    }

    selectedTemplate = templateId;
  }
</script>

<div class="template-selector">
  {#each templates as template}
    <div class="template-card" onclick={() => selectTemplate(template.id, template.tier)}>
      <img src={template.thumbnail} alt={template.name} />
      <h3>{template.name}</h3>
      {#if template.tier === 'premium'}
        <span class="badge premium">✨ Premium</span>
      {/if}
    </div>
  {/each}
</div>
```

---

## 📧 Phase 8: Email Integration - Premium Only (1 week)

### Send Invoices via Email

**Free Users:** Download PDF and email manually
**Premium Users:** Send directly from app

### Implementation

**API Endpoint:**

**File:** `/functions/api/email/send-invoice.js`

```javascript
export async function onRequestPost(context) {
  const authHeader = context.request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userJson = await context.env.SESSIONS.get(token);
  if (!userJson) {
    return new Response('Unauthorized', { status: 401 });
  }

  const user = JSON.parse(userJson);

  // Check if premium
  if (user.tier !== 'premium') {
    return new Response(JSON.stringify({
      error: 'Email sending is a premium feature'
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { to, subject, message, invoiceHTML } = await context.request.json();

  // Generate PDF
  // ... (use server PDF generation from Phase 5) ...

  // Send email via Resend
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${context.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'FreeInvoice <noreply@freeinvoice.info>',
      to,
      subject,
      html: message,
      attachments: [{
        filename: 'invoice.pdf',
        content: pdfBase64
      }]
    })
  });

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

---

## 🚀 Phase 9: Advanced Premium Features (2-3 weeks)

### Professional Tools

**Recurring Invoices:**
- Set up automatic invoice generation
- Weekly/monthly/yearly schedules
- Auto-email to clients

**Payment Tracking:**
- Mark invoices as paid
- Partial payment tracking
- Payment history
- Overdue notifications

**Financial Reports:**
- Revenue by month/year
- Client analytics
- Outstanding invoices
- Payment trends

**Multi-Currency:**
- Support 20+ currencies
- Real-time exchange rates
- Currency conversion

**Client Management:**
- Save client details
- Invoice history per client
- Quick client selection

---

## 📊 Timeline & Success Criteria

### Timeline

**Phase 1:** ✅ COMPLETE (2 weeks) - Mobile, dark mode, i18n
**Phase 2:** 1-2 weeks - Authentication (magic links)
**Phase 3:** 1-2 weeks - Backend infrastructure (Cloudflare)
**Phase 4:** 1 week - Cloud sync (premium)
**Phase 5:** 1 week - Server PDF (premium)
**Phase 6:** 1 week - Stripe integration
**Phase 7:** 1-2 weeks - Premium templates
**Phase 8:** 1 week - Email integration
**Phase 9:** 2-3 weeks - Advanced features

**Total: 2-3 months to full launch**

### Success Criteria

- [x] Phase 1 complete with mobile, dark mode, i18n ✅
- [ ] Free users can use app without login
- [ ] Premium users can sign in with magic links
- [ ] Cloud sync works reliably for premium users
- [ ] Server PDF quality significantly better than client
- [ ] Stripe checkout and webhooks working
- [ ] 10+ premium templates available
- [ ] Email sending with 95%+ delivery rate
- [ ] All advanced features tested and stable

---

## 🎯 Overall Progress

- [x] **Phase 1:** Core UI/UX ✅ COMPLETE (100%)
- [ ] **Phase 2:** Authentication (0%)
- [ ] **Phase 3:** Backend Infrastructure (0%)
- [ ] **Phase 4:** Cloud Sync (0%)
- [ ] **Phase 5:** Server PDF (0%)
- [ ] **Phase 6:** Stripe Integration (0%)
- [ ] **Phase 7:** Premium Templates (0%)
- [ ] **Phase 8:** Email Integration (0%)
- [ ] **Phase 9:** Advanced Features (0%)

**Current Progress: 11% Complete (Phase 1 only)**

**Next Action:** Begin Phase 2 (Authentication System)
