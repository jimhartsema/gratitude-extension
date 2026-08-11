# Landing page — the bridge from phone to laptop

This is where the business-card QR code and the Instagram story link should
point. **Never point them at the Chrome Web Store.** Chrome on Android and iOS
doesn't run extensions at all, so the store listing on a phone is a dead end
with no install button — every scan is lost there.

## Before and after launch

The page behaves differently depending on `CONFIG.published`, because before
the extension is on the Web Store there is no link to send and the page must
not pretend otherwise.

**While `published: false` — everyone gets the email form, laptop included.**
Sending a desktop visitor to a ZIP and `chrome://extensions` developer mode
loses nearly all of them; an address means you can tell them the day it lands.
There's a quiet one-line link to the GitHub install for the few who'd rather.

**Once `published: true`:**

| Who arrives | What they see |
| --- | --- |
| Phone (most QR scans) | Email field — "leave it and we'll send the link to your laptop" |
| Laptop (someone typed the URL) | A direct **Add to Chrome** button, no form |
| Just submitted | "Check your inbox from your laptop", plus a nudge about the Promotions tab |

Every piece of copy that changes between the two phases lives in the `COPY`
object at the top of `app.js` — button label, headline, confirmation and the
privacy promise. Edit it there, not in the HTML.

---

## Setup — four values in `app.js`

```js
const CONFIG = {
  published: false,                                         // 1
  cwsUrl:    "https://chromewebstore.google.com/detail/…",  // 2
  endpoint:  "https://buttondown.com/api/emails/embed-subscribe/YOURNAME",  // 3
  provider:  "buttondown",                                  // 4
};
```

**1 + 2.** Both are set — the extension went live in July 2026 and the listing
URL is wired in, so the page is in its post-launch behaviour.

**3 + 4. The email provider.** Two sensible options:

- **Buttondown** (recommended) — the embed endpoint above needs no API key, so
  nothing secret ends up in the page source. The catch: it sends no CORS
  headers, so the browser can't tell us whether the signup succeeded. The page
  assumes success. In practice this is fine; just check your subscriber count
  after the first day of handing out cards rather than trusting the UI.
- **Formspree** — does send CORS headers, so failures surface as a real error
  message. But it's a form-to-email tool, not a mailing list, so you'd be
  managing subscribers by hand later.

Either way, set up the **welcome email as an automation in the provider**, not
in this page — the page has no backend and can't send anything itself.

---

## The welcome email

You need **two** of these, and which one is live depends on the phase.

### Pre-launch: the confirmation

Short, and it must not read as a broken version of the real one. Set this as
the automation now:

> Subject: **You're on the list — Daily Gratitude**
>
> Hi,
>
> Thanks for scanning. Daily Gratitude is a Chrome extension, so it'll live on
> your laptop — I'll send you one email the day it's live on the Chrome Web
> Store, and nothing before then.
>
> In the meantime, today's:
>
> *"Everything you need is already within you."*
>
> — Jim

Then on launch day, send that list a single broadcast with the install link.
Those people scanned a card and waited; they're the most likely first reviews
you'll get, and reviews are what make the store listing rank.

### Post-launch: the install link

This email is the whole product. If it doesn't land, or doesn't get opened, the
scan was wasted. Three things matter:

**Subject line** — it has to be recognisable hours later in a full inbox:

> Your Daily Gratitude link — open this one on your laptop

**Body** — lead with the link, and give them something now rather than only a
task to do later:

> Hi,
>
> Here's the link — **open it on your laptop**, since Daily Gratitude is a
> Chrome extension and lives in your browser there:
>
> → [Add Daily Gratitude to Chrome](CWS_LINK)
>
> It takes about ten seconds. Then one kind reminder arrives every hour while
> Chrome is open, and there's a three-question journal waiting each morning.
>
> While you're here, today's:
>
> *"Everything you need is already within you."*
>
> — Jim

**Timing** — send instantly, then one follow-up the next morning around 9am for
anyone who hasn't clicked. Most people scan a card in the evening or at an
event; the second email is the one that catches them at a desk.

---

## Deliverability — the invisible failure

A brand-new sending domain lands in Gmail's Promotions tab or Spam more often
than not, and you'll never see it happen. Before printing any cards:

1. Set up **SPF, DKIM and DMARC** on your domain. Every provider walks you
   through it; it's a few DNS records and it's not optional.
2. Send yourself a test to a Gmail, an Outlook and an iCloud address. Check
   which tab it lands in.
3. Send from a real domain (`hello@dailygratitude.day`), never from a Gmail
   address via a third-party sender — that combination gets filtered hardest.

---

## Which channel actually works

Add `?s=` to the URL you encode in each QR or link:

- Business card → `dailygratitude.day/?s=card`
- Instagram story → `dailygratitude.day/?s=ig`
- LinkedIn → `dailygratitude.day/?s=linkedin`

The value rides along with the signup as a tag, so after a month you'll know
whether the cards are worth reprinting or whether it's all coming from
Instagram. Without this you're guessing.

---

## On the card itself

Print the short URL **in large type** next to the QR, not just the QR. The
card's real advantage is that it sits on a desk next to a laptop — plenty of
people will type it two days later, and a QR can't be typed.

---

## Deploying

It's four static files plus fonts — any host works. Netlify Drop (drag the
`site` folder onto netlify.com/drop) or GitHub Pages will both do it for free.
Point a short, spellable domain at it; you're asking people to read it off a
card and type it from memory.

## Note on the privacy promise

The extension's README promises "no data collected, no third parties". That's
still true of the extension itself — but this page does collect an email
address and hand it to a mail provider. Keep those claims separate so the two
don't contradict each other: the promise on this page is about what the
*extension* does with what you write in it.
