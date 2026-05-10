#!/usr/bin/env python
"""CLI entry-point for the ingestion pipeline.

Usage:
    python -m src.scripts.run_ingest          # one-shot run
    python -m src.scripts.run_ingest --help   # show help
"""

import asyncio
import logging
import sys
import os

# Ensure src/backend is on path so imports like "from ingestion..." work
_BACKEND = os.path.join(os.path.dirname(__file__), "..", "backend")
sys.path.insert(0, os.path.abspath(_BACKEND))

from ingestion.ingestor import Ingestor  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("run_ingest")


def main() -> None:
    """Run the full ingestion pipeline and print summary."""
    logger.info("=== V-PRO Ingestion Pipeline ===")
    result = asyncio.run(Ingestor().run())
    logger.info("Pipeline summary: %s", result)
    sys.exit(0 if result["errors"] == 0 else 1)


if __name__ == "__main__":
    main()
