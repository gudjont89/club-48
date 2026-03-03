import { useState, useEffect, useMemo } from "react";

// All teams in the top 4 divisions of Icelandic football (2025 season basis)
// with their home ground, location, and approximate coordinates for the map
const TEAMS_DATA = [
  // === BESTA DEILD (Tier 1) ===
  { id: "vikingur-r", name: "Víkingur Reykjavík", ground: "Víkingsvöllur", location: "Reykjavík", division: 1, lat: 64.1355, lng: -21.8954 },
  { id: "breidablik", name: "Breiðablik", ground: "Kópavogsvöllur", location: "Kópavogur", division: 1, lat: 64.1048, lng: -21.8828 },
  { id: "valur", name: "Valur", ground: "Vodafonevöllurinn", location: "Reykjavík", division: 1, lat: 64.1280, lng: -21.8750 },
  { id: "stjarnan", name: "Stjarnan", ground: "Samsung völlurinn", location: "Garðabær", division: 1, lat: 64.0870, lng: -21.9220 },
  { id: "fh", name: "FH Hafnarfjörður", ground: "Kaplakriki", location: "Hafnarfjörður", division: 1, lat: 64.0660, lng: -21.9560 },
  { id: "kr", name: "KR Reykjavík", ground: "KR-völlur", location: "Reykjavík", division: 1, lat: 64.1420, lng: -21.8720 },
  { id: "fram", name: "Fram Reykjavík", ground: "Laugardalsvöllur", location: "Reykjavík", division: 1, lat: 64.1445, lng: -21.8730 },
  { id: "ia", name: "ÍA Akranes", ground: "Þórólfsvöllur", location: "Akranes", division: 1, lat: 64.3210, lng: -22.0750 },
  { id: "ibv", name: "ÍBV", ground: "Hásteinsvöllur", location: "Vestmannaeyjar", division: 1, lat: 63.4400, lng: -20.2700 },
  { id: "ka", name: "KA Akureyri", ground: "Akureyrarvöllur", location: "Akureyri", division: 1, lat: 65.6835, lng: -18.0878 },
  { id: "vestri", name: "Vestri", ground: "Torfnesvöllur", location: "Ísafjörður", division: 1, lat: 66.0700, lng: -23.1250 },
  { id: "afturelding", name: "Afturelding", ground: "Mosfellsvöllur", location: "Mosfellsbær", division: 1, lat: 64.1668, lng: -21.6970 },

  // === 1. DEILD (Tier 2) ===
  { id: "thor", name: "Þór Akureyri", ground: "Þórsárvöllur", location: "Akureyri", division: 2, lat: 65.6700, lng: -18.1050 },
  { id: "fylkir", name: "Fylkir", ground: "Fylkisvöllur", location: "Reykjavík", division: 2, lat: 64.1100, lng: -21.8300 },
  { id: "hk", name: "HK Kópavogur", ground: "Kópavogsvöllur", location: "Kópavogur", division: 2, lat: 64.1048, lng: -21.8828, sharedWith: "breidablik" },
  { id: "keflavik", name: "Keflavík", ground: "Nettóvöllurinn", location: "Keflavík", division: 2, lat: 64.0040, lng: -22.5580 },
  { id: "grindavik", name: "Grindavík", ground: "Grindavíkurvöllur", location: "Grindavík", division: 2, lat: 63.8420, lng: -22.4340 },
  { id: "leiknir-r", name: "Leiknir Reykjavík", ground: "Ásvallalaug", location: "Reykjavík", division: 2, lat: 64.1350, lng: -21.8510 },
  { id: "throttur-r", name: "Þróttur Reykjavík", ground: "Þrótturvöllurinn", location: "Reykjavík", division: 2, lat: 64.1300, lng: -21.8600 },
  { id: "selfoss", name: "Selfoss", ground: "Selfossvöllur", location: "Selfoss", division: 2, lat: 63.9360, lng: -20.9970 },
  { id: "volsungur", name: "Völsungur", ground: "Húsavíkurvöllur", location: "Húsavík", division: 2, lat: 66.0450, lng: -17.3380 },
  { id: "njarðvik", name: "Njarðvík", ground: "Njarðvíkurvöllur", location: "Njarðvík", division: 2, lat: 63.9770, lng: -22.6680 },
  { id: "ir", name: "ÍR Reykjavík", ground: "Álftanesvöllur", location: "Álftanes", division: 2, lat: 64.1000, lng: -21.9800 },
  { id: "fjolnir", name: "Fjölnir", ground: "Fjölnisvöllur", location: "Reykjavík", division: 2, lat: 64.1250, lng: -21.8200 },

  // === 2. DEILD (Tier 3) ===
  { id: "grótta", name: "Grótta", ground: "Seltjarnarnesvöllur", location: "Seltjarnarnes", division: 3, lat: 64.1540, lng: -21.9960 },
  { id: "dalvik-reynir", name: "Dalvík/Reynir", ground: "Dalvíkurvöllur", location: "Dalvík", division: 3, lat: 65.9710, lng: -18.5250 },
  { id: "kfg", name: "KFG Garðabær", ground: "Linnetsvöllur", location: "Garðabær", division: 3, lat: 64.0880, lng: -21.9320 },
  { id: "haukar", name: "Haukar", ground: "Ásvallalaug", location: "Hafnarfjörður", division: 3, lat: 64.0680, lng: -21.9500 },
  { id: "throttur-v", name: "Þróttur Vogar", ground: "Vogavöllur", location: "Vogar", division: 3, lat: 63.9810, lng: -22.3770 },
  { id: "kormakur", name: "Kormákur/Hvöt", ground: "Kornavöllur", location: "Reykjavík", division: 3, lat: 64.1200, lng: -21.8100 },
  { id: "vikingur-o", name: "Víkingur Ólafsvík", ground: "Ólafsvíkurvöllur", location: "Ólafsvík", division: 3, lat: 64.8940, lng: -23.7140 },
  { id: "kari", name: "Kári", ground: "Kópavogsvöllur", location: "Kópavogur", division: 3, lat: 64.1048, lng: -21.8828, sharedWith: "breidablik" },
  { id: "kfa", name: "KFA Austfjarða", ground: "Eskifjarðarvöllur", location: "Eskifjörður", division: 3, lat: 65.0730, lng: -14.0150 },
  { id: "vidir", name: "Víðir", ground: "Víðisvöllur", location: "Garður", division: 3, lat: 64.0620, lng: -22.6870 },
  { id: "aegir", name: "Ægir", ground: "Ægisvöllur", location: "Reyðarfjörður", division: 3, lat: 65.0330, lng: -14.2040 },
  { id: "huginn", name: "Huginn", ground: "Huginnsvöllur", location: "Seyðisfjörður", division: 3, lat: 65.2590, lng: -14.0060 },

  // === 3. DEILD (Tier 4) ===
  { id: "hviti-riddarinn", name: "Hvíti Riddarinn", ground: "HR-völlur", location: "Kópavogur", division: 4, lat: 64.1020, lng: -21.8750 },
  { id: "magni", name: "Magni", ground: "Grenivíkurvöllur", location: "Grenivík", division: 4, lat: 65.9470, lng: -18.1750 },
  { id: "leiknir-f", name: "Leiknir Fáskrúðsf.", ground: "Leiknisv. Fáskrúðsf.", location: "Fáskrúðsfjörður", division: 4, lat: 65.0310, lng: -13.8680 },
  { id: "tindastoll", name: "Tindastóll", ground: "Tindastólsvöllur", location: "Sauðárkrókur", division: 4, lat: 65.7460, lng: -19.6390 },
  { id: "reynir-s", name: "Reynir Sandgerði", ground: "Sandgerðisvöllur", location: "Sandgerði", division: 4, lat: 64.0370, lng: -22.7100 },
  { id: "kf", name: "KF Fjallabyggð", ground: "Ólafsfjarðarvöllur", location: "Ólafsfjörður", division: 4, lat: 66.0730, lng: -18.6560 },
  { id: "augnablik", name: "Augnablik", ground: "Augnabliksvöllur", location: "Kópavogur", division: 4, lat: 64.1000, lng: -21.8680 },
  { id: "grundarfjordur", name: "Grundarfjörður", ground: "Grundarfj.völlur", location: "Grundarfjörður", division: 4, lat: 64.9260, lng: -23.2580 },
  { id: "ih", name: "ÍH Hafnarfjörður", ground: "ÍH-völlur", location: "Hafnarfjörður", division: 4, lat: 64.0650, lng: -21.9620 },
  { id: "kfk", name: "KFK Kópavogur", ground: "KFK-völlur", location: "Kópavogur", division: 4, lat: 64.1060, lng: -21.8900 },
  { id: "arborg", name: "Árborg", ground: "Árborgsvöllur", location: "Selfoss", division: 4, lat: 63.9340, lng: -21.0020, sharedWith: "selfoss" },
  { id: "snæfellsnes", name: "Snæfellsnes/ÍF", ground: "Stykkishólmsvöllur", location: "Stykkishólmur", division: 4, lat: 65.0750, lng: -22.7300 },
];

