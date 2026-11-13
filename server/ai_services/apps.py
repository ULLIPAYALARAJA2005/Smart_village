from django.apps import AppConfig


class AiServicesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ai_services'

    def ready(self):
        """Pre-warm classifiers on server start so the first request is instant."""
        import threading

        def _warm():
            try:
                from .text_classifier import MultilingualTextClassifier
                MultilingualTextClassifier.get_instance()
            except Exception:
                pass
            try:
                from .image_classifier import CLIPImageClassifier
                CLIPImageClassifier.get_instance()
            except Exception:
                pass

        threading.Thread(target=_warm, daemon=True).start()
