let encoder = null;
let chunks = [];

self.onmessage = async function (e) {
  const { type, data } = e.data;

  switch (type) {
    case "ENCODE_FRAME":
      await encodeFrame(data.frame);
      break;

    case "STOP":
      await finishEncoding();
      break;
  }
};

async function encodeFrame(frame) {
  if (!encoder) {
    // Инициализируем энкодер при первом кадре
    encoder = new VideoEncoder({
      output: (chunk) => {
        self.postMessage({
          type: "CHUNK_READY",
          chunk: chunk,
        });
      },
      error: (error) => console.error("Encoding error:", error),
    });

    encoder.configure({
      codec: "vp8",
      width: frame.displayWidth,
      height: frame.displayHeight,
      bitrate: 8_000_000,
      framerate: 30,
    });
  }

  encoder.encode(frame);
  frame.close();
}

async function finishEncoding() {
  if (encoder) {
    await encoder.flush();
    encoder.close();
    encoder = null;
  }
}
