# -*- coding: utf-8 -*-
"""CoPaw Python entry point for Electron."""
import sys
import os

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

# Run CoPaw CLI
from copaw.cli.main import cli

if __name__ == '__main__':
    cli()
