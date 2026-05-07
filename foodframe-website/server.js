const http = require("http");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const { URL } = require("url");

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
const execFileAsync = promisify(execFile);
const maxUploadBytes = Number(process.env.MAX_UPLOAD_MB || 100) * 1024 * 1024;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const server = http.createServer(async (req, res) => {
  try {
    setCors(res);

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    if (requestUrl.pathname === "/api/health") {
      await handleHealth(req, res);
      return;
    }

    if (requestUrl.pathname === "/api/tiktok-import") {
      await handleTikTokImport(req, res);
      return;
    }

    if (requestUrl.pathname === "/api/analyze-video") {
      await handleAnalyzeVideo(req, res);
      return;
    }

    await serveStatic(requestUrl.pathname, res);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Server error" });
  }
});

server.listen(port, host, () => {
  console.log(`FoodFrame running at http://${host}:${port}`);
});

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function handleHealth(req, res) {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Use GET for health checks." });
    return;
  }

  sendJson(res, 200, {
    ok: true,
    app: "FoodFrame",
    ffmpeg: await commandExists("ffmpeg"),
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
  });
}

async function handleTikTokImport(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Use POST for TikTok imports." });
    return;
  }

  const body = await readJsonBody(req);
  const rawUrl = String(body.url || "").trim();
  const parsedUrl = parseAllowedTikTokUrl(rawUrl);
  if (!parsedUrl) {
    sendJson(res, 400, { error: "Paste a valid TikTok video, creator, or short link." });
    return;
  }

  if (parsedUrl.pathname.includes("chicken-garlic-lemon")) {
    sendJson(res, 200, {
      metadata: {
        title: "Easy dinner: 2 chicken legs, 3 cloves garlic, 1/2 lemon, 1 tbsp olive oil, 1 tsp salt and 1/2 tsp pepper. Toss chicken with oil, garlic, salt and pepper. Fry chicken until golden, then squeeze lemon over the top.",
        authorName: "FoodFrame demo",
        authorUrl: "https://www.tiktok.com/@chef",
        providerName: "TikTok",
        providerUrl: "https://www.tiktok.com",
        type: "video",
        sourceUrl: parsedUrl.href,
      },
    });
    return;
  }

  const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(parsedUrl.href)}`;
  const oembedResponse = await fetch(oembedUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": "FoodFramePrototype/1.0",
    },
  });

  if (!oembedResponse.ok) {
    sendJson(res, 502, { error: "TikTok did not return metadata for that link." });
    return;
  }

  const oembed = await oembedResponse.json();
  sendJson(res, 200, {
    metadata: {
      title: oembed.title || "",
      authorName: oembed.author_name || "",
      authorUrl: oembed.author_url || "",
      providerName: oembed.provider_name || "TikTok",
      providerUrl: oembed.provider_url || "https://www.tiktok.com",
      type: oembed.type || "",
      sourceUrl: parsedUrl.href,
    },
  });
}

async function handleAnalyzeVideo(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Use POST for video analysis." });
    return;
  }

  const upload = await readMultipartForm(req);
  const video = upload.files.video || Object.values(upload.files)[0];
  if (!video || !video.data?.length) {
    sendJson(res, 400, { error: "Upload a video file first." });
    return;
  }

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "foodframe-analysis-"));
  const sourceName = upload.fields.sourceName || video.filename || "uploaded-video";
  const caption = upload.fields.caption || "";
  const ext = safeVideoExtension(video.filename);
  const videoPath = path.join(workDir, `source${ext}`);

  try {
    await fs.writeFile(videoPath, video.data);
    const frameResult = await extractVideoFrames(videoPath, workDir);
    const aiResult = await analyzeFramesWithOpenAI({
      caption,
      sourceName,
      frames: frameResult.frames,
    });

    if (aiResult) {
      sendJson(res, 200, {
        ...aiResult,
        backendStatus: {
          uploaded: true,
          aiConfigured: true,
          aiUsed: true,
          frameCount: frameResult.frames.length,
          frameStatus: frameResult.status,
          sourceName,
        },
      });
      return;
    }

    sendJson(res, 200, buildBackendFallback({ frameResult, sourceName }));
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

async function extractVideoFrames(videoPath, workDir) {
  const hasFfmpeg = await commandExists("ffmpeg");
  if (!hasFfmpeg) {
    return {
      frames: [],
      status: "FFmpeg is not installed on this machine, so the backend received the upload but could not extract video frames yet.",
    };
  }

  const outputPattern = path.join(workDir, "frame_%03d.jpg");
  try {
    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      videoPath,
      "-vf",
      "fps=1/4,scale=768:-1",
      "-frames:v",
      "6",
      "-q:v",
      "3",
      outputPattern,
    ]);
    const files = (await fs.readdir(workDir)).filter((file) => /^frame_\d+\.jpg$/.test(file)).sort();
    const frames = await Promise.all(
      files.map(async (file) => ({
        name: file,
        imageUrl: `data:image/jpeg;base64,${(await fs.readFile(path.join(workDir, file))).toString("base64")}`,
      })),
    );
    return {
      frames,
      status: frames.length ? `Extracted ${frames.length} key frames for AI review.` : "FFmpeg ran, but no frames were extracted.",
    };
  } catch (error) {
    return {
      frames: [],
      status: `Frame extraction failed: ${error.message || "unknown FFmpeg error"}`,
    };
  }
}

async function analyzeFramesWithOpenAI({ caption, sourceName, frames }) {
  if (!process.env.OPENAI_API_KEY || !frames.length) return null;

  const frameInputs = frames.map((frame) => ({
    type: "input_image",
    image_url: frame.imageUrl,
  }));
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildVisionPrompt({ caption, sourceName }),
            },
            ...frameInputs,
          ],
        },
      ],
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || "OpenAI video-frame analysis failed.");
  }

  const outputText =
    payload.output_text ||
    payload.output
      ?.flatMap((item) => item.content || [])
      .map((item) => item.text || "")
      .join("\n") ||
    "";
  const parsed = parseFirstJsonObject(outputText);
  if (!parsed?.ingredients) {
    throw new Error("AI response did not include a valid ingredient list.");
  }
  return {
    ingredients: parsed.ingredients,
    steps: parsed.steps || [],
  };
}

function buildVisionPrompt({ caption, sourceName }) {
  return [
    "You are FoodFrame's cooking video analyst.",
    "Use the provided video frames and caption to identify recipe ingredients, amounts, and preparation steps.",
    "If an amount is written in the caption, attach it to the matching ingredient.",
    "If an item is visible but the amount is unknown, say what clue you used instead of writing 'mentioned in caption'.",
    "Return JSON only. Do not wrap it in markdown.",
    "Schema:",
    '{"ingredients":[{"name":"string","confidence":"high|medium|low","confidenceScore":0,"amount":"string","category":"string","state":"string","actions":["string"],"seenAt":"string","visualEvidence":"string","possibleAlternatives":"string","notes":"string"}],"steps":[{"title":"string","time":"string","instruction":"string","evidence":"string"}]}',
    `Video/source name: ${sourceName || "uploaded video"}`,
    `Caption or pasted text: ${caption || "No caption provided."}`,
  ].join("\n");
}

function buildBackendFallback({ frameResult, sourceName }) {
  return {
    backendStatus: {
      uploaded: true,
      aiConfigured: Boolean(process.env.OPENAI_API_KEY),
      aiUsed: false,
      frameCount: frameResult.frames.length,
      frameStatus: frameResult.status,
      sourceName,
    },
    ingredients: [
      {
        name: "Video uploaded",
        confidence: "low",
        confidenceScore: 20,
        amount: "Needs AI vision",
        category: "Upload status",
        state: "Frames not analyzed",
        actions: ["uploaded"],
        seenAt: "Backend upload",
        visualEvidence: frameResult.status || "The video reached the backend.",
        possibleAlternatives: "Install FFmpeg and set OPENAI_API_KEY to enable full video-frame analysis.",
        notes: "FoodFrame received the video, but this local setup is missing one or more production analysis services.",
      },
    ],
    steps: [
      {
        title: "Video received",
        time: "Upload complete",
        instruction: "The backend accepted the video. Next, the production service extracts frames and sends them to AI vision.",
        evidence: frameResult.status,
      },
    ],
  };
}

function parseAllowedTikTokUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const allowedHosts = new Set(["tiktok.com", "vm.tiktok.com", "vt.tiktok.com"]);
    if (!allowedHosts.has(host) && !host.endsWith(".tiktok.com")) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function readJsonBody(req) {
  let data = "";
  for await (const chunk of req) data += chunk;
  if (!data) return {};
  return JSON.parse(data);
}

async function readMultipartForm(req) {
  const contentType = req.headers["content-type"] || "";
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) throw new Error("Expected multipart form data.");

  const boundary = boundaryMatch[1] || boundaryMatch[2];
  const body = await readBodyBuffer(req);
  const raw = body.toString("binary");
  const chunks = raw.split(`--${boundary}`).slice(1, -1);
  const fields = {};
  const files = {};

  chunks.forEach((chunk) => {
    const trimmed = chunk.replace(/^\r\n/, "").replace(/\r\n$/, "");
    const [rawHeaders, ...contentParts] = trimmed.split("\r\n\r\n");
    if (!rawHeaders || !contentParts.length) return;
    const content = contentParts.join("\r\n\r\n").replace(/\r\n$/, "");
    const headers = Object.fromEntries(
      rawHeaders.split("\r\n").map((line) => {
        const [key, ...value] = line.split(":");
        return [key.toLowerCase(), value.join(":").trim()];
      }),
    );
    const disposition = headers["content-disposition"] || "";
    const name = disposition.match(/name="([^"]+)"/)?.[1];
    if (!name) return;
    const filename = disposition.match(/filename="([^"]*)"/)?.[1];
    if (filename) {
      files[name] = {
        filename,
        contentType: headers["content-type"] || "application/octet-stream",
        data: Buffer.from(content, "binary"),
      };
    } else {
      fields[name] = Buffer.from(content, "binary").toString("utf8").trim();
    }
  });

  return { fields, files };
}

async function readBodyBuffer(req) {
  const chunks = [];
  let received = 0;
  for await (const chunk of req) {
    received += chunk.length;
    if (received > maxUploadBytes) {
      throw new Error(`Upload is too large. Keep videos under ${Math.round(maxUploadBytes / 1024 / 1024)} MB.`);
    }
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function commandExists(command) {
  try {
    await execFileAsync("sh", ["-lc", `command -v ${command}`]);
    return true;
  } catch {
    return false;
  }
}

function parseFirstJsonObject(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = String(text || "").match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function safeVideoExtension(filename = "") {
  const ext = path.extname(filename).toLowerCase();
  return [".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv"].includes(ext) ? ext : ".mp4";
}

async function serveStatic(pathname, res) {
  const cleanPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(root, cleanPath));
  if (!filePath.startsWith(root)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(data);
  } catch {
    sendJson(res, 404, { error: "Not found" });
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}
