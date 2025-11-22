import { useRef, useState, type FC } from "react";
import "./App.css";

const scrVideoEl = (stream: MediaStream) => {
  if (!(stream as any).videoEl) {
    const v = document.createElement("video");
    v.srcObject = stream;
    v.muted = true;
    v.play();
    (stream as any).videoEl = v;
  }
  return (stream as any).videoEl as HTMLVideoElement;
};

export const App: FC = () => {
  const video = useRef<HTMLVideoElement>(null);
  const [isRecord, setIsRecord] = useState(false);

  const stream = useRef<MediaStream>(null);
  const [record, setRecord] = useState<MediaRecorder | null>(null);
  const ws = useRef<FileSystemWritableFileStream>(null);

  const toggleScreen = () => {
    if (!stream.current) {
      navigator.mediaDevices
        .getDisplayMedia()
        .then((s) => {
          if (!video.current) return;
          video.current.srcObject = s;
          stream.current = s;
        })
        .catch(() => (stream.current = null));
    } else {
      stream.current.getTracks().forEach((item) => item.stop());
      stream.current = null;
    }
  };

  const toggleRecord = async () => {
    if (!stream.current) return;
    let animate: number | null = null;
    if (!isRecord) {
      // переменная для сохранения ссылки на requestAnimationFrame
      // создаём canvas
      const canvas = document.createElement("canvas");
      const width = 1920;
      const height = 1080;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const drawFrame = () => {
        ctx.clearRect(0, 0, width, height);

        const scr = stream.current;
        if (!scr) return;

        // Рисуем только демонстрацию экрана
        const v = scrVideoEl(scr);
        const scale = Math.min(width / v.videoWidth, height / v.videoHeight);
        const drawW = v.videoWidth * scale;
        const drawH = v.videoHeight * scale;
        const posX = (width - drawW) / 2;
        const posY = (height - drawH) / 2;
        ctx.drawImage(v, posX, posY, drawW, drawH);
      };

      animate = setInterval(drawFrame, 1000 / 30) as unknown as number;

      // создаём поток с canvas
      const canvasStream = canvas.captureStream(30);
      const mainStream = new MediaStream();

      canvasStream.getVideoTracks().forEach((t) => mainStream.addTrack(t));
      // сохраняем в файл
      const fileHandle = await window
        .showSaveFilePicker({
          suggestedName: "recording.webm",
          types: [
            { description: "WebM Video", accept: { "video/webm": [".webm"] } },
          ],
        })
        .catch(() => console.log("отменен"));

      if (!fileHandle) return;

      ws.current = await fileHandle.createWritable();

      const r = new MediaRecorder(mainStream, {
        mimeType: "video/webm",
        videoBitsPerSecond: 8_000_000,
      });
      setRecord(r);
      r.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          await ws.current!.write(e.data);
        }
      };

      r.onstop = async () => {
        await ws.current!.close();
        if (animate) clearInterval(animate);
      };
      r.start(200);
      setIsRecord(true);
    } else {
      setIsRecord(false);
      record?.stop();
      setRecord(null);
      if (animate) clearInterval(animate);
    }
  };
  return (
    <div className="container">
      <video className="video" ref={video} autoPlay muted />
      <div className="btn_wrapper">
        <button className="btn" onClick={toggleScreen}>
          {stream ? "stop screen" : "start screen"}
        </button>
        <button disabled={!stream} className="btn" onClick={toggleRecord}>
          {isRecord ? "stop record" : "start record"}
        </button>
      </div>
    </div>
  );
};
