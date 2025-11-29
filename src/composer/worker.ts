type MessageType = 'start' | 'stop'

interface IMessage {
  type: MessageType
}

const WIDTH = 1280
const HEIGHT = 720

const canvas = new OffscreenCanvas(WIDTH, HEIGHT)
const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D

self.addEventListener('message', (e: MessageEvent<IMessage>) => {
  switch (e.data.type) {
    case 'start':
      break
    case 'stop':
      break

    default:
      break
  }
})
