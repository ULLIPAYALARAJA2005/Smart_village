import io
import os
import tempfile
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Ensure static ffmpeg binaries are in PATH
try:
    import static_ffmpeg
    static_ffmpeg.add_paths()
except Exception as e:
    logger.warning(f"Could not initialize static_ffmpeg: {e}")


class SpeechTranscriptionService:
    """
    High-accuracy Voice-to-Text Speech Recognition and Translation Service.
    Supports Telugu (te-IN) and English (en-IN).
    Transcribes audio clips (webm, wav, ogg, mp4) directly using Google Speech Recognition
    and provides optional English translation for Telugu inputs.
    """
    _instance = None

    def __init__(self):
        self.is_configured = True
        self.model_name = "google-speech-recognition"

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = SpeechTranscriptionService()
        return cls._instance

    def transcribe(self, audio_file, language: str = "te") -> Dict[str, Any]:
        """
        Transcribe incoming audio stream/file into text.
        Converts audio format into 16kHz mono WAV, then recognizes speech.
        """
        import speech_recognition as sr
        from pydub import AudioSegment

        target_lang = "te-IN" if (language and language.startswith("te")) else "en-IN"
        fallback_lang = "en-IN" if target_lang == "te-IN" else "te-IN"

        # Save incoming uploaded file to a temporary file
        temp_input = None
        temp_wav = None
        try:
            suffix = os.path.splitext(getattr(audio_file, "name", "audio.webm"))[1] or ".webm"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f_in:
                temp_input = f_in.name
                if hasattr(audio_file, "chunks"):
                    for chunk in audio_file.chunks():
                        f_in.write(chunk)
                else:
                    audio_file.seek(0)
                    f_in.write(audio_file.read())

            # Convert to standard WAV 16kHz Mono using pydub & ffmpeg
            audio_seg = AudioSegment.from_file(temp_input)
            audio_seg = audio_seg.set_frame_rate(16000).set_channels(1)

            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f_wav:
                temp_wav = f_wav.name
                audio_seg.export(temp_wav, format="wav")

            # Run Speech Recognition
            recognizer = sr.Recognizer()
            recognizer.energy_threshold = 300
            recognizer.dynamic_energy_threshold = True

            with sr.AudioFile(temp_wav) as source:
                audio_data = recognizer.record(source)

            transcript = ""
            detected_lang = target_lang

            # Try primary language first
            try:
                transcript = recognizer.recognize_google(audio_data, language=target_lang)
            except sr.UnknownValueError:
                # If primary language returned no match, try fallback language
                try:
                    transcript = recognizer.recognize_google(audio_data, language=fallback_lang)
                    detected_lang = fallback_lang
                except (sr.UnknownValueError, sr.RequestError):
                    transcript = ""
            except sr.RequestError as e:
                logger.error(f"Google Speech API request error: {e}")
                return {
                    "success": False,
                    "transcription": "",
                    "language": target_lang,
                    "status": "error",
                    "message": "Speech recognition service could not be reached. Please speak clearly or enter text.",
                }

            transcript = (transcript or "").strip()

            # Optional: Translate Telugu to English for richer analysis
            translation = ""
            if transcript and detected_lang.startswith("te"):
                try:
                    from deep_translator import MyMemoryTranslator
                    translation = MyMemoryTranslator(source="te-IN", target="en-IN").translate(transcript)
                    if translation and "NO QUERY SPECIFIED" in translation:
                        translation = ""
                except Exception as trans_err:
                    logger.debug(f"Translation note: {trans_err}")
                    translation = ""

            return {
                "success": True,
                "transcription": transcript,
                "translation": translation,
                "language": detected_lang,
                "status": "success" if transcript else "empty",
                "message": "Speech successfully recognized" if transcript else "No distinct speech recognized. Please speak closer to the microphone.",
            }

        except Exception as ex:
            logger.exception(f"Audio transcription error: {ex}")
            return {
                "success": False,
                "transcription": "",
                "language": target_lang,
                "status": "error",
                "message": f"Could not process audio: {str(ex)}",
            }
        finally:
            if temp_input and os.path.exists(temp_input):
                try:
                    os.remove(temp_input)
                except Exception:
                    pass
            if temp_wav and os.path.exists(temp_wav):
                try:
                    os.remove(temp_wav)
                except Exception:
                    pass


