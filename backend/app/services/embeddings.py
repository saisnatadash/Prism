"""Multilingual sentence embeddings, run in-process (no separate service)."""

from functools import lru_cache

from app.core.config import get_settings


@lru_cache
def get_embedding_model():
    # Imported lazily: importing sentence_transformers/torch at module load
    # time would slow down every process that imports this package (e.g. the
    # data generator), even when it never touches embeddings.
    from sentence_transformers import SentenceTransformer

    settings = get_settings()
    return SentenceTransformer(settings.embedding_model_name)


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a batch of texts, returning one normalized vector per text."""
    if not texts:
        return []
    model = get_embedding_model()
    vectors = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return vectors.tolist()
