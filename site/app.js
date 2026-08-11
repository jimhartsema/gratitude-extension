/* ---------------------------------------------------------------------------
   Landing page behaviour.

   Three states, only one visible at a time: the email capture (phones), the
   direct install button (laptops), and the confirmation.
   --------------------------------------------------------------------------- */

/* ══ CONFIGURE ME ═══════════════════════════════════════════════════════════
   Fill these three in and the page is live. See site/README.md for how to
   pick a provider and what to put in the welcome email. */
const CONFIG = {
  // Is it live on the Chrome Web Store yet? This changes what the page is
  // allowed to promise, so flip it to true the day it's approved — and paste
  // the listing URL into cwsUrl at the same time.
  //
  // While it's false, laptop visitors get the email form too. That's on
  // purpose: sending them to a ZIP and chrome://extensions loses nearly all
  // of them, whereas an address means you can tell them the day it lands.
  published: true,

  // Chrome Web Store listing. Only used once published is true.
  cwsUrl: "https://chromewebstore.google.com/detail/Daily%20Gratitude%20Journal%20%26%20Hourly%20Reminders/ljhdeokfmoakelalgdkcgmnikcnhdhdf",

  // Where the source lives until then — the honest fallback for the few
  // people who are happy to load an unpacked extension.
  repoUrl: "https://github.com/jimhartsema/gratitude-extension",

  // Your email provider's form endpoint. Leave empty to test the page
  // without sending anything — the flow still runs end to end.
  endpoint: "",

  // "buttondown" | "formspree" | "custom"
  //
  // These differ in more than field names. Buttondown's embed endpoint takes
  // no API key — which is exactly what we want on a public page — but it
  // doesn't send CORS headers, so the browser hands back an opaque response
  // and we cannot tell success from failure. Formspree does send them, so
  // errors are real. See site/README.md before changing this.
  provider: "buttondown",
};

const $ = (id) => document.getElementById(id);

const panels = {
  mobile:  $("panel-mobile"),
  desktop: $("panel-desktop"),
  done:    $("panel-done"),
};

const ON_DESKTOP = isDesktop();

function show(name) {
  for (const [key, el] of Object.entries(panels)) el.hidden = key !== name;
  // "Type this into your laptop" is only worth saying to someone who isn't
  // already sitting at one — which, before launch, includes people seeing the
  // email form on a desktop.
  $("fallback").hidden = name !== "mobile" || ON_DESKTOP;
}

/* ---- What can we honestly say? -------------------------------------------
   Before launch there is no link to send, so every word that implies one has
   to change. Getting this wrong is worse than a plain page: promise "the
   install link" and deliver "we'll let you know", and the first email reads
   as a bait-and-switch. */
const COPY = {
  live: {
    eyebrow: "It's a Chrome extension",
    lead:    "So it lives on your laptop, not your phone. Leave your email and the link will be waiting for you there.",
    button:  "Send me the link",
    done:    "Check your inbox from your laptop — the email has the install link in it.",
    doneNote: "Nothing there in a few minutes? Have a look in Promotions or Spam, and drag it across so the next one lands properly.",
    promise: "Just the link, and the occasional note when something new lands. No spam, unsubscribe in one click.",
  },
  soon: {
    eyebrow: "Almost there",
    lead:    "It's a Chrome extension, so it lives on your laptop — and it lands on the Chrome Web Store shortly. Leave your email and you'll hear the moment it does.",
    button:  "Tell me when it's ready",
    done:    "You're on the list. You'll get one email the day it goes live — open that one on your laptop.",
    doneNote: "Nothing until then, promise. When it does arrive it may land in Promotions, so it's worth a look there.",
    promise: "One email when it launches, then only the occasional note. No spam, unsubscribe in one click.",
  },
};

