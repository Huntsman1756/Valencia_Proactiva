"""V-PRO ingestion pipeline for Valencia Open Data"""

from .scraper_opendata import ArcGiSCRaper
from .normalizer import Normalizer

__all__ = ["ArcGiSCRaper", "Normalizer"]
