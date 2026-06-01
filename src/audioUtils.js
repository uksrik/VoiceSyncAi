/**
 * Decode any browser-supported audio and export 16 kHz mono WAV for ASR APIs.
 */
export async function blobToWavDataUrl(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    throw new Error("Web Audio is not available in this browser.");
  }

  const ctx = new AudioContextCtor();
  try {
    const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const targetRate = 16000;
    const duration = decoded.duration;
    const offline = new OfflineAudioContext(1, Math.ceil(duration * targetRate), targetRate);
    const source = offline.createBufferSource();
    const mono = offline.createBuffer(1, decoded.length, decoded.sampleRate);

    if (decoded.numberOfChannels === 1) {
      mono.copyToChannel(decoded.getChannelData(0), 0);
    } else {
      const ch0 = decoded.getChannelData(0);
      const ch1 = decoded.numberOfChannels > 1 ? decoded.getChannelData(1) : ch0;
      const mix = mono.getChannelData(0);
      for (let i = 0; i < mix.length; i++) {
        mix[i] = (ch0[i] + ch1[i]) / 2;
      }
    }

    source.buffer = mono;
    source.connect(offline.destination);
    source.start(0);
    const rendered = await offline.startRendering();
    const wavBuffer = encodeWav(rendered.getChannelData(0), rendered.sampleRate);
    const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to encode WAV audio."));
      reader.readAsDataURL(wavBlob);
    });
  } finally {
    await ctx.close().catch(() => {});
  }
}

function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

export async function prepareAudioDataUrl(file, rawDataUrl) {
  const needsConvert = !file.type.includes("wav") && !rawDataUrl.startsWith("data:audio/wav");
  if (!needsConvert) return rawDataUrl;
  return blobToWavDataUrl(file);
}
