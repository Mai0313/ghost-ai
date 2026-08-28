/**
 * AudioWorklet processor for audio recording and resampling
 * Replaces deprecated ScriptProcessorNode with modern AudioWorklet API
 *
 * Benefits:
 * - Runs on separate audio thread (no main thread blocking)
 * - Better performance and lower latency
 * - More efficient CPU usage
 */

const TARGET_SAMPLE_RATE = 24000;
const CHUNK_SAMPLES = 3072;

class AudioRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // Buffer for accumulating resampled audio
    this.chunkBuffer = new Float32Array(CHUNK_SAMPLES * 4);
    this.chunkLength = 0;

    // Track source sample rate
    this.sourceSampleRate = sampleRate;

    this.port.onmessage = (event) => {
      if (event.data.type === "updateSampleRate") {
        this.sourceSampleRate = event.data.sampleRate;
      }
    };
  }

  /**
   * Optimized linear interpolation resampling
   */
  resample(inputBuffer, inRate, outRate) {
    if (inRate === outRate) return inputBuffer;

    const ratio = inRate / outRate;
    const newLength = Math.floor(inputBuffer.length / ratio);
    const output = new Float32Array(newLength);
    const bufferLen = inputBuffer.length - 1;

    for (let i = 0; i < newLength; i++) {
      const index = i * ratio;
      const i0 = Math.floor(index);
      const i1 = Math.min(bufferLen, i0 + 1);
      const frac = index - i0;

      output[i] = inputBuffer[i0] * (1 - frac) + inputBuffer[i1] * frac;
    }

    return output;
  }

  /**
   * Convert Float32 audio to 16-bit PCM
   */
  floatTo16BitPCM(float32Array) {
    const output = new Int16Array(float32Array.length);

    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));

      output[i] = (s < 0 ? s * 0x8000 : s * 0x7fff) | 0;
    }

    return output;
  }

  /**
   * Process audio input (called automatically by AudioWorklet)
   */
  process(inputs) {
    const input = inputs[0];

    if (!input || input.length === 0) return true;

    const numberOfChannels = input.length;
    const frameCount = input[0].length;

    // Mix all channels to mono
    const mono = new Float32Array(frameCount);

    for (let channel = 0; channel < numberOfChannels; channel++) {
      const channelData = input[channel];

      for (let i = 0; i < frameCount; i++) {
        mono[i] += channelData[i] / numberOfChannels;
      }
    }

    // Resample to target rate
    const resampled = this.resample(
      mono,
      this.sourceSampleRate,
      TARGET_SAMPLE_RATE,
    );

    // Accumulate into chunk buffer
    let offset = 0;

    while (offset < resampled.length) {
      const space = this.chunkBuffer.length - this.chunkLength;
      const toCopy = Math.min(space, resampled.length - offset);

      this.chunkBuffer.set(
        resampled.subarray(offset, offset + toCopy),
        this.chunkLength,
      );

      this.chunkLength += toCopy;
      offset += toCopy;

      // Send chunk when buffer is full
      if (this.chunkLength >= CHUNK_SAMPLES) {
        const chunk = this.chunkBuffer.subarray(0, CHUNK_SAMPLES);
        const pcm16 = this.floatTo16BitPCM(chunk);

        // Transfer ArrayBuffer ownership for zero-copy
        this.port.postMessage({ type: "audioData", data: pcm16.buffer }, [
          pcm16.buffer,
        ]);

        // Move remaining samples to start of buffer
        const remaining = this.chunkLength - CHUNK_SAMPLES;

        if (remaining > 0) {
          this.chunkBuffer.copyWithin(0, CHUNK_SAMPLES, this.chunkLength);
        }
        this.chunkLength = remaining;
      }
    }

    return true; // Keep processor alive
  }
}

registerProcessor("audio-recorder-processor", AudioRecorderProcessor);
