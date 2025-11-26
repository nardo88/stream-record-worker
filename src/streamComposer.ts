const WIDTH = 1280;
const HEIGHT = 720;

type ContextType = OffscreenCanvasRenderingContext2D;

export class StreamComposer {
  tracks: MediaStreamTrack[];
  // generator
  generator: MediaStreamTrackGenerator;
  writer: WritableStreamDefaultWriter<VideoFrame | AudioData>;
  // canvas
  canvas: OffscreenCanvas;
  ctx: ContextType;
  // processor
  processors: MediaStreamTrackProcessor<VideoFrame>[];
  readers: ReadableStreamDefaultReader<VideoFrame>[];

  constructor(tracks: MediaStreamTrack[]) {
    this.tracks = tracks;
    this.generator = new MediaStreamTrackGenerator({ kind: "video" });
    this.writer = this.generator.writable.getWriter();
    // canvas
    this.canvas = new OffscreenCanvas(WIDTH, HEIGHT);
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("2D context is not available");
    this.ctx = ctx;
    // processor
    this.processors = tracks.map(
      (track) => new MediaStreamTrackProcessor({ track })
    );
    this.readers = this.processors.map((p) => p.readable.getReader());
  }

  getGenerator() {
    return this.generator;
  }

  async renderFrames() {
    while (true) {
      // читаем все доступные кадры
      const frames = await Promise.all(
        this.readers.map((r) => r.read().catch(() => ({ done: true })))
      );

      // удаляем завершившиеся треки
      const active = frames.filter(
        (f) => !f.done
      ) as ReadableStreamReadResult<VideoFrame>[];

      if (active.length === 0) {
        console.log("нет входящих кадров");
        break;
      }

      // очищаем канвас
      this.ctx!.clearRect(0, 0, WIDTH, HEIGHT);

      if (active.length === 1) {
        // один трек → рисуем на весь холст
        const frame = active[0].value as VideoFrame;
        this.ctx!.drawImage(frame, 0, 0, WIDTH, HEIGHT);
        frame.close();
      }

      if (active.length === 2) {
        // двухкамерный режим
        const frameA = active[0].value as VideoFrame;
        const frameB = active[1].value as VideoFrame;

        this.ctx!.drawImage(frameA, 0, 0, WIDTH / 2, HEIGHT);
        this.ctx!.drawImage(frameB, WIDTH / 2, 0, WIDTH / 2, HEIGHT);

        frameA.close();
        frameB.close();
      }

      // создаём выходной кадр
      const bitmap = this.canvas.transferToImageBitmap();
      const outFrame = new VideoFrame(bitmap, {
        timestamp: performance.now() * 1000,
      });

      await this.writer.write(outFrame);
      outFrame.close();
    }
  }

  start() {
    this.renderFrames();
  }
}