const DIVISION_NAMES = {
  1: "Besta deild",
  2: "1. deild",
  3: "2. deild",
  4: "3. deild",
};

const DIVISION_COLORS = {
  1: { bg: "#1a3a5c", text: "#e8f0fe", accent: "#4da6ff" },
  2: { bg: "#2d4a3e", text: "#e0f5ec", accent: "#5ed4a5" },
  3: { bg: "#4a3b2d", text: "#f5ece0", accent: "#d4a65e" },
  4: { bg: "#4a2d3b", text: "#f5e0ec", accent: "#d45e8a" },
};

const STORAGE_KEY = "48club-visited";

export default function FortyEightClub() {
  const [visited, setVisited] = useState({});
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [sortBy, setSortBy] = useState("division");
  const [loading, setLoading] = useState(true);

  // Load from persistent storage
  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get(STORAGE_KEY);
        if (result && result.value) {
          setVisited(JSON.parse(result.value));
        }
      } catch (e) {
        // Key doesn't exist yet, start fresh
      }
      setLoading(false);
    })();
  }, []);

  // Save to persistent storage
  useEffect(() => {
    if (!loading) {
      (async () => {
        try {
          await window.storage.set(STORAGE_KEY, JSON.stringify(visited));
        } catch (e) {
          console.error("Failed to save:", e);
        }
      })();
    }
  }, [visited, loading]);

  const toggleVisited = (teamId) => {
    setVisited((prev) => {
      const next = { ...prev };
      if (next[teamId]) {
        delete next[teamId];
      } else {
        next[teamId] = { date: new Date().toISOString().split("T")[0] };
      }
      return next;
    });
  };

  const setVisitDate = (teamId, date) => {
    setVisited((prev) => ({
      ...prev,
      [teamId]: { ...prev[teamId], date },
    }));
  };

  const stats = useMemo(() => {
    const total = TEAMS_DATA.length;
    const done = Object.keys(visited).length;
    const byDiv = {};
    for (const d of [1, 2, 3, 4]) {
      const divTeams = TEAMS_DATA.filter((t) => t.division === d);
      const divDone = divTeams.filter((t) => visited[t.id]).length;
      byDiv[d] = { total: divTeams.length, done: divDone };
    }
    return { total, done, byDiv };
  }, [visited]);

  const filteredTeams = useMemo(() => {
    let teams = [...TEAMS_DATA];
    if (filter === "visited") teams = teams.filter((t) => visited[t.id]);
    if (filter === "remaining") teams = teams.filter((t) => !visited[t.id]);
    if (filter !== "all" && !isNaN(filter))
      teams = teams.filter((t) => t.division === Number(filter));
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      teams = teams.filter(
        (t) =>
          t.name.toLowerCase().includes(s) ||
          t.ground.toLowerCase().includes(s) ||
          t.location.toLowerCase().includes(s)
      );
    }
    if (sortBy === "name") teams.sort((a, b) => a.name.localeCompare(b.name, "is"));
    if (sortBy === "location") teams.sort((a, b) => a.location.localeCompare(b.location, "is"));
    if (sortBy === "division") teams.sort((a, b) => a.division - b.division || a.name.localeCompare(b.name, "is"));
    return teams;
  }, [filter, searchTerm, visited, sortBy]);

  const percentage = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  const resetAll = () => {
    if (confirm("Ertu viss? Þetta eyðir öllum gögnum. / Are you sure? This will erase all data.")) {
      setVisited({});
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0a0f1a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans', sans-serif",
        color: "#c8d6e5",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚽</div>
          <div style={{ fontSize: 18, letterSpacing: 2 }}>LOADING...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0f1a",
      fontFamily: "'DM Sans', sans-serif",
      color: "#c8d6e5",
      position: "relative",
      overflow: "hidden",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@700;900&display=swap" rel="stylesheet" />

      {/* Subtle background texture */}
      <div style={{
        position: "fixed", inset: 0, opacity: 0.04, pointerEvents: "none", zIndex: 0,
        backgroundImage: `radial-gradient(circle at 20% 50%, #4da6ff 0%, transparent 50%),
                          radial-gradient(circle at 80% 20%, #5ed4a5 0%, transparent 50%)`,
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 960, margin: "0 auto", padding: "24px 16px 80px" }}>

        {/* HEADER */}
        <header style={{ textAlign: "center", marginBottom: 32, paddingTop: 16 }}>
          <div style={{
            display: "inline-block",
            padding: "6px 20px",
            border: "1px solid rgba(77,166,255,0.3)",
            borderRadius: 100,
            fontSize: 11,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "#4da6ff",
            marginBottom: 16,
          }}>
            Íslenski Knattspyrnuklúbburinn
          </div>

          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(48px, 10vw, 80px)",
            fontWeight: 900,
            margin: 0,
            lineHeight: 0.95,
            background: "linear-gradient(135deg, #e8f0fe 0%, #4da6ff 50%, #5ed4a5 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            48
          </h1>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(18px, 4vw, 28px)",
            fontWeight: 700,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#8899aa",
            marginTop: -4,
          }}>
            KLÚBBURINN
          </div>

          <p style={{
            marginTop: 16, fontSize: 14, color: "#5a6b7d", maxWidth: 500, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6,
          }}>
            Track your journey to see a match involving every team in Iceland's top four divisions, at their permanent home ground.
          </p>
        </header>

        {/* INFO BANNER */}
        {showInfo && (
          <div style={{
            background: "rgba(77,166,255,0.08)",
            border: "1px solid rgba(77,166,255,0.15)",
            borderRadius: 12,
            padding: "16px 20px",
            marginBottom: 24,
            position: "relative",
            fontSize: 13,
            lineHeight: 1.7,
            color: "#8899aa",
          }}>
            <button onClick={() => setShowInfo(false)} style={{
              position: "absolute", top: 8, right: 12, background: "none", border: "none",
              color: "#5a6b7d", cursor: "pointer", fontSize: 18,
            }}>×</button>
            <strong style={{ color: "#4da6ff" }}>How it works:</strong> The 48 Club is inspired by England's 92 Club. You must attend a match at each team's home ground—and since some teams share a ground (like Breiðablik, HK, and Kári at Kópavogsvöllur), you need to tick off each <em>team</em>, not just each venue. Tap a team card to mark it visited. Your progress saves automatically.
          </div>
        )}

        {/* PROGRESS RING */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
          marginBottom: 32,
          flexWrap: "wrap",
        }}>
          <div style={{ position: "relative", width: 140, height: 140, flexShrink: 0 }}>
            <svg viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
              <circle cx="70" cy="70" r="60" fill="none" stroke="url(#grad)" strokeWidth="10"
                strokeDasharray={`${(percentage / 100) * 377} 377`}
                strokeLinecap="round"
                style={{ transition: "stroke-dasharray 0.6s ease" }}
              />
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4da6ff" />
                  <stop offset="100%" stopColor="#5ed4a5" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{
              position: "absolute", inset: 0, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
            }}>
              <span style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 36, fontWeight: 900, color: "#e8f0fe",
              }}>
                {stats.done}
              </span>
              <span style={{ fontSize: 11, color: "#5a6b7d", letterSpacing: 1 }}>
                / {stats.total}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1, 2, 3, 4].map((d) => {
              const s = stats.byDiv[d];
              const pct = s.total > 0 ? (s.done / s.total) * 100 : 0;
              const col = DIVISION_COLORS[d];
              return (
                <div key={d} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    fontSize: 11, color: col.accent, width: 72, textAlign: "right",
                    fontWeight: 700, letterSpacing: 0.5,
                  }}>
                    {DIVISION_NAMES[d]}
                  </span>
                  <div style={{
                    width: 120, height: 6, background: "rgba(255,255,255,0.06)",
                    borderRadius: 3, overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%", width: `${pct}%`,
                      background: col.accent, borderRadius: 3,
                      transition: "width 0.4s ease",
                    }} />
                  </div>
                  <span style={{ fontSize: 11, color: "#5a6b7d", width: 40 }}>
                    {s.done}/{s.total}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CONTROLS */}
        <div style={{
          display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center",
        }}>
          <input
            type="text"
            placeholder="Search teams, grounds, towns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: "1 1 200px", padding: "10px 14px", borderRadius: 8,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              color: "#e8f0fe", fontSize: 14, outline: "none",
              fontFamily: "'DM Sans', sans-serif",
            }}
          />
        </div>

        <div style={{
          display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap", alignItems: "center",
        }}>
          {[
            { val: "all", label: "All" },
            { val: "visited", label: `✓ Visited (${stats.done})` },
            { val: "remaining", label: `○ Remaining (${stats.total - stats.done})` },
            { val: "1", label: "Besta" },
            { val: "2", label: "1. deild" },
            { val: "3", label: "2. deild" },
            { val: "4", label: "3. deild" },
          ].map(({ val, label }) => (
            <button key={val} onClick={() => setFilter(val)} style={{
              padding: "6px 14px", borderRadius: 100, fontSize: 12, fontWeight: 600,
              border: filter === val ? "1px solid rgba(77,166,255,0.5)" : "1px solid rgba(255,255,255,0.08)",
              background: filter === val ? "rgba(77,166,255,0.15)" : "rgba(255,255,255,0.03)",
              color: filter === val ? "#4da6ff" : "#5a6b7d",
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.2s",
            }}>
              {label}
            </button>
          ))}

          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{
              padding: "6px 10px", borderRadius: 8, fontSize: 12,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              color: "#8899aa", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}>
              <option value="division">Sort: Division</option>
              <option value="name">Sort: Name</option>
              <option value="location">Sort: Location</option>
            </select>
            <button onClick={resetAll} style={{
              padding: "6px 12px", borderRadius: 8, fontSize: 11,
              background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.15)",
              color: "#ff5050", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}>
              Reset
            </button>
          </div>
        </div>

        {/* COMPLETION BANNER */}
        {stats.done === stats.total && (
          <div style={{
            background: "linear-gradient(135deg, rgba(77,166,255,0.15), rgba(94,212,165,0.15))",
            border: "1px solid rgba(94,212,165,0.3)",
            borderRadius: 16, padding: 32, textAlign: "center", marginBottom: 32,
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
            <h2 style={{
              fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 900,
              color: "#5ed4a5", margin: 0,
            }}>
              Velkomin í 48 Klúbbinn!
            </h2>
            <p style={{ color: "#8899aa", fontSize: 14, margin: "8px 0 0" }}>
              You've completed all {stats.total} grounds. Legendary.
            </p>
          </div>
        )}

        {/* TEAM CARDS */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 12,
        }}>
          {filteredTeams.map((team) => {
            const isVisited = !!visited[team.id];
            const col = DIVISION_COLORS[team.division];
            return (
              <div
                key={team.id}
                onClick={() => toggleVisited(team.id)}
                style={{
                  position: "relative",
                  background: isVisited
                    ? `linear-gradient(135deg, ${col.bg}cc, ${col.bg}88)`
                    : "rgba(255,255,255,0.02)",
                  border: `1px solid ${isVisited ? col.accent + "40" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 12,
                  padding: "16px 18px",
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                  overflow: "hidden",
                  userSelect: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.borderColor = col.accent + "60";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = isVisited ? col.accent + "40" : "rgba(255,255,255,0.06)";
                }}
              >
                {/* Division tag */}
                <div style={{
                  position: "absolute", top: 12, right: 14,
                  fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase",
                  color: col.accent, opacity: 0.7,
                }}>
                  {DIVISION_NAMES[team.division]}
                </div>

                {/* Checkmark */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    border: `2px solid ${isVisited ? col.accent : "rgba(255,255,255,0.12)"}`,
                    background: isVisited ? col.accent + "20" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.2s",
                    fontSize: 14, color: col.accent,
                  }}>
                    {isVisited && "✓"}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 15, fontWeight: 700,
                      color: isVisited ? "#e8f0fe" : "#8899aa",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {team.name}
                    </div>
                    <div style={{ fontSize: 12, color: "#5a6b7d", marginTop: 2 }}>
                      {team.ground} · {team.location}
                    </div>
                  </div>
                </div>

                {/* Shared ground note */}
                {team.sharedWith && (
                  <div style={{
                    marginTop: 8, fontSize: 10, color: "#d4a65e", opacity: 0.8,
                    fontStyle: "italic", paddingLeft: 40,
                  }}>
                    ⚠ Shared ground — visit counts separately
                  </div>
                )}

                {/* Visit date */}
                {isVisited && (
                  <div style={{ marginTop: 8, paddingLeft: 40 }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="date"
                      value={visited[team.id]?.date || ""}
                      onChange={(e) => setVisitDate(team.id, e.target.value)}
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 6, padding: "3px 8px",
                        color: "#8899aa", fontSize: 11,
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredTeams.length === 0 && (
          <div style={{
            textAlign: "center", padding: 48, color: "#5a6b7d", fontSize: 14,
          }}>
            No teams match your search.
          </div>
        )}

        {/* FOOTER */}
        <footer style={{
          marginTop: 48, textAlign: "center", fontSize: 11, color: "#3a4b5d",
          borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 24,
          lineHeight: 1.8,
        }}>
          <div>48 Klúbburinn — Inspired by the 92 Club</div>
          <div>All four tiers of Icelandic men's football: Besta deild · 1. deild · 2. deild · 3. deild</div>
          <div style={{ marginTop: 8, color: "#2a3b4d" }}>
            Team data based on the 2025 season. Teams move between divisions each year through promotion and relegation.
          </div>
        </footer>
      </div>
    </div>
  );
}
