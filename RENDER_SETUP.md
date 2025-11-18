# Render Setup Anleitung

Diese Anleitung erklärt, wie du den BackWars Server auf Render hostest.

## Voraussetzungen

1. Ein Render.com Account
2. Ein GitHub Repository mit deinem Code (oder GitLab/Bitbucket)

## Setup auf Render

### Option 1: Automatisches Setup mit render.yaml

1. Gehe zu [Render Dashboard](https://dashboard.render.com)
2. Klicke auf "New" → "Blueprint"
3. Verbinde dein Repository
4. Render erkennt automatisch die `render.yaml` Datei

### Option 2: Manuelles Setup

1. Gehe zu [Render Dashboard](https://dashboard.render.com)
2. Klicke auf "New" → "Web Service"
3. Verbinde dein Repository
4. Konfiguriere:
   - **Name**: `backwars-server` (oder ein anderer Name)
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Wähle einen Plan (Free Tier funktioniert für Tests)

## Umgebungsvariablen

Setze folgende Umgebungsvariablen in der Render Dashboard:

### Erforderlich:
- `GAME_ENV`: `prod` (oder `staging` für Pre-Production)
- `NODE_ENV`: `production`

### Optional (je nach Konfiguration):
- `ADMIN_TOKEN`: Dein Admin-Token für API-Zugriff
- `API_KEY`: API-Schlüssel falls benötigt
- Weitere Variablen aus `example.env` je nach Bedarf

**Hinweis**: Render setzt automatisch die `PORT` Umgebungsvariable - diese muss nicht manuell gesetzt werden.

## Wichtige Hinweise

1. **Cloudflare Tunnel**: Wird automatisch deaktiviert auf Render (erkennbar durch `RENDER` Umgebungsvariable)
2. **Port**: Der Server verwendet automatisch die `PORT` Variable von Render
3. **Build**: Der Build-Prozess erstellt die statischen Dateien im `static/` Ordner
4. **Worker-Prozesse**: Die Worker-Prozesse laufen intern auf localhost und kommunizieren mit dem Master-Prozess

## Troubleshooting

### Server startet nicht
- Prüfe die Logs im Render Dashboard
- Stelle sicher, dass `GAME_ENV` gesetzt ist
- Prüfe, ob alle Dependencies installiert werden (`npm install`)

### Port-Fehler
- Render setzt automatisch `PORT` - nicht manuell setzen
- Der Server lauscht auf `0.0.0.0` um externe Verbindungen zu akzeptieren

### Build-Fehler
- Prüfe, ob Node.js Version kompatibel ist (empfohlen: Node 24+)
- Stelle sicher, dass alle Dateien committed sind
- Prüfe die Build-Logs für spezifische Fehler

## Monitoring

- Logs sind im Render Dashboard verfügbar
- Health Checks können über `/api/env` Endpoint konfiguriert werden

