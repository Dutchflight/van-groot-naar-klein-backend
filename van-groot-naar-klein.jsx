import { useState, useRef, useCallback } from "react";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "https://jouw-backend.up.railway.app";

export default function VideoCompressor() {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef();
  const xhrRef = useRef(null);

  const MAX_SIZE = 5 * 1024 * 1024 * 1024;

  const fmt = (b) => {
    if (!b) return "0 B";
    const k = 1024, s = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return (b / Math.pow(k, i)).toFixed(1) + " " + s[i];
  };

  const pick = (f) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".mov")) {
      setErrorMsg("Alleen .mov bestanden zijn toegestaan.");
      setStatus("error");
      return;
    }
    if (f.size > MAX_SIZE) {
      setErrorMsg("Bestand mag maximaal 5 GB zijn.");
      setStatus("error");
      return;
    }
    setFile(f);
    setStatus("idle");
    setErrorMsg("");
    setDownloadUrl(null);
    setProgress(0);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    pick(e.dataTransfer.files[0]);
  }, []);

  const upload = () => {
    if (!file || status === "uploading") return;
    setStatus("uploading");
    setProgress(0);
    setUploadedBytes(0);

    const fd = new FormData();
    fd.append("file", file);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setUploadedBytes(e.loaded);
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const ct = xhr.getResponseHeader("Content-Type") || "";
        if (ct.includes("video/") || ct.includes("octet-stream")) {
          const blob = new Blob([xhr.response], { type: ct });
          setDownloadUrl(URL.createObjectURL(blob));
        } else {
          try {
            const j = JSON.parse(xhr.responseText);
            const u = j.url || j.download_url || j.file;
            setDownloadUrl(u ? (u.startsWith("http") ? u : SERVER_URL + u) : null);
          } catch {
            const t = xhr.responseText.trim();
            setDownloadUrl(t.startsWith("http") ? t : null);
          }
        }
        setStatus("done");
      } else {
        setErrorMsg(`Serverfout ${xhr.status}: ${xhr.statusText}`);
        setStatus("error");
      }
    };

    xhr.onerror = () => {
      setErrorMsg("Verbindingsfout. Controleer of de server bereikbaar is.");
      setStatus("error");
    };

    xhr.onabort = () => { setStatus("idle"); setProgress(0); };
    xhr.responseType = "arraybuffer";
    xhr.open("POST", `${SERVER_URL}/upload`);
    xhr.send(fd);
  };

  const reset = () => {
    setFile(null); setStatus("idle"); setProgress(0);
    setDownloadUrl(null); setErrorMsg(""); setUploadedBytes(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  // Floating blobs background
  const blobs = [
    { w: 420, h: 340, top: "-80px", left: "-100px", bg: "#ffd6e7", delay: "0s" },
    { w: 300, h: 300, top: "60px", right: "-60px", bg: "#c8f0d8", delay: "2s" },
    { w: 260, h: 260, bottom: "40px", left: "10%", bg: "#ffeab0", delay: "1s" },
    { w: 200, h: 200, bottom: "-40px", right: "15%", bg: "#c5dcff", delay: "3s" },
    { w: 160, h: 160, top: "40%", left: "40%", bg: "#e8d5ff", delay: "1.5s" },
  ];

  return (
    <div style={s.page}>
      <style>{`
        @keyframes drift {
          0%   { transform: translate(0, 0) scale(1); }
          33%  { transform: translate(18px, -22px) scale(1.04); }
          66%  { transform: translate(-12px, 14px) scale(0.97); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes fadein {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .card { animation: fadein 0.5s ease both; }
        .upload-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .upload-btn { transition: opacity 0.2s, transform 0.2s; }
        .zone:hover { border-color: #555 !important; }
      `}</style>

      {/* Blobs */}
      {blobs.map((b, i) => (
        <div key={i} style={{
          position: "fixed",
          width: b.w, height: b.h,
          top: b.top, left: b.left, right: b.right, bottom: b.bottom,
          background: b.bg,
          borderRadius: "50%",
          filter: "blur(60px)",
          opacity: 0.7,
          animation: `drift ${14 + i * 3}s ease-in-out infinite`,
          animationDelay: b.delay,
          pointerEvents: "none",
          zIndex: 0,
        }} />
      ))}

      <div className="card" style={s.wrap}>

        {/* Title */}
        <div style={s.titleWrap}>
          <span style={s.titleVan}>van </span>
          <span style={s.titleGroot}>groot</span>
          <br />
          <span style={s.titleNaarKlein}>naar klein</span>
        </div>
        <p style={s.sub}>.mov · max 5 GB</p>

        {/* Drop zone */}
        <div
          className="zone"
          style={{
            ...s.zone,
            ...(dragOver ? s.zoneActive : {}),
            ...(file && status !== "error" ? s.zoneReady : {}),
          }}
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !file && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".mov"
            style={{ display: "none" }}
            onChange={(e) => pick(e.target.files[0])}
          />

          {!file ? (
            <div style={s.zoneInner}>
              <div style={{ fontSize: "36px", marginBottom: "8px", opacity: dragOver ? 1 : 0.4, transition: "opacity 0.2s" }}>↓</div>
              <p style={s.zoneText}>sleep je bestand hierheen</p>
              <p style={s.zoneOr}>
                of{" "}
                <span style={s.zoneLink} onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
                  kies een bestand
                </span>
              </p>
            </div>
          ) : (
            <div style={s.zoneInner}>
              <div style={{ fontSize: "28px", marginBottom: "4px" }}>▶</div>
              <p style={s.fileName}>{file.name}</p>
              <p style={s.fileSize}>{fmt(file.size)}</p>
              {status === "idle" && (
                <button style={s.changeBtn} onClick={(e) => { e.stopPropagation(); reset(); }}>
                  ander bestand kiezen
                </button>
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {status === "error" && (
          <div style={s.error}>
            <span>{errorMsg}</span>
            <button style={s.errorBtn} onClick={reset}>opnieuw</button>
          </div>
        )}

        {/* Progress */}
        {status === "uploading" && (
          <div style={s.progressWrap}>
            <div style={s.progressRow}>
              <span style={s.progressTxt}>bezig met uploaden…</span>
              <span style={s.progressPct}>{progress}%</span>
            </div>
            <div style={s.track}>
              <div style={{ ...s.bar, width: `${progress}%` }} />
            </div>
            <div style={{ ...s.progressRow, marginTop: "6px" }}>
              <span style={s.bytesTxt}>{fmt(uploadedBytes)} verstuurd</span>
              <button style={s.cancelBtn} onClick={() => xhrRef.current?.abort()}>annuleer</button>
            </div>
          </div>
        )}

        {/* Done */}
        {status === "done" && (
          <div style={s.doneBox}>
            <p style={s.doneTxt}>🎉 klaar!</p>
            {downloadUrl
              ? <a href={downloadUrl} download style={s.dlBtn}>download gecomprimeerd bestand ↓</a>
              : <p style={s.noLink}>Server heeft verwerkt — controleer het dashboard voor je bestand.</p>
            }
            <button style={s.againBtn} onClick={reset}>nieuw bestand uploaden</button>
          </div>
        )}

        {/* Upload button */}
        {status === "idle" && file && (
          <button className="upload-btn" style={s.uploadBtn} onClick={upload}>
            comprimeer →
          </button>
        )}
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#f0ece3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Georgia', 'Times New Roman', serif",
    padding: "32px 24px",
    position: "relative",
    overflow: "hidden",
  },
  wrap: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: "500px",
  },
  titleWrap: {
    marginBottom: "10px",
    lineHeight: 1,
  },
  titleVan: {
    fontSize: "clamp(28px, 6vw, 48px)",
    color: "#1a1a1a",
    fontWeight: "400",
    fontStyle: "italic",
  },
  titleGroot: {
    fontSize: "clamp(72px, 18vw, 140px)",
    color: "#1a1a1a",
    fontWeight: "700",
    letterSpacing: "-4px",
    display: "inline-block",
    lineHeight: 0.9,
  },
  titleNaarKlein: {
    fontSize: "clamp(28px, 6vw, 48px)",
    color: "#1a1a1a",
    fontWeight: "400",
    display: "block",
    marginTop: "4px",
    letterSpacing: "-0.5px",
  },
  sub: {
    fontSize: "12px",
    color: "#999",
    letterSpacing: "2px",
    margin: "14px 0 28px",
    fontFamily: "'Courier New', monospace",
    textTransform: "uppercase",
  },
  zone: {
    border: "1.5px dashed #bbb",
    borderRadius: "6px",
    padding: "44px 24px",
    textAlign: "center",
    cursor: "pointer",
    transition: "border-color 0.2s",
    background: "rgba(255,255,255,0.55)",
    backdropFilter: "blur(12px)",
    marginBottom: "16px",
  },
  zoneActive: {
    borderColor: "#1a1a1a",
    background: "rgba(255,255,255,0.75)",
  },
  zoneReady: {
    borderStyle: "solid",
    borderColor: "#1a1a1a",
    cursor: "default",
  },
  zoneInner: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
  },
  zoneText: {
    color: "#444",
    fontSize: "15px",
    margin: 0,
  },
  zoneOr: {
    color: "#aaa",
    fontSize: "13px",
    margin: 0,
    fontFamily: "'Courier New', monospace",
  },
  zoneLink: {
    color: "#1a1a1a",
    textDecoration: "underline",
    cursor: "pointer",
  },
  fileName: {
    color: "#1a1a1a",
    fontSize: "14px",
    margin: 0,
    wordBreak: "break-all",
    maxWidth: "340px",
  },
  fileSize: {
    color: "#888",
    fontSize: "13px",
    margin: 0,
    fontFamily: "'Courier New', monospace",
  },
  changeBtn: {
    background: "none",
    border: "none",
    color: "#aaa",
    fontSize: "12px",
    cursor: "pointer",
    textDecoration: "underline",
    padding: "4px 0",
    fontFamily: "inherit",
    marginTop: "6px",
  },
  uploadBtn: {
    width: "100%",
    background: "#1a1a1a",
    color: "#f0ece3",
    border: "none",
    borderRadius: "6px",
    padding: "17px",
    fontSize: "16px",
    fontFamily: "'Courier New', monospace",
    letterSpacing: "1px",
    cursor: "pointer",
  },
  error: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "#b91c1c",
    fontSize: "13px",
    fontFamily: "'Courier New', monospace",
    marginBottom: "14px",
    padding: "12px 14px",
    background: "rgba(254,242,242,0.8)",
    borderRadius: "6px",
    border: "1px solid #fecaca",
    gap: "12px",
  },
  errorBtn: {
    background: "none",
    border: "1px solid #b91c1c",
    color: "#b91c1c",
    borderRadius: "4px",
    padding: "4px 10px",
    fontSize: "12px",
    cursor: "pointer",
    fontFamily: "inherit",
    flexShrink: 0,
  },
  progressWrap: { marginBottom: "16px" },
  progressRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  progressTxt: { color: "#555", fontSize: "13px", fontFamily: "'Courier New', monospace" },
  progressPct: { color: "#1a1a1a", fontSize: "14px", fontWeight: "bold", fontFamily: "'Courier New', monospace" },
  bytesTxt: { color: "#aaa", fontSize: "12px", fontFamily: "'Courier New', monospace" },
  cancelBtn: {
    background: "none", border: "none", color: "#aaa",
    fontSize: "12px", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit",
  },
  track: {
    height: "3px",
    background: "rgba(0,0,0,0.1)",
    borderRadius: "2px",
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    background: "#1a1a1a",
    borderRadius: "2px",
    transition: "width 0.15s ease",
  },
  doneBox: {
    textAlign: "center",
    padding: "28px 24px",
    background: "rgba(255,255,255,0.65)",
    backdropFilter: "blur(12px)",
    border: "1.5px solid #1a1a1a",
    borderRadius: "6px",
  },
  doneTxt: {
    fontSize: "24px",
    color: "#1a1a1a",
    margin: "0 0 16px",
  },
  dlBtn: {
    display: "block",
    background: "#1a1a1a",
    color: "#f0ece3",
    textDecoration: "none",
    padding: "15px",
    borderRadius: "6px",
    fontSize: "14px",
    fontFamily: "'Courier New', monospace",
    letterSpacing: "0.5px",
    marginBottom: "14px",
  },
  noLink: {
    color: "#888",
    fontSize: "13px",
    fontFamily: "'Courier New', monospace",
    marginBottom: "12px",
  },
  againBtn: {
    background: "none",
    border: "none",
    color: "#aaa",
    fontSize: "13px",
    cursor: "pointer",
    textDecoration: "underline",
    fontFamily: "inherit",
  },
};
