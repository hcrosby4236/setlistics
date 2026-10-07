// app/api/artist/route.js
// GET /api/artist?name=Taylor%20Swift

import { NextResponse } from "next/server";
import { findArtist, getSetlists, buildViews } from "@/lib/setlistfm";

export async function GET(request) {
  const name = new URL(request.url).searchParams.get("name")?.trim();

  if (!name) {
    return NextResponse.json({ error: "Missing ?name=" }, { status: 400 });
  }

  try {
    const artist = await findArtist(name);
    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    const setlists = await getSetlists(artist.mbid);
    const { tours, views } = buildViews(setlists);

    return NextResponse.json({
      artist: { name: artist.name, mbid: artist.mbid, url: artist.url },
      tours,
      views,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}