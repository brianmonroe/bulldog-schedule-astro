# Bulldog Schedule

Mobile-first athletics schedule built with Astro and powered by a published Google Sheets CSV.

## Local development

```bash
npm install
npm run dev
```

## Sponsor banner

Replace `public/sponsor-banner.svg` with the sponsor artwork while keeping the same filename, or update the image path and alt text in `src/pages/index.astro`. A wide image around a 5.45:1 aspect ratio works best; the included placeholder is 1200 × 220.

## Event stream links

Add a column named `stream_url` to the first/header row of the published schedule sheet. Paste a complete `https://` YouTube or other streaming URL into that column for an event. Empty cells render nothing. YouTube URLs receive a **YouTube** label; other valid web links receive **Watch stream**.

For compatibility, the site also recognizes columns named `youtube_url` or `livestream_url`, but `stream_url` is preferred.

## Production CSS

Edit the readable source files in `public/styles.css` and `public/print.css`. `npm run build` copies and minifies them into `dist/` for deployment.
