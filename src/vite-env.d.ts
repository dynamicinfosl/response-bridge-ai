/// <reference types="vite/client" />

declare module "*.png" {
  const value: string;
  export default value;
}

declare module "*.jpg" {
  const value: string;
  export default value;
}

declare module "*.jpeg" {
  const value: string;
  export default value;
}

declare module "*.svg" {
  const value: string;
  export default value;
}

declare module "opus-recorder" {
  interface RecorderConfig {
    encoderPath?: string;
    encoderApplication?: number;
    encoderSampleRate?: number;
    encoderBitRate?: number;
    numberOfChannels?: number;
    streamPages?: boolean;
    [key: string]: unknown;
  }
  export default class Recorder {
    constructor(config?: RecorderConfig);
    static isRecordingSupported(): boolean;
    start(): Promise<void>;
    stop(): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    ondataavailable: (typedArray: Uint8Array) => void;
    onstart: () => void;
    onstop: () => void;
    onpause: () => void;
    onresume: () => void;
  }
}
