import { useRef, useState, type FC } from "react";
import "./App.css";

interface IIndicators {
  camera: boolean;
  screen: boolean;
}

function createCompositeTransform(inputTracks: MediaStreamTrack[]) {
  const processors = inputTracks.map(
    (track) => new MediaStreamTrackProcessor({ track })
  );

  const readers = processors.map((p) => p.readable.getReader());

  // @ts-ignore
  const generator = new MediaStreamTrackGenerator({ kind: "video" });
  const writer = generator.writable.getWriter();

  // создаём OffscreenCanvas для сборки видео
  const width = 1280;
  const height = 720;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // функция отрисовки одного кадра
  async function renderFrames() {
    while (true) {
      // читаем все доступные кадры
      const frames = await Promise.all(
        readers.map((r) => r.read().catch(() => ({ done: true })))
      );

      // удаляем завершившиеся треки
      const active = frames.filter((f) => !f.done);

      if (active.length === 0) {
        console.log("нет входящих кадров");
        break;
      }

      // очищаем канвас
      ctx!.clearRect(0, 0, width, height);

      if (active.length === 1) {
        // один трек → рисуем на весь холст
        const frame = active[0].value as VideoFrame;
        ctx!.drawImage(frame, 0, 0, width, height);
        frame.close();
      }

      if (active.length === 2) {
        // двухкамерный режим
        const frameA = active[0].value as VideoFrame;
        const frameB = active[1].value as VideoFrame;

        ctx!.drawImage(frameA, 0, 0, width / 2, height);
        ctx!.drawImage(frameB, width / 2, 0, width / 2, height);

        frameA.close();
        frameB.close();
      }

      // создаём выходной кадр
      const bitmap = canvas.transferToImageBitmap();
      const outFrame = new VideoFrame(bitmap, {
        timestamp: performance.now() * 1000,
      });

      await writer.write(outFrame);
      outFrame.close();
    }
  }

  renderFrames();

  return generator; // возвращаем генератор трека
}

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
      const tracks = [];

      if (camera.current) tracks.push(camera.current.getVideoTracks()[0]);
      if (screen.current) tracks.push(screen.current.getVideoTracks()[0]);

      const generator = createCompositeTransform(tracks);
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
