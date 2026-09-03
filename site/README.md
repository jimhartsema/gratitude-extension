# Landing page

The marketing page for Daily Gratitude. One screen, one job: understand what
the extension is in about four seconds, then click **Add to Chrome**.

Live at **https://jimhartsema.github.io/gratitude-extension/**

Traffic arrives from LinkedIn, Instagram, and the Chrome Web Store listing.

## What's here

```
index.html   The whole page — markup, CSS and font declarations in one file
icon128.png  Favicon and apple-touch-icon
og.png       Social card image (1200×675, from the Web Store thumbnail)
fonts/       Newsreader woff2 + OFL.txt
.nojekyll    Tells Pages to serve the folder as-is
```

No JavaScript, no build step, no dependencies. Editing the page means editing
`index.html`.

**No analytics, and please keep it that way.** The extension's promise is "no
tracking, no external services of any kind", and a tag manager on the marketing
page would make that promise a half-truth. There is no counter here on purpose.

The design is a faithful build of the handoff in `Website/design/` (option 1a).
Every colour, size and shadow is lifted from the extension's own source —
`src/popup.css`, `src/journal.css` — so the page and the product look like the
same thing. If you change a value here, change it there too, or don't change it.

## Previewing locally

```sh
python3 -m http.server 8000 --directory site
```

Then open http://localhost:8000/. Opening `index.html` as a `file://` URL works
too, but the fonts won't load, so the headline falls back to Georgia.

## Deploying

Automatic. `.github/workflows/pages.yml` publishes this folder to GitHub Pages
on every push to `main` that touches `site/`. There's no build — the workflow
uploads the folder as it stands.

To publish a branch before merging it (useful for reviewing a change on the
real URL), run the workflow manually:

```sh
gh workflow run pages.yml --ref <branch>
gh run watch
```

Note that this overwrites the live site with that branch until the next deploy
from `main`.

## On mobile

The **Add to Chrome** button stays on phones, deliberately. An extension can't
be installed from one, so a share of that traffic dead-ends at the store
listing — but the listing is still the right destination: it's where someone
can read the reviews and come back to it on a laptop.

The previous version of this page solved that differently, by capturing an
email and promising to send the link to your laptop. That form was never wired
to a provider (`endpoint` was empty), so every address submitted to it was
discarded behind a fake success screen. It's gone. If you want that bridge
back, it needs a real mailing-list endpoint first — the page has no backend and
can't send anything by itself.

## Moving to dailygratitude.day

The domain isn't registered yet. When it is:

1. **Register it**, then add a file `site/CNAME` containing exactly:
   ```
   dailygratitude.day
   ```
2. **Update the absolute URLs** in `index.html` — `og:url`, `og:image`,
   `twitter:image` and `<link rel="canonical">`. Everything else on the page is
   a relative path and needs no change.
3. **At the registrar**, point the apex at GitHub's Pages servers:
   ```
   A     @     185.199.108.153
   A     @     185.199.109.153
   A     @     185.199.110.153
   A     @     185.199.111.153
   CNAME www   jimhartsema.github.io.
   ```
4. In **Settings → Pages**, set the custom domain and wait for the DNS check to
   pass, then tick **Enforce HTTPS**. The certificate takes a few minutes.

The old github.io URL keeps working afterwards — it redirects to the custom
domain — so links already out in the world don't break.
