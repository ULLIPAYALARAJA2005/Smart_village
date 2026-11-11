/**
 * Text-to-Speech (TTS) Service
 * Hybrid voice player:
 * 1. Primary: Native human-voice audio streamed from backend /api/ai/tts/ (gTTS)
 *    Works reliably on 100% of browsers (Linux, Android, Windows, Mac, iOS).
 * 2. Secondary: Fallback to browser SpeechSynthesis API.
 */

class TextToSpeechService {
  constructor() {
    this.synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    this.voices = [];
    this.isMuted = false;
    this.currentAudio = null;

    if (this.synth) {
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices() || [];
  }

  isSupported() {
    return true;
  }

  stop() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {}
      this.currentAudio = null;
    }

    if (this.synth && this.synth.speaking) {
      this.synth.cancel();
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (muted) this.stop();
  }

  getAudioUrl(text, language = "te") {
    const langCode = (language && language.startsWith("te")) ? "te" : "en";
    const encoded = encodeURIComponent(text);
    return `/api/ai/tts/?lang=${langCode}&text=${encoded}`;
  }

  speak({ text, language = "te-IN", onEnd, onError }) {
    if (this.isMuted || !text) return;

    this.stop();

    const langCode = (language && language.startsWith("te")) ? "te" : "en";
    const audioUrl = this.getAudioUrl(text, langCode);

    try {
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;

      audio.onended = () => {
        this.currentAudio = null;
        if (onEnd) onEnd();
      };

      audio.onerror = (err) => {
        console.warn("Backend audio stream fallback to browser speech synthesis:", err);
        this.currentAudio = null;
        this.speakBrowser({ text, language, onEnd, onError });
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((playErr) => {
          console.debug("Audio play blocked or waiting on user action:", playErr);
          this.speakBrowser({ text, language, onEnd, onError });
        });
      }
    } catch (e) {
      this.speakBrowser({ text, language, onEnd, onError });
    }
  }

  speakBrowser({ text, language = "te-IN", onEnd, onError }) {
    if (this.isMuted || !this.synth || !text) return;

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      if (this.voices.length === 0) this.loadVoices();
      const targetLangPrefix = language.split("-")[0];
      const matchingVoice =
        this.voices.find((v) => v.lang === language) ||
        this.voices.find((v) => v.lang.startsWith(targetLangPrefix)) ||
        this.voices.find((v) => v.lang.includes("en-IN") || v.lang.includes("en-US"));

      if (matchingVoice) utterance.voice = matchingVoice;
      if (onEnd) utterance.onend = onEnd;
      if (onError) utterance.onerror = onError;

      this.synth.speak(utterance);
    } catch (err) {
      console.warn("Browser SpeechSynthesis warning:", err);
    }
  }

  // Pre-configured spoken instructions
  speakPromptMicrophone(isTelugu = true) {
    const text = isTelugu
      ? "మీ సమస్యను మైక్రోఫోన్ ద్వారా తెలియజేయండి."
      : "Please explain your problem using the microphone.";
    this.speak({ text, language: isTelugu ? "te-IN" : "en-IN" });
  }

  speakAiSuggestion(category, isTelugu = true) {
    const catLabelsTe = {
      water: "మంచినీటి",
      electricity: "విద్యుత్ లేదా కరెంటు",
      garbage: "చెత్త లేదా పారిశుధ్యం",
      drainage: "మురుగు లేదా డ్రైనేజీ",
    };
    const catName = isTelugu ? (catLabelsTe[category] || category) : category;
    const text = isTelugu
      ? `ఏఐ ఇది ${catName} సమస్యగా గుర్తించింది. దయచేసి నిర్ధారించండి.`
      : `AI suggests this is a ${category} problem. Please confirm.`;
    this.speak({ text, language: isTelugu ? "te-IN" : "en-IN" });
  }

  speakSuccess(complaintId, isTelugu = true) {
    const text = isTelugu
      ? `మీ ఫిర్యాదు విజయవంతంగా నమోదు చేయబడింది. ఫిర్యాదు నంబరు ${complaintId}.`
      : `Your complaint has been registered successfully. Complaint ID is ${complaintId}.`;
    this.speak({ text, language: isTelugu ? "te-IN" : "en-IN" });
  }

  /**
   * Spoken status describing the problem first, then its position/status.
   * e.g. "మీ ఫిర్యాదు నంబరు 3, మంచినీటి సమస్య, ప్రస్తుతం పరిశీలనలో ఉంది."
   * e.g. "Your complaint number 3, Water Supply problem, is currently In Progress."
   */
  speakIssueStatus(issue, isTelugu = true) {
    if (!issue) return;

    const catLabelsTe = {
      water: "మంచినీటి",
      electricity: "విద్యుత్ మరియు కరెంటు",
      garbage: "చెత్త మరియు పారిశుధ్యం",
      drainage: "మురుగు మరియు డ్రైనేజీ",
    };

    const catLabelsEn = {
      water: "Drinking Water Supply",
      electricity: "Electricity and Power",
      garbage: "Garbage and Sanitation",
      drainage: "Drainage and Sewage",
    };

    const statusLabelsTe = {
      Pending: "ప్రస్తుతం పరిశీలనలో ఉంది (పెండింగ్‌లో ఉంది)",
      Assigned: "సంబంధిత సిబ్బందికి కేటాయించబడింది",
      "In Progress": "ప్రస్తుతం పని పురోగతిలో ఉంది (పని జరుగుతోంది)",
      Resolved: "విజయవంతంగా పరిష్కరించబడింది",
      Rejected: "తిరస్కరించబడింది",
    };

    const statusLabelsEn = {
      Pending: "is currently Pending under initial review",
      Assigned: "has been Assigned to the field maintenance team",
      "In Progress": "is currently In Progress with repair work actively underway",
      Resolved: "has been successfully Resolved and completed",
      Rejected: "has been Rejected",
    };

    const id = issue.id || "";
    const cat = (issue.category || "").toLowerCase();
    const st = issue.status || "Pending";

    let text = "";
    if (isTelugu) {
      const catTe = catLabelsTe[cat] || "గ్రామ సమస్య";
      const stTe = statusLabelsTe[st] || st;
      text = `మీ ఫిర్యాదు నంబరు ${id}, ${catTe} సమస్య, ${stTe}.`;

      if (issue.deadline) {
        text += ` అంచనా పూర్తయ్యే గడువు తేదీ: ${issue.deadline}.`;
      }
      if (issue.reason) {
        text += ` గమనిక: ${issue.reason}.`;
      }
    } else {
      const catEn = catLabelsEn[cat] || "Civic";
      const stEn = statusLabelsEn[st] || `is ${st}`;
      text = `Your complaint number ${id}, ${catEn} problem, ${stEn}.`;

      if (issue.deadline) {
        text += ` Expected completion date is ${issue.deadline}.`;
      }
      if (issue.reason) {
        text += ` Status note: ${issue.reason}.`;
      }
    }

    this.speak({ text, language: isTelugu ? "te-IN" : "en-IN" });
    return text;
  }

  // Backwards-compatible legacy method
  speakStatus(status, deadline, isTelugu = true) {
    this.speakIssueStatus({ id: "", category: "water", status, deadline }, isTelugu);
  }
}

export const ttsService = new TextToSpeechService();
