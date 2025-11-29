export class Composer {
  tracks: MediaStreamTrack[]
  isActive: boolean
  // generator
  generator: MediaStreamTrackGenerator
  writer: WritableStreamDefaultWriter<VideoFrame | AudioData>
  // processor
  processors: MediaStreamTrackProcessor<VideoFrame>[]
  readers: ReadableStreamDefaultReader<VideoFrame>[]
  // worker
  worker: Worker

  constructor(tracks: MediaStreamTrack[]) {
    this.tracks = tracks
    this.isActive = false
    // generator
    this.generator = new MediaStreamTrackGenerator({ kind: 'video' })
    this.writer = this.generator.writable.getWriter()
    // processor
    this.processors = tracks.map((track) => new MediaStreamTrackProcessor({ track }))
    this.readers = this.processors.map((p) => p.readable.getReader())
    // worker
    this.worker = new Worker('./worker.ts')
  }

  getGenerator() {
    return this.generator
  }

  async startRecord() {
    this.worker.postMessage({ type: 'start' })
    this.isActive = true
    while (this.isActive) {
      const frames = await Promise.all(
        this.readers.map((r) => r.read().catch(() => ({ done: true })))
      )

      // удаляем завершившиеся треки
      const videoFrames = frames.filter((f) => !f.done) as ReadableStreamReadResult<VideoFrame>[]

      if (videoFrames.length === 0) {
        console.log('нет входящих кадров')
        break
      }

      this.worker.postMessage(
        { type: 'frame', id: trackIndex, frame: videoFrame },
        [videoFrame] // transfer
      )
    }
  }

  changeTracks(tracks: MediaStreamTrack[]) {
    this.tracks = tracks
    this.processors = tracks.map((track) => new MediaStreamTrackProcessor({ track }))
    this.readers = this.processors.map((p) => p.readable.getReader())
  }
}
