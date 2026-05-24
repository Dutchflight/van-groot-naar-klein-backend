# van groot naar klein — backend

Compressie server op basis van FFmpeg. Ontvangt een `.mov` bestand, comprimeert het naar `.mp4` en stuurt het terug.

## Endpoint

POST /upload
- Body: multipart/form-data met veld `file`
- Response: gecomprimeerd .mp4 bestand

## Lokaal draaien

```bash
npm install
node server.js
```

FFmpeg moet lokaal geïnstalleerd zijn.

## Railway deploy

1. Zet deze map als aparte repo op GitHub
2. Koppel aan Railway als nieuwe service
3. Railway installeert FFmpeg automatisch via nixpacks.toml
