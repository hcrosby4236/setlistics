// app/api/song/route.js
// GET /api/song?artist=My%20Chemical%20Romance&song=Helena
// Looks up album art, album name, and a 30-second preview from the iTunes Search API (no key needed).

import { NextResponse } from "next/server";

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const artist = params.get("artist")?.trim();
  const song = params.get("song")?.trim();

  if (!artist || !song) {
    return NextResponse.json({ error: "Missing artist or song" }, { status: 400 });
  }

  try {
    const url =
      `https://itunes.apple.com/search?term=${encodeURIComponent(`${artist} ${song}`)}` +
      `&media=music&entity=song&limit=5`;

    // Cache for a week: iTunes allows only ~20 requests per minute
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 * 7 } });
    if (!res.ok) {
      return NextResponse.json({ found: false }, { status: res.status });
    }

    const { results = [] } = await res.json();
    const a = artist.toLowerCase();
    const s = song.toLowerCase();

    // Prefer an exact artist + song match, then fall back to any result by that artist
    const match =
      results.find(
        (r) => r.artistName?.toLowerCase() === a && r.trackName?.toLowerCase().includes(s)
      ) ?? results.find((r) => r.artistName?.toLowerCase().includes(a));

    if (!match) return NextResponse.json({ found: false });

    return NextResponse.json({
      found: true,
      album: match.collectionName,
      genre: match.primaryGenreName,
      artwork: match.artworkUrl100?.replace("100x100", "300x300"),
      preview: match.previewUrl,
    });
  } catch (err) {
    return NextResponse.json({ found: false, error: err.message }, { status: 500 });
  }
}