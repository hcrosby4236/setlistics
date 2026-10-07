"use client";

import { useEffect, useRef, useState } from "react";

const ALL = "All shows";
const BAR_COLORS = ["#7a4cf0", "#ff6b4a", "#c8f04d", "#ffb3d1", "#3fb8d4"];

// setlist.fm dates come as dd-MM-yyyy
function formatDate(d) {
  if (!d) return "";
  const [day, month, year] = d.split("-");
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// "Los Angeles, United States" -> ["Los Angeles", "United States"]
function splitCity(label) {
  const i = label.lastIndexOf(", ");
  return i === -1 ? [label, ""] : [label.slice(0, i), label.slice(i + 2)];
}

// Logo mark: a rounded square with three "setlist" lines
function Logo() {
  return (
    <svg width="44" height="44" viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="#6c3fe6" />
      <rect x="10" y="11" width="15" height="3.5" rx="1.75" fill="#fff" />
      <rect x="10" y="18.5" width="21" height="3.5" rx="1.75" fill="#fff" opacity="0.8" />
      <rect x="10" y="26" width="11" height="3.5" rx="1.75" fill="#c8f04d" />
    </svg>
  );
}

function MusicNote() {
  return (
    <svg
      className="music-note"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" fill="currentColor" />
      <circle cx="18" cy="16" r="3" fill="currentColor" />
    </svg>
  );
}

// One row in "Most played songs": rank, album art, title, album, percent, preview button
function SongItem({ song, artist, rank }) {
  const [info, setInfo] = useState(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setInfo(null);
    fetch(`/api/song?artist=${encodeURIComponent(artist)}&song=${encodeURIComponent(song.name)}`)
      .then((r) => r.json())
      .then((j) => !cancelled && setInfo(j))
      .catch(() => {});
    return () => {
      cancelled = true;
      audioRef.current?.pause();
    };
  }, [artist, song.name]);

  function togglePreview() {
    if (!info?.preview) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(info.preview);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  }

  return (
    <li className="song">
      <span className="rank">{String(rank).padStart(2, "0")}</span>
      {info?.artwork ? (
        <img className="art" src={info.artwork} alt="" width="56" height="56" />
      ) : (
        <div className="art placeholder" />
      )}
      <div className="songbody">
        <div className="songname">{song.name}</div>
        {info?.album && <div className="album">{info.album}</div>}
      </div>
      <div className="pct">
        <div>
          <strong>{song.count}</strong> {song.count === 1 ? "show" : "shows"}
        </div>
        <div className="pctsub">{song.percent}% of shows</div>
      </div>
      {info?.preview ? (
        <button
          type="button"
          className="play"
          onClick={togglePreview}
          aria-label={`${playing ? "Pause" : "Play"} preview of ${song.name}`}
        >
          {playing ? "Pause" : "Play"}
        </button>
      ) : (
        <span className="play-space" />
      )}
    </li>
  );
}

export default function Home() {
  const [name, setName] = useState("");
  const [data, setData] = useState(null);
  const [tour, setTour] = useState(ALL);
  const [genre, setGenre] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Genre for the header comes from the iTunes result for the #1 song (cached by the route)
  useEffect(() => {
    const top = data?.views[ALL]?.topSongs?.[0];
    setGenre("");
    if (!top) return;
    let off = false;
    fetch(`/api/song?artist=${encodeURIComponent(data.artist.name)}&song=${encodeURIComponent(top.name)}`)
      .then((r) => r.json())
      .then((j) => !off && setGenre(j.genre || ""))
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [data]);

  async function search(e) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError("");
    setData(null);
    setTour(ALL);

    try {
      const res = await fetch(`/api/artist?name=${encodeURIComponent(name)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Something went wrong");
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const stats = data?.views[tour];
  const maxCity = stats?.topCities?.[0]?.count || 1;

  return (
    <main className="page">
      <style>{css}</style>

      <header className="intro">
        <div className="brand">
          <Logo />
          <h1>
            Setlistics <MusicNote />
          </h1>
        </div>
        <p>Search an artist to see their most-played songs and where they've toured.</p>
      </header>

      <form onSubmit={search} className="search">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Artist name"
          aria-label="Artist name"
        />
        <button disabled={loading}>{loading ? "Searching..." : "Search"}</button>
      </form>

      {error && <p className="error">{error}</p>}

      {data && stats && (
        <>
          <p className="live-note">Showing live setlist results for {data.artist.name}</p>

          <section className="hero">
            <div className="hero-top">
              <span className="pill">Artist spotlight</span>
              <label className="status">
                <span className="dot" />
                {data.tours.length > 0 ? (
                  <select
                    className="status-select"
                    value={tour}
                    onChange={(e) => setTour(e.target.value)}
                    aria-label="Filter by tour"
                  >
                    <option value={ALL}>
                      {ALL} ({data.views[ALL].showCount})
                    </option>
                    {data.tours.map((t) => (
                      <option key={t.name} value={t.name}>
                        {t.name} ({t.showCount})
                      </option>
                    ))}
                  </select>
                ) : (
                  "Live data"
                )}
              </label>
            </div>

            <div className="hero-name">
              <div className="badge">{initials(data.artist.name)}</div>
              <div>
                {genre && <div className="genre">{genre}</div>}
                <h2>{data.artist.name}</h2>
              </div>
            </div>

            <dl className="hero-stats">
              <div>
                <dt>Shows analyzed</dt>
                <dd>{stats.showCount}</dd>
              </div>
              <div>
                <dt>Top city</dt>
                <dd>{stats.topCities[0] ? splitCity(stats.topCities[0].name)[0] : "-"}</dd>
              </div>
              <div>
                <dt>Latest show</dt>
                <dd>{formatDate(stats.recentShows[0]?.date) || "-"}</dd>
              </div>
            </dl>
          </section>

          <section className="card">
            <p className="label">On repeat</p>
            <h3>Most played songs</h3>
            <p className="note">Based on the {stats.showCount} shows analyzed.</p>
            <ul className="songs">
              {stats.topSongs.map((s, i) => (
                <SongItem key={s.name} song={s} artist={data.artist.name} rank={i + 1} />
              ))}
            </ul>
          </section>

          <section className="card dark">
            <div className="card-head">
              <div>
                <p className="label lime">Tour footprint</p>
                <h3>Most played cities</h3>
              </div>
              <span className="tag">{tour}</span>
            </div>
            <ul className="cities">
              {stats.topCities.map((c, i) => {
                const [city, country] = splitCity(c.name);
                return (
                  <li key={c.name}>
                    <span className="crank">{i + 1}</span>
                    <div className="cbody">
                      <div className="crow">
                        <div>
                          <div className="cname">{city}</div>
                          <div className="ccountry">{country}</div>
                        </div>
                        <div className="ccount">
                          <strong>{c.count}</strong> shows
                        </div>
                      </div>
                      <div className="ctrack">
                        <div
                          className="cfill"
                          style={{
                            width: `${(c.count / maxCity) * 100}%`,
                            background: BAR_COLORS[i % BAR_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card">
            <p className="label">Live history</p>
            <h3>Recent shows</h3>
            <ul className="shows">
              {stats.recentShows.map((s) => (
                <li key={s.url}>
                  <span>
                    <a href={s.url} target="_blank" rel="noreferrer">
                      {s.venue}, {s.city}
                    </a>
                    {s.tour && <em> on {s.tour}</em>}
                  </span>
                  <span className="when">{formatDate(s.date)}</span>
                </li>
              ))}
            </ul>
            <p className="credit">
              Setlist data from{" "}
              <a href={data.artist.url} target="_blank" rel="noreferrer">
                setlist.fm
              </a>
              . Album art and previews from Apple. Setlistics is an independent project, not affiliated with setlist.fm or Apple.
            </p>
          </section>
        </>
      )}
    </main>
  );
}

const css = `
  @import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&display=swap");

  body { margin: 0; background: #f4f1ea; color: #17141f; }

  .page {
    --ink: #17141f;
    --muted: #7d7788;
    --purple: #6c3fe6;
    --lime: #c8f04d;
    --line: #ece8df;
    max-width: 960px;
    margin: 0 auto;
    padding: 40px 20px 80px;
    font-family: "Manrope", system-ui, -apple-system, "Segoe UI", sans-serif;
    color: var(--ink);
  }
  .page a { color: inherit; }
  .page a:hover { color: var(--purple); }
  .page :focus-visible { outline: 2px solid var(--purple); outline-offset: 2px; }

  .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  .intro h1 { display: flex; align-items: center; gap: 8px; font-size: 2rem; margin: 0; letter-spacing: -0.03em; font-weight: 800; }
  .music-note { color: var(--purple); }
  .intro p { margin: 0 0 20px; color: var(--muted); }

  .search { display: flex; gap: 10px; margin-bottom: 28px; }
  .search input {
    flex: 1; padding: 14px 18px; font: inherit; font-size: 1rem;
    background: #fff; color: var(--ink);
    border: 1px solid var(--line); border-radius: 999px;
  }
  .search button {
    padding: 14px 26px; font: inherit; font-weight: 700; cursor: pointer;
    background: var(--ink); color: #fff; border: 0; border-radius: 999px;
  }
  .search button:disabled { opacity: 0.6; cursor: wait; }
  .error { color: #c0392b; font-weight: 600; }

  /* Hero */
  .hero {
    background:
      radial-gradient(circle at 85% 20%, rgba(255, 255, 255, 0.14), transparent 45%),
      radial-gradient(circle at 95% 85%, rgba(40, 10, 120, 0.45), transparent 50%),
      linear-gradient(135deg, #7345ee 0%, #5a2fc9 100%);
    color: #fff; border-radius: 32px; padding: 32px; margin-bottom: 20px;
  }
  .hero-top { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
  .pill {
    font: inherit; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
    padding: 9px 16px; border-radius: 999px;
    background: rgba(255, 255, 255, 0.16); border: 1px solid rgba(255, 255, 255, 0.28); color: #fff;
  }
  .status {
    display: inline-flex; align-items: center; gap: 8px; max-width: 100%;
    padding: 7px 10px 7px 14px; border-radius: 999px;
    background: var(--lime); color: var(--ink); font-size: 0.85rem; font-weight: 700;
  }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ink); flex-shrink: 0; }
  .status-select {
    font: inherit; color: inherit; background: transparent; border: 0; cursor: pointer;
    max-width: 100%; text-overflow: ellipsis;
  }
  .live-note { text-align: right; margin: 0 8px 10px; font-size: 0.85rem; color: var(--muted); }
  .hero-name { display: flex; align-items: center; gap: 20px; margin: 36px 0 28px; }
  .badge {
    width: 80px; height: 80px; flex-shrink: 0; border-radius: 20px;
    display: grid; place-items: center; font-size: 1.5rem; font-weight: 800;
    background: rgba(255, 255, 255, 0.16); border: 1px solid rgba(255, 255, 255, 0.28);
  }
  .genre { color: rgba(255, 255, 255, 0.75); font-weight: 500; margin-bottom: 4px; }
  .hero h2 { margin: 0; font-size: clamp(2.2rem, 7vw, 4.6rem); line-height: 1; font-weight: 800; letter-spacing: -0.04em; }
  .hero-stats {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
    margin: 0; padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.22);
  }
  .hero-stats dt { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255, 255, 255, 0.7); }
  .hero-stats dd { margin: 6px 0 0; font-size: 1.5rem; font-weight: 800; }

  /* Cards */
  .card { background: #fff; border-radius: 28px; padding: 28px 28px 20px; margin-bottom: 20px; }
  .card h3 { margin: 0 0 16px; font-size: 1.8rem; letter-spacing: -0.02em; }
  .label { margin: 0 0 6px; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--purple); }
  .label.lime { color: var(--lime); }
  ul { list-style: none; margin: 0; padding: 0; }

  /* Songs */
  .song { display: flex; align-items: center; gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--line); }
  .song:last-child { border-bottom: 0; }
  .rank { width: 24px; font-size: 0.8rem; font-weight: 700; color: var(--muted); }
  .art { width: 56px; height: 56px; border-radius: 10px; flex-shrink: 0; object-fit: cover; }
  .art.placeholder { background: var(--line); }
  .songbody { flex: 1; min-width: 0; }
  .songname { font-weight: 800; font-size: 1.05rem; }
  .album { color: var(--muted); font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pct { text-align: right; white-space: nowrap; font-size: 0.85rem; color: var(--muted); }
  .pct strong { color: var(--ink); font-size: 1.05rem; font-weight: 800; }
  .pctsub { font-size: 0.75rem; }
  .note { margin: -8px 0 8px; font-size: 0.85rem; color: var(--muted); }
  .play {
    width: 72px; padding: 8px 0; font: inherit; font-size: 0.85rem; font-weight: 700; cursor: pointer;
    background: transparent; color: var(--purple); border: 1.5px solid var(--purple); border-radius: 999px;
  }
  .play-space { width: 72px; }

  /* Cities */
  .card.dark { background: var(--ink); color: #fff; }
  .card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
  .tag {
    max-width: 45%; padding: 8px 14px; border-radius: 999px; font-size: 0.72rem; font-weight: 800;
    letter-spacing: 0.08em; text-transform: uppercase; color: #8d879a; border: 1px solid #3a3446;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .cities li { display: flex; gap: 20px; padding: 14px 0; }
  .crank { width: 20px; color: #6f697c; font-weight: 700; padding-top: 2px; }
  .cbody { flex: 1; min-width: 0; }
  .crow { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
  .cname { font-weight: 800; font-size: 1.05rem; }
  .ccountry { color: #8d879a; font-size: 0.85rem; }
  .ccount { color: #8d879a; font-size: 0.85rem; white-space: nowrap; align-self: flex-end; }
  .ccount strong { color: #fff; font-size: 1rem; }
  .ctrack { height: 6px; background: #2c2736; border-radius: 3px; }
  .cfill { height: 100%; border-radius: 3px; }

  /* Recent shows */
  .shows li { display: flex; justify-content: space-between; gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--line); }
  .shows li:last-child { border-bottom: 0; }
  .shows a { font-weight: 700; text-decoration: none; }
  .shows em { color: var(--muted); font-style: normal; }
  .when { color: var(--muted); white-space: nowrap; }
  .credit { margin: 16px 0 4px; font-size: 0.8rem; color: var(--muted); }

  @media (max-width: 700px) {
    .hero { padding: 24px; border-radius: 24px; }
    .hero-name { flex-direction: column; align-items: flex-start; margin-top: 28px; }
    .hero-stats { grid-template-columns: 1fr 1fr; }
    .card { padding: 22px 18px 14px; border-radius: 22px; }
    .search { flex-direction: column; }
    .song { gap: 12px; }
    .play, .play-space { width: 60px; }
    .shows li { flex-direction: column; gap: 2px; }
  }
`;