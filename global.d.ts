interface Window {
  showSaveFilePicker(
    options?: SaveFilePickerOptions
  ): Promise<FileSystemFileHandle>;
}

interface SaveFilePickerOptions {
  id?: string;
  suggestedName?: string;
  types?: FilePickerAcceptType[];
  excludeAcceptAllOption?: boolean;
  startIn?:
    | "desktop"
    | "documents"
    | "downloads"
    | "music"
    | "pictures"
    | "videos";
}

interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string[]>;
}

interface FileSystemFileHandle {
  kind: "file";
  name: string;
  getFile(): Promise<File>;
  createWritable(
    options?: FileSystemCreateWritableOptions
  ): Promise<FileSystemWritableFileStream>;
}

interface FileSystemCreateWritableOptions {
  keepExistingData?: boolean;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: BufferSource | Blob | string): Promise<void>;
  seek(position: number): Promise<void>;
  truncate(size: number): Promise<void>;
  close(): Promise<void>;
}

declare class MediaStreamTrackProcessor<
  T extends VideoFrame | AudioData = VideoFrame
> {
  constructor(options: { track: MediaStreamTrack });

  readonly readable: ReadableStream<T>;
}

// declare class MediaStreamTrackGenerator<
//   T extends VideoFrame | AudioData = VideoFrame
// > {
//   constructor(options: { kind: "video" | "audio" });

//   readonly writable: WritableStream<T>;
//   readonly track: MediaStreamTrack;
// }
