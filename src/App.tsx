import { useEffect, useRef, useState, type FC } from 'react'
import './App.css'
import { StreamComposer } from './streamComposer'

interface IIndicators {
  camera: boolean
  screen: boolean
}

export const App: FC = () => {
  const video = useRef<HTMLVideoElement>(null)
  const [isRecord, setIsRecord] = useState(false)
  const [record, setRecord] = useState<MediaRecorder | null>(null)
  const [indicators, setIndicators] = useState<IIndicators>({
    camera: false,
    screen: false,
  })

  const screen = useRef<MediaStream>(null)
  const camera = useRef<MediaStream>(null)
  const ws = useRef<FileSystemWritableFileStream>(null)
  const composer = useRef<StreamComposer | null>(null)

  const toggleScreen = () => {
    if (!screen.current) {
      navigator.mediaDevices
        .getDisplayMedia()
        .then((s) => {
          if (!video.current) return
          video.current.srcObject = s
          screen.current = s
          setIndicators((p) => ({ ...p, screen: true }))
        })
        .catch(() => {
          screen.current = null
          setIndicators((p) => ({ ...p, screen: false }))
        })
    } else {
      screen.current.getTracks().forEach((item) => item.stop())
      screen.current = null
      setIndicators((p) => ({ ...p, screen: false }))
    }
  }

  const toggleCamera = () => {
    if (!camera.current) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((s) => {
          if (!video.current) return
          video.current.srcObject = s
          camera.current = s
          setIndicators((p) => ({ ...p, camera: true }))
        })
        .catch(() => {
          setIndicators((p) => ({ ...p, camera: false }))
          camera.current = null
        })
    } else {
      camera.current.getTracks().forEach((t) => t.stop())
      camera.current = null
      setIndicators((p) => ({ ...p, camera: false }))
    }
  }

  const toggleRecord = async () => {
    if (!isRecord) {
      const tracks = []

      if (camera.current) tracks.push(camera.current.getVideoTracks()[0])
      if (screen.current) tracks.push(screen.current.getVideoTracks()[0])

      composer.current = new StreamComposer(tracks)
      composer.current.start()
      const mainStream = new MediaStream([composer.current.getGenerator()])

      // сохраняем в файл
      const fileHandle = await window
        .showSaveFilePicker({
          suggestedName: 'recording.webm',
          types: [
            { description: 'WebM Video', accept: { 'video/webm': ['.webm'] } },
          ],
        })
        .catch(() => console.log('отменен'))

      if (!fileHandle) return

      ws.current = await fileHandle.createWritable()

      const r = new MediaRecorder(mainStream, {
        mimeType: 'video/webm',
        videoBitsPerSecond: 8_000_000,
      })
      setRecord(r)
      r.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          await ws.current!.write(e.data)
        }
      }

      r.onstop = async () => {
        await ws.current!.close()
      }
      r.start(200)
      setIsRecord(true)
    } else {
      setIsRecord(false)
      record?.stop()
      setRecord(null)
    }
  }

  useEffect(() => {
    if (!isRecord || !composer.current) return
    const tracks = []
    if (camera.current) tracks.push(camera.current.getVideoTracks()[0])
    if (screen.current) tracks.push(screen.current.getVideoTracks()[0])
    composer.current.changeTracks(tracks)
  }, [indicators, isRecord])

  return (
    <>
      <div className="container">
        <video className="video" ref={video} autoPlay muted />
        <div className="btn_wrapper">
          <button className="btn" onClick={toggleScreen}>
            {indicators.screen ? 'stop screen' : 'start screen'}
          </button>
          <button className="btn" onClick={toggleCamera}>
            {indicators.camera ? 'stop camera' : 'start camera'}
          </button>
          <button className="btn" onClick={toggleRecord}>
            {isRecord ? 'stop record' : 'start record'}
          </button>
        </div>
      </div>
    </>
  )
}