function applyCopy() {
  const copy = CONFIG.published ? COPY.live : COPY.soon;
  $("capture-eyebrow").textContent = copy.eyebrow;
  $("capture-lead").textContent = copy.lead;
  $("submit").textContent = copy.button;
  $("done-lead").textContent = copy.done;
  $("done-note").textContent = copy.doneNote;
  $("capture-promise").textContent = copy.promise;

  $("manual").hidden = CONFIG.published;
  $("manual-link").href = CONFIG.repoUrl;
  $("cws-desktop").href = CONFIG.cwsUrl;
}

/* ---- Which device? -------------------------------------------------------
   Deliberately crude. A false "mobile" only costs a laptop user one extra
   click on the fallback line; a false "desktop" strands a phone user on a
   button that cannot work. When unsure, assume phone. */
function isDesktop() {
  if (navigator.userAgentData?.mobile === true) return false;
  if (/Android|iPhone|iPod|Mobile|Silk/i.test(navigator.userAgent)) return false;
  // iPads report as desktop Safari but still can't install extensions.
  if (/iPad/.test(navigator.userAgent)) return false;
  if (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent)) return false;
  return window.matchMedia("(pointer: fine)").matches;
}

/* ---- Where did they come from? ------------------------------------------
   Print a different QR per medium — ?s=card, ?s=ig, ?s=linkedin — and the
   signup itself tells you which one is actually working. */
function source() {
  const q = new URLSearchParams(location.search);
  return q.get("s") || q.get("src") || q.get("utm_source") || "direct";
}

/* ---- Submission ---------------------------------------------------------- */

// Intentionally loose. Bouncing a real-but-unusual address is a worse outcome
// than accepting a typo, which the provider will drop anyway.
const looksLikeEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

// Each provider wants a different shape on the wire. `opaque` means we won't
// be able to read the response, so a resolved fetch has to count as success.
function requestFor(email) {
  const tag = source();

  if (CONFIG.provider === "buttondown") {
    const body = new URLSearchParams({ email, tag });
    return {
      opaque: true,
      init: { method: "POST", mode: "no-cors", body },
    };
  }

  return {
    opaque: false,
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, source: tag }),
    },
  };
}

function handleSubmit(event) {
  event.preventDefault();

  const field = $("email");
  const error = $("error");
  const button = $("submit");
  const email = field.value.trim();

  if (!looksLikeEmail(email)) {
    field.classList.add("is-invalid");
    error.textContent = "That doesn't look quite right — mind checking it?";
    error.hidden = false;
    field.focus();
    return;
  }

  const label = button.textContent;
  field.classList.remove("is-invalid");
  error.hidden = true;
  button.disabled = true;
  button.textContent = "Sending…";

  // No endpoint configured yet: run the flow so the page can be previewed.
  if (!CONFIG.endpoint) {
    console.warn("[daily-gratitude] No CONFIG.endpoint set — nothing was sent.", email, source());
    show("done");
    return;
  }

  const { opaque, init } = requestFor(email);

  fetch(CONFIG.endpoint, init)
    .then((res) => {
      // An opaque response carries no status at all, so reaching here is the
      // only signal we get. 409 means "already subscribed" — from where the
      // person is standing that's a success, they still want the link.
      if (!opaque && !res.ok && res.status !== 409) throw new Error("HTTP " + res.status);
      show("done");
    })
    .catch(() => {
      button.disabled = false;
      button.textContent = label;
      error.innerHTML =
        'Something went wrong our end. Email ' +
        '<a href="mailto:dailygratitude.contact@gmail.com">dailygratitude.contact@gmail.com</a> ' +
        "and we'll send it over by hand.";
      error.hidden = false;
    });
}

/* ---- Boot ---------------------------------------------------------------- */

applyCopy();

$("capture").addEventListener("submit", handleSubmit);
$("email").addEventListener("input", () => {
  $("email").classList.remove("is-invalid");
  $("error").hidden = true;
});

// The "Add to Chrome" button only makes sense once there's something to add.
// Until then everyone gets the form, laptop or not.
show(CONFIG.published && ON_DESKTOP ? "desktop" : "mobile");
