import { useRef, useState, type FC } from "react";
import "./App.css";

interface IIndicators {
  camera: boolean;
  screen: boolean;
}

const createGrayscaleTransform = () =>
  new TransformStream<VideoFrame, VideoFrame>({
    async transform(frame, controller) {
      const bitmap = await createImageBitmap(frame);

      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0);

      const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = data[i + 1] = data[i + 2] = avg;
      }

      ctx.putImageData(imageData, 0, 0);

      const newFrame = new VideoFrame(canvas, {
        timestamp: frame.timestamp,
      });

      frame.close();
      controller.enqueue(newFrame);
    },
  });

export const App: FC = () => {
  const video = useRef<HTMLVideoElement>(null);
  const [isRecord, setIsRecord] = useState(false);
  const [record, setRecord] = useState<MediaRecorder | null>(null);
  const [indicators, setIndicators] = useState<IIndicators>({
    camera: false,
    screen: false,
  });

  const screen = useRef<MediaStream>(null);
  const camera = useRef<MediaStream>(null);
  const ws = useRef<FileSystemWritableFileStream>(null);

  const toggleScreen = () => {
    if (!screen.current) {
      navigator.mediaDevices
        .getDisplayMedia()
        .then((s) => {
          if (!video.current) return;
          video.current.srcObject = s;
          screen.current = s;
          setIndicators((p) => ({ ...p, screen: true }));
        })
        .catch(() => {
          screen.current = null;
          setIndicators((p) => ({ ...p, screen: false }));
        });
    } else {
      screen.current.getTracks().forEach((item) => item.stop());
      screen.current = null;
      setIndicators((p) => ({ ...p, screen: false }));
    }
  };

  const toggleCamera = () => {
    if (!camera.current) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((s) => {
          if (!video.current) return;
          video.current.srcObject = s;
          camera.current = s;
          setIndicators((p) => ({ ...p, camera: true }));
        })
        .catch(() => {
          setIndicators((p) => ({ ...p, camera: false }));
          camera.current = null;
        });
    } else {
      camera.current.getTracks().forEach((t) => t.stop());
      camera.current = null;
      setIndicators((p) => ({ ...p, camera: false }));
    }
  };

  const toggleRecord = async () => {
    if (!isRecord) {
      // 1. Сохраняем промежуточные переменные
      const inputStream = video.current?.srcObject as MediaStream;
      if (!inputStream) return;

      const track = inputStream.getVideoTracks()[0];
      if (!track) return;

      // 2. Создаём processor и generator
      const processor = new MediaStreamTrackProcessor({ track });
      // @ts-ignore
      const generator = new MediaStreamTrackGenerator({ kind: "video" });

      // 3. TransformStream (ч/б фильтр)
      const transformer = createGrayscaleTransform();

      // 4. Соединяем pipeline
      processor.readable.pipeThrough(transformer).pipeTo(generator.writable);
      // 5. Создаём конечный поток
      const mainStream = new MediaStream([generator]);

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
      };
      r.start(200);
      setIsRecord(true);
    } else {
      setIsRecord(false);
      record?.stop();
      setRecord(null);
    }
  };

  return (
    <>
      <div className="container">
        <video className="video" ref={video} autoPlay muted />
        <div className="btn_wrapper">
          <button className="btn" onClick={toggleScreen}>
            {indicators.screen ? "stop screen" : "start screen"}
          </button>
          <button className="btn" onClick={toggleCamera}>
            {indicators.camera ? "stop camera" : "start camera"}
          </button>
          <button className="btn" onClick={toggleRecord}>
            {isRecord ? "stop record" : "start record"}
          </button>
        </div>
      </div>
    </>
  );
};
