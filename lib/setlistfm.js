// lib/setlistfm.js
// Server-side only: uses the secret API key, so never import this in a client component.

const BASE = "https://api.setlist.fm/rest/1.0";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function sfm(path, retries = 3) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "x-api-key": process.env.SETLISTFM_API_KEY,
      Accept: "application/json",
    },
    next: { revalidate: 60 * 60 * 24 },
  });

  if (res.status === 429 && retries > 0) {
    await sleep(1500); // wait, then try again
    return sfm(path, retries - 1);
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`setlist.fm error ${res.status}`);
  return res.json();
}

export async function findArtist(name) {
  const data = await sfm(
    `/search/artists?artistName=${encodeURIComponent(name)}&sort=relevance`
  );
  return data?.artist?.[0] ?? null; // best match: { mbid, name, url, ... }
}

// Each page = 20 setlists. Keep maxPages small to stay under the rate limit (~2 req/sec).
export async function getSetlists(mbid, maxPages = 15) {
  const all = [];
  for (let p = 1; p <= maxPages; p++) {
    const data = await sfm(`/artist/${mbid}/setlists?p=${p}`);
    if (!data?.setlist) break;
    all.push(...data.setlist);
    if (p * data.itemsPerPage >= data.total) break;
    await sleep(1000);
  }
  return all;
}

// Turn raw setlists into dashboard numbers
export function buildStats(setlists) {
  const songCounts = {};
  const cityCounts = {};

  for (const show of setlists) {
    const city = show.venue?.city;
    if (city) {
      const key = `${city.name}, ${city.country?.name ?? ""}`;
      cityCounts[key] = (cityCounts[key] || 0) + 1;
    }

    for (const set of show.sets?.set ?? []) {
      for (const song of set.song ?? []) {
        if (!song.name) continue; // skip blank entries
        songCounts[song.name] = (songCounts[song.name] || 0) + 1;
      }
    }
  }

  const top = (obj, n) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([name, count]) => ({
        name,
        count,
        percent: Math.round((count / setlists.length) * 100),
      }));

  return {
    showCount: setlists.length,
    topSongs: top(songCounts, 10),
    topCities: top(cityCounts, 10),
    recentShows: setlists.slice(0, 5).map((s) => ({
      date: s.eventDate, // format: dd-MM-yyyy
      venue: s.venue?.name,
      city: s.venue?.city?.name,
      tour: s.tour?.name ?? null,
      url: s.url,
    })),
  };
}

// Build stats for all shows, plus one set of stats per tour.
// Tours with fewer than minShows shows are skipped (too little data to be interesting).
export const ALL = "All shows";

export function buildViews(setlists, minShows = 3) {
  const byTour = {};
  for (const show of setlists) {
    const t = show.tour?.name;
    if (!t) continue;
    (byTour[t] ||= []).push(show);
  }

  // Setlists arrive newest-first, so Object.keys order = most recent tour first
  const tourNames = Object.keys(byTour).filter((t) => byTour[t].length >= minShows);

  const views = { [ALL]: buildStats(setlists) };
  for (const t of tourNames) views[t] = buildStats(byTour[t]);

  return {
    tours: tourNames.map((t) => ({ name: t, showCount: byTour[t].length })),
    views,
  };
}