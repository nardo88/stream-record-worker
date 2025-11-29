const WIDTH = 1280
const HEIGHT = 720

const canvas = new OffscreenCanvas(WIDTH, HEIGHT)
const ctx = canvas.getContext('2d')

if (!ctx) throw new Error('2D context is not available')

// Хранилище текущих кадров
const frames = new Map<number, VideoFrame>()

// Функция рендера сетки с сохранением пропорций
function renderAllFrames() {
  ctx!.clearRect(0, 0, WIDTH, HEIGHT)

  const arr = [...frames.values()]
  const count = arr.length
  if (count === 0) return

  // Определяем сетку в зависимости от количества потоков
  let cols: number, rows: number
  switch (count) {
    case 1:
      cols = 1
      rows = 1
      break
    case 2:
      cols = 2
      rows = 1
      break
    case 3:
      cols = 3
      rows = 1
      break
    case 4:
      cols = 2
      rows = 2
      break
    default: // 5-6
      cols = 3
      rows = 2
      break
  }

  const cellWidth = WIDTH / cols
  const cellHeight = HEIGHT / rows

  for (let i = 0; i < arr.length && i < cols * rows; i++) {
    const frame = arr[i]

    const col = i % cols
    const row = Math.floor(i / cols)

    const cellX = col * cellWidth
    const cellY = row * cellHeight

    // исходное разрешение кадра
    const fw = frame.displayWidth
    const fh = frame.displayHeight

    // масштабирование с сохранением пропорций
    const scale = Math.min(cellWidth / fw, cellHeight / fh)
    const renderWidth = fw * scale
    const renderHeight = fh * scale

    // центрируем кадр в ячейке
    const x = cellX + (cellWidth - renderWidth) / 2
    const y = cellY + (cellHeight - renderHeight) / 2

    ctx!.drawImage(frame, 0, 0, fw, fh, x, y, renderWidth, renderHeight)
  }
}

// Закрываем все кадры и очищаем память
function clearAllFrames() {
  for (const frame of frames.values()) frame.close()
  frames.clear()
}

self.onmessage = async (e: MessageEvent<any>) => {
  const { type, trackId, frame } = e.data

  switch (type) {
    case 'start':
      clearAllFrames()
      break

    case 'frame': {
      // Если кадр для этого trackId уже есть — закрываем
      const old = frames.get(trackId)
      if (old) old.close()

      frames.set(trackId, frame)

      // Рендерим канвас
      renderAllFrames()

      // Передаём bitmap в основной поток
      const bitmap = canvas.transferToImageBitmap()
      ;(self as any).postMessage({ type: 'composed', bitmap }, [bitmap])
      break
    }

    case 'removeTrack': {
      // Явно удалить кадр по trackId
      const old = frames.get(trackId)
      if (old) old.close()
      frames.delete(trackId)
      break
    }

    case 'stop':
      clearAllFrames()
      break
  }
}
