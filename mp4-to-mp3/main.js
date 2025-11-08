import { FFmpeg } from "https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/ffmpeg.min.js";
import { fetchFile, toBlobURL } from "https://unpkg.com/@ffmpeg/util@0.12.10/dist/ffmpeg-util.min.js";

const fileInput = document.getElementById("fileInput");
const convertBtn = document.getElementById("convertBtn");
const statusEl = document.getElementById("status");
const downloadLink = document.getElementById("downloadLink");

const ffmpeg = new FFmpeg();
let ffmpegLoaded = false;
let currentFile = null;

const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";

async function loadFFmpeg() {
  if (ffmpegLoaded) return;
  statusEl.textContent = "Loading conversion engine (~30MB)...";
  try {
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm")
    });
    ffmpegLoaded = true;
    statusEl.textContent = "Engine ready. Select an MP4 to begin.";
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Failed to load engine. Check console.";
  }
}

fileInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  currentFile = file;
  downloadLink.style.display = "none";
  statusEl.textContent = `Selected: ${file.name} — ${(file.size / (1024 * 1024)).toFixed(2)} MB`;
  convertBtn.disabled = false;
});

convertBtn.addEventListener("click", async () => {
  if (!currentFile) return;

  convertBtn.disabled = true;
  downloadLink.style.display = "none";
  statusEl.textContent = "Initializing...";

  await loadFFmpeg();
  if (!ffmpegLoaded) {
    convertBtn.disabled = false;
    return;
  }

  try {
    const inputName = "input.mp4";
    const outputName = "output.mp3";

    statusEl.textContent = "Uploading to in-browser FS...";
    await ffmpeg.writeFile(inputName, await fetchFile(currentFile));

    statusEl.textContent = "Converting to MP3...";
    // -vn: no video, -q:a 2: good VBR quality
    await ffmpeg.exec([
      "-i", inputName,
      "-vn",
      "-acodec", "libmp3lame",
      "-q:a", "2",
      outputName
    ]);

    statusEl.textContent = "Preparing download...";
    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);

    downloadLink.href = url;
    downloadLink.download = currentFile.name.replace(/\.[^/.]+$/, "") + ".mp3";
    downloadLink.style.display = "inline-flex";

    statusEl.textContent = "Done. Click Download MP3.";
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Conversion failed. Check console.";
  } finally {
    convertBtn.disabled = false;
  }
});
