const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const os = require("os");

const app = express();
const PORT = process.env.PORT || 3001;

// CORS: sta alle origins expliciet toe
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Preflight requests afhandelen
app.options("*", cors());

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
      "-c:v libx264",
      "-crf 28",
      "-preset slow",
      "-c:a aac",
      "-b:a 128k",
      "-movflags faststart",
      "-vf scale=-2:720",
    ])
    .output(outputPath)
    .on("start", (cmd) => console.log("FFmpeg gestart:", cmd))
    .on("progress", (p) => console.log(`Voortgang: ${Math.round(p.percent || 0)}%`))
    .on("end", () => {
      console.log("Compressie klaar!");
      const stat = fs.statSync(outputPath);
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Content-Disposition", `attachment; filename="compressed.mp4"`);
      res.setHeader("Content-Length", stat.size);
      res.setHeader("Access-Control-Allow-Origin", "*");

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
