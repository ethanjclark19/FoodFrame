# FoodFrame Website Deployment

FoodFrame is now packaged as a deployable website with a Node backend.

## Fastest Path: Render

1. Create a new GitHub repository and upload this project folder.
2. Go to Render and create a new Blueprint or Web Service from the repository.
3. Render will read `render.yaml` and build the Docker image.
4. Add `OPENAI_API_KEY` as a secret environment variable.
5. Deploy.

The public URL Render gives you is the link you can send to other people.

## What The Hosted Site Runs

- Frontend: `index.html`, `styles.css`, `app.js`
- Backend: `server.js`
- Video upload endpoint: `/api/analyze-video`
- TikTok caption endpoint: `/api/tiktok-import`
- Health check: `/api/health`
- FFmpeg: installed in the Docker image for frame extraction

## Environment Variables

- `OPENAI_API_KEY`: required for real AI video-frame analysis
- `OPENAI_MODEL`: optional, defaults to `gpt-4.1-mini`
- `MAX_UPLOAD_MB`: optional upload limit, defaults to `100`
- `PORT`: set by the host automatically

## Local Production Test

Run:

```bash
npm start
```

Then open:

```text
http://localhost:4173/
```
