const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const os = require("os");

const app = express();
const PORT = process.env.PORT || 3001;

// CORS: sta alle origins toe
app.use(cors());

// Tijdelijke uploadmap
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5 GB
});

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "van groot naar klein — compressie server" });
});

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Geen bestand ontvangen" });
  }

  const inputPath = req.file.path;
  const outputPath = path.join(os.tmpdir(), `compressed_${Date.now()}.mp4`);

  console.log(`Bestand ontvangen: ${req.file.originalname} (${req.file.size} bytes)`);
  console.log(`Comprimeren naar: ${outputPath}`);

  ffmpeg(inputPath)
    .outputOptions([
      "-c:v libx264",       // H.264 codec — beste compressie
      "-crf 28",            // Kwaliteit: 0=perfect, 51=klein; 28=goed evenwicht
      "-preset slow",       // Langzamer = kleiner bestand
      "-c:a aac",           // Audio codec
      "-b:a 128k",          // Audio bitrate
      "-movflags faststart", // Snel streamen
      "-vf scale=-2:720",   // Max 720p hoogte, breedte automatisch
    ])
    .output(outputPath)
    .on("start", (cmd) => console.log("FFmpeg gestart:", cmd))
    .on("progress", (p) => console.log(`Voortgang: ${Math.round(p.percent || 0)}%`))
    .on("end", () => {
      console.log("Compressie klaar!");

      const stat = fs.statSync(outputPath);
      console.log(`Outputgrootte: ${stat.size} bytes`);

      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Content-Disposition", `attachment; filename="compressed.mp4"`);
      res.setHeader("Content-Length", stat.size);

      const stream = fs.createReadStream(outputPath);
      stream.pipe(res);

      stream.on("close", () => {
        fs.unlink(inputPath, () => {});
        fs.unlink(outputPath, () => {});
        console.log("Tijdelijke bestanden opgeruimd");
      });
    })
    .on("error", (err) => {
      console.error("FFmpeg fout:", err.message);
      fs.unlink(inputPath, () => {});
      res.status(500).json({ error: "Compressie mislukt: " + err.message });
    })
    .run();
});

app.listen(PORT, () => {
  console.log(`Server draait op poort ${PORT}`);
});
