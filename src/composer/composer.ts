export class Composer {
  tracks: MediaStreamTrack[]
  isActive: boolean

  // Генератор выходного видео (для MediaRecorder)
  generator: MediaStreamTrackGenerator
  writer: WritableStreamDefaultWriter<VideoFrame | AudioData>

  // Processor и reader для каждого входящего трека
  processors: MediaStreamTrackProcessor<VideoFrame>[] = []
  readers: ReadableStreamDefaultReader<VideoFrame>[] = []

  // Worker, где происходит рендер и компоновка кадров
  worker: Worker

  constructor(tracks: MediaStreamTrack[]) {
    this.tracks = tracks
    this.isActive = false

    // Создаём generator для записи в один поток
    this.generator = new MediaStreamTrackGenerator({ kind: 'video' })
    this.writer = this.generator.writable.getWriter()

    // Инициализируем processors и readers для входящих треков
    this.initProcessors(tracks)

    // Создаём воркер
    this.worker = new Worker(new URL('./worker.ts', import.meta.url))

    // Слушаем сообщения от воркера
    this.worker.addEventListener('message', async (e) => {
      const { type, bitmap } = e.data

      if (type === 'composed') {
        // Получаем ImageBitmap с итоговой композицией кадров
        // Создаём VideoFrame для записи в generator
        const frame = new VideoFrame(bitmap, { timestamp: performance.now() * 1000 })

        // Записываем в генератор и сразу закрываем кадр
        await this.writer.write(frame)
        frame.close()

        // Освобождаем ImageBitmap
        bitmap.close()
      }
    })
  }

  // Возвращает generator, чтобы его можно было использовать в MediaStream
  getGenerator() {
    return this.generator
  }

  // Инициализация processors/readers
  private initProcessors(tracks: MediaStreamTrack[]) {
    // Сначала закрываем старые readers/processors, чтобы не было утечек
    this.readers.forEach((r) => {
      try {
        r.releaseLock() // отпускаем блокировку, если была
        r.cancel() // отменяем чтение
      } catch (e: any) {
        console.warn('Cannot cancel locked reader, skipping', e)
      }
    })

    // Отменяем старые processors
    this.processors.forEach((p) => p.readable.cancel().catch(() => null))

    // Создаём новые processors и readers
    this.processors = tracks.map((track) => new MediaStreamTrackProcessor({ track }))
    this.readers = this.processors.map((p) => p.readable.getReader())
  }

  // Запуск записи (цикл чтения кадров)
  startRecord() {
    if (this.isActive) return

    this.isActive = true
    this.worker.postMessage({ type: 'start' })

    // Запускаем цикл чтения кадров
    this.readFramesLoop()
  }

  // Остановка записи
  stopRecord() {
    this.isActive = false
    this.worker.postMessage({ type: 'stop' })

    // Безопасное закрытие потоков и остановка воркера
    this.destroy()
  }

  // Асинхронный цикл чтения кадров из всех readers
  async readFramesLoop() {
    while (this.isActive) {
      // Читаем кадры с каждого reader
      const frames = await Promise.all(
        this.readers.map((r) => r.read().catch(() => ({ done: true })))
      )

      // Фильтруем активные кадры
      const activeFrames = frames.filter((f) => !f.done) as ReadableStreamReadResult<VideoFrame>[]

      // Отправляем каждый кадр воркеру для рендера
      activeFrames.forEach((frameInfo, i) => {
        if (frameInfo.done) return
        const frame = frameInfo.value

        // Передаём кадр воркеру, владение передаётся через transfer list
        this.worker.postMessage({ type: 'frame', trackId: i, frame }, [frame])
      })

      // Можно добавить паузу, чтобы не перегружать цикл
      // await new Promise((res) => setTimeout(res, 16)) // ~60 FPS
    }
  }

  // Замена треков (например, включение/выключение камеры или экрана)
  changeTracks(tracks: MediaStreamTrack[]) {
    this.tracks = tracks

    // Инициализируем новые processors/readers для новых треков
    this.initProcessors(tracks)
  }

  // Полное уничтожение класса: останавливаем поток и воркер
  destroy() {
    this.isActive = false

    // Закрываем readers безопасно
    this.readers.forEach((r) => {
      try {
        r.releaseLock()
        r.cancel()
      } catch (e) {
        console.warn('Cannot cancel locked reader', e)
      }
    })

    // Отменяем processors
    this.processors.forEach((p) => p.readable.cancel().catch(() => null))

    // Закрываем writer и generator
    this.writer.close()
    this.generator.stop()

    // Останавливаем воркер
    this.worker.terminate()
  }
}
