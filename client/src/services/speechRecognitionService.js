/**
 * Speech Recognition Service
 * High-reliability dual-engine speech service:
 * 1. Primary Engine: MediaRecorder captures high-fidelity audio chunks continuously
 *    until user taps stop (never auto-stops prematurely).
 * 2. Secondary Engine: Optional Web Speech API for live interim subtitles on screen.
 */

export class SpeechRecognitionService {
  constructor({ language = "te-IN", onResult, onError, onStatusChange }) {
    this.language = language;
    this.onResult = onResult || (() => {});
    this.onError = onError || (() => {});
    this.onStatusChange = onStatusChange || (() => {});

    this.recognition = null;
    this.isListening = false;
    this.mediaRecorder = null;
    this.mediaStream = null;
    this.audioChunks = [];
    this.recordedBlob = null;
  }

  setLanguage(langCode) {
    this.language = langCode;
    if (this.recognition) {
      this.recognition.lang = langCode;
    }
  }

  isWebSpeechSupported() {
    return typeof window !== "undefined" && Boolean(
      window.SpeechRecognition || window.webkitSpeechRecognition
    );
  }

  isMediaRecorderSupported() {
    return typeof window !== "undefined" && Boolean(
      navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder
    );
  }

  async start() {
    this.audioChunks = [];
    this.recordedBlob = null;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const msg = "Microphone is not supported in this browser. Please use Chrome, Edge, or Firefox.";
      this.onError({ code: "not-supported", message: msg });
      throw new Error(msg);
    }

    try {
      // 1. Acquire microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaStream = stream;

      // Determine best audio mime type supported by browser
      let mimeType = "";
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
          mimeType = "audio/ogg;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        }
      }

      const options = mimeType ? { mimeType } : undefined;
      this.mediaRecorder = new MediaRecorder(stream, options);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const type = (this.audioChunks[0] && this.audioChunks[0].type) || mimeType || "audio/webm";
        this.recordedBlob = new Blob(this.audioChunks, { type });

        // Cleanly close microphone tracks
        if (this.mediaStream) {
          try {
            this.mediaStream.getTracks().forEach((t) => t.stop());
          } catch {}
          this.mediaStream = null;
        }

        this.isListening = false;
        this.onStatusChange("recorded", { blob: this.recordedBlob });
      };

      // Collect data chunks continuously every 250ms
      this.mediaRecorder.start(250);
      this.isListening = true;
      this.onStatusChange("listening", { mode: "recording" });

      // 2. Auxiliary real-time live preview using Web Speech (if browser supports it)
      // Note: Web Speech is purely visual and MUST NEVER prematurely stop recording!
      if (this.isWebSpeechSupported()) {
        try {
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          this.recognition = new SpeechRecognition();
          this.recognition.continuous = true;
          this.recognition.interimResults = true;
          this.recognition.lang = this.language;
          this.recognition.maxAlternatives = 1;

          this.recognition.onresult = (event) => {
            let interimTranscript = "";
            let finalTranscript = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              const tr = event.results[i][0].transcript;
              if (event.results[i].isFinal) finalTranscript += tr;
              else interimTranscript += tr;
            }
            this.onResult({
              finalTranscript: finalTranscript.trim(),
              interimTranscript: interimTranscript.trim(),
              fullTranscript: (finalTranscript + " " + interimTranscript).trim(),
            });
          };

          this.recognition.onerror = (e) => {
            // Silently ignore browser-level speech errors since MediaRecorder is actively capturing audio
            console.debug("Web Speech live preview note:", e.error);
          };

          this.recognition.onend = () => {
            // Web Speech ended — DO NOT STOP RECORDING! MediaRecorder is the master recording controller!
            console.debug("Web Speech ended, MediaRecorder continuing");
          };

          this.recognition.start();
        } catch (wsErr) {
          console.debug("WebSpeech visual display start note:", wsErr);
        }
      }

      return { mode: "recording" };
    } catch (err) {
      this.isListening = false;
      this.onStatusChange("error", { error: err.name });
      let msg = "Microphone permission denied. Please allow microphone in browser URL bar to speak.";
      if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        msg = "No microphone hardware found on this computer.";
      }
      this.onError({ code: err.name, message: msg });
      throw err;
    }
  }

  stop() {
    this.isListening = false;

    // Stop Web Speech
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }

    // Stop MediaRecorder (fires onstop and delivers the audio blob)
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch {}
    } else {
      this.onStatusChange("stopped", { mode: "recording" });
    }
  }

  getRecordedAudio() {
    return this.recordedBlob;
  }
}
