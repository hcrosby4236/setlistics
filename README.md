# Setlistics

Search any artist and see their live history at a glance: the songs they play most, the cities they've played most, and their most recent shows. Filter by tour to compare different eras.

**Live demo:** setlistics.vercel.app

![Setlistics screenshot](./screenshot.png)

## Features

- **Artist search** with a dashboard built from real concert setlists
- **Most played songs**, showing how many shows each song was played at and the percent of shows
- **Album art and 30-second previews** for each top song
- **Top cities** ranked by number of shows, with colored bars
- **Tour filter** to switch between tours and see how setlists change
- **Recent shows** linking back to the full setlist
- Responsive layout for desktop and mobile

## Tech stack

- [Next.js](https://nextjs.org/) (App Router) and React
- [setlist.fm API](https://api.setlist.fm/docs/1.0/index.html) for shows, venues, tours, and setlists
- [iTunes Search API](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/) for album art, album names, genre, and previews
- Deployed on [Vercel](https://vercel.com/)

## How it works

1. The browser calls `/api/artist?name=...`, a Next.js API route.
2. The route finds the artist on setlist.fm, then pages through their recent setlists.
3. `lib/setlistfm.js` counts songs and cities, then builds stats for all shows and for each tour.
4. For each top song, the page calls `/api/song`, which looks up artwork and a preview on iTunes.

Both external APIs are called **server-side**, so the setlist.fm API key never reaches the browser. Responses are cached (a day for setlists, a week for song lookups) and requests are retried on `429` rate-limit errors, since both APIs limit how fast you can call them.

## Project structure

```
app/
├── api/
│   ├── artist/route.js   # setlist.fm lookup + stats
│   └── song/route.js     # iTunes artwork/preview lookup
├── icon.svg              # favicon
├── layout.tsx
└── page.js               # dashboard UI
lib/
└── setlistfm.js          # API helpers and stats calculations
```

## Run it locally

1. Clone the repo and install dependencies:

   ```bash
   git clone https://github.com/<your-username>/<your-repo>.git
   cd <your-repo>
   npm install
   ```

2. Get a free API key at [setlist.fm](https://www.setlist.fm/settings/api).

3. Create a `.env.local` file in the project root:

   ```
   SETLISTFM_API_KEY=your_key_here
   ```

4. Start the dev server and open [http://localhost:3000](http://localhost:3000):

   ```bash
   npm run dev
   ```

## Configuration

To analyze more or fewer shows, change `maxPages` in `getSetlists` in `lib/setlistfm.js` (each page is 20 shows). More pages means a slower first search, and results are cached afterward.

## Notes

- Setlist data is crowd-sourced, so counts are approximate and some shows may be missing songs.
- The stats cover the most recent shows pulled from setlist.fm, not an artist's entire career.
- Setlistics is an independent project and is not affiliated with setlist.fm or Apple.

## What I learned

- Building and securing API routes in Next.js so secrets stay on the server
- Working around rate limits with retries, delays, and caching
- Turning raw API data into stats and a clean, responsive UI
- Taking a design from a Figma prototype to a deployed site