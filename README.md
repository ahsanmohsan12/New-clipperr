# ClipForge AI — AI Video-to-Shorts Platform

ClipForge AI turns long-form videos into ready-to-post vertical `1080×1920` (9:16) Shorts using a real FFmpeg video/audio rendering pipeline and Google Gemini AI (`gemini-3.5-transcribe` & `gemini-4-hydrogen`).

Local development runs with **minimal dependencies**: SQLite (`./storage/clipforge.db`) and local disk storage (`./storage/`) are enabled automatically with zero cloud database, S3 bucket, or external media-downloader setup required.

## Core 3-Step Workflow

1. **Video Input (`Studio`)**: Upload an MP4/MOV/WebM/MKV file, paste a direct `.mp4` URL, or select a built-in sample.
2. **Automatic AI Processing (`Active Generation Flow`)**:
   - **Stage 1**: FFprobe metadata + audio extraction + FFmpeg scene detection + Gemini speech transcription (`gemini-3.5-transcribe`, fallback `gemini-4-hydrogen`).
   - **Stage 2**: Viral hook & storytelling moment detection (`gemini-4-hydrogen` structured JSON).
   - **Stage 3**: Automatic 9:16 vertical reframing around active subjects.
   - **Stage 4**: Synchronized animated ASS captions (`Dynamic Pop`, `Karaoke Fill`, `Word Highlighter`, `Bold Punch`, `Clean Minimal`, `Keyword Focus`).
   - **Stage 5**: Sound design mixing (whoosh/impact/pop SFX + speech-ducked background music via FFmpeg `sidechaincompress`).
   - **Stage 6**: Final `1080×1920` H.264 + AAC MP4 rendering.
3. **Results, Optional Editor & Downloads**: Preview rendered MP4s in-browser, tweak trim/captions/crop/audio mix and re-render, download individual MP4s, or batch-download all Shorts as a `.ZIP`.

---

## Minimal Local Setup

### 1. Required System Dependencies
- **Node.js 22+**
- **`ffmpeg` and `ffprobe`** on `PATH` (compiled with `libass`, `libx264`, `aac`, and system fonts like Noto Sans or DejaVu Sans):
  - **Ubuntu / Debian**: `sudo apt-get update && sudo apt-get install -y ffmpeg fonts-noto-core fonts-dejavu-core`
  - **macOS (Homebrew)**: `brew install ffmpeg`
  - **Windows (winget)**: `winget install Gyan.FFmpeg`

### 2. Required External Service (`GEMINI_API_KEY`)
Only one external credential is needed for the AI pipeline (Stage 1 transcription + Stage 2 viral moment detection):
1. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey).
2. Add it to `.env` (or AI Studio Secrets):
   ```bash
   cp .env.example .env
   # Set GEMINI_API_KEY=<your-real-key>
   ```
   *(The server still starts cleanly even if `GEMINI_API_KEY` is omitted; it is only validated when an AI processing job is executed.)*

### 3. Install & Start Locally
```bash
npm install
npm run dev
```
Open `http://localhost:3000`.

- **Database**: Uses local SQLite automatically at `./storage/clipforge.db` (zero configuration).
- **Media Storage**: Stores uploads, thumbnails, samples, and rendered MP4 Shorts automatically under `./storage/` (zero configuration).

---

## Optional External Services (Not Required for Local Dev)

Application startup **never blocks** when these optional variables are unset:

| Variable | Purpose | Local Default When Unset | Setup If Needed |
| --- | --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string for multi-instance production deployments | Local SQLite (`./storage/clipforge.db`) | Provision PostgreSQL 16+, apply `db/schema.sql`, and pass `DATABASE_URL=postgresql://user:pass@host:5432/clipforge`. |
| `S3_BUCKET` & `S3_ENDPOINT` | S3-compatible object storage (AWS S3, Cloudflare R2, MinIO) for shared cloud media archival | Local filesystem (`./storage/`) | Create a bucket in S3/R2/MinIO and configure `S3_BUCKET` and `S3_ENDPOINT` when integrating shared object storage. |
| `MEDIA_INGEST` / `MEDIA_INGEST_CMD` | Authorized downloader binary (e.g. `yt-dlp`) for third-party streaming URLs (YouTube/TikTok/Twitch) | Direct MP4 uploads, direct `.mp4` URLs, and sample videos work out of the box; platform URLs show oEmbed metadata and prompt for upload | Install `yt-dlp` (`pipx install yt-dlp` or `brew install yt-dlp`) and optionally set `MEDIA_INGEST=yt-dlp` (only for content you are authorized to download). |

---

## Production & Docker

```bash
npm run build
npm start
```

Or using Docker Compose (bundles Node 22, FFmpeg, Noto/DejaVu fonts, and optional PostgreSQL):

```bash
docker compose up --build
```

## API Endpoints

- `GET /api/health` — Server status and active storage/database/ingest capability flags
- `POST /api/projects/inspect` — URL validation and metadata extraction
- `POST /api/projects` — Create project from URL or sample
- `POST /api/projects/upload` — Direct video file upload + FFprobe metadata extraction
- `POST /api/projects/:id/process` — Launch 6-stage background processing pipeline
- `GET /api/projects/:id/status` — Poll current job & stage status
- `GET /api/projects/:id/events` — Server-Sent Events (SSE) live progress stream
- `POST /api/projects/:id/cancel` — Cancel active job
- `GET /api/projects/:id/clips` — Fetch generated Shorts
- `GET /api/clips/:id` — Fetch single Short details & subtitle segments
- `GET /api/clips/:id/stream` — HTTP Range MP4 stream for HTML5 preview
- `GET /api/clips/:id/download` — Direct MP4 attachment download
- `GET /api/projects/:id/download-all` — Batch ZIP archive download
- `POST /api/clips/:id/regenerate` — Re-render clip with optional editor customizations
