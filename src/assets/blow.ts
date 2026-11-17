
const BLOW_THRESHOLD = 0.1;
const BLOW_DURATION = 1000;

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let microphone: MediaStreamAudioSourceNode | null = null;
let microphoneStream: MediaStream | null = null;

let isBlowing = false;
let blowStartTime = 0;
let isAudioEnabled = false;
let animationFrame = 0;

export async function initAudio(onBlow: () => void) {
  try {
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.3;

    microphoneStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });

    microphone = audioContext.createMediaStreamSource(microphoneStream);
    microphone.connect(analyser);

    isAudioEnabled = true;

    console.log('Audio initialized for blow detection');

    startBlowDetection(onBlow);

  } catch (error) {
    console.error('Error initializing audio:', error);
  }
}

function startBlowDetection(onBlow: () => void) {
  if (!isAudioEnabled || !analyser) return;

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function analyzeAudio() {
    if (!analyser || !isAudioEnabled) return;

    analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    const lowFreqCount = 10;

    for (let i = 0; i < lowFreqCount; i++) {
        sum += dataArray[i];
    }

    const averageVolume = sum / lowFreqCount / 255;

    if (averageVolume > BLOW_THRESHOLD) {
      if (!isBlowing) {
        isBlowing = true;
        blowStartTime = Date.now();
      } else if (Date.now() - blowStartTime > BLOW_DURATION) {
        onBlow();
        isBlowing = false;
      }
    } else {
        isBlowing = false;
    }

      animationFrame = requestAnimationFrame(analyzeAudio);
    }

    analyzeAudio();
}

export function stopAudio() {
  isAudioEnabled = false;

  cancelAnimationFrame(animationFrame);

  microphoneStream?.getTracks().forEach(track => track.stop());

  audioContext?.close();

  microphone = null;
  analyser = null;
  audioContext = null;
  microphoneStream = null;
}
