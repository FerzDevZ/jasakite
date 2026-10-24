import os
import subprocess

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, "docs", "pdf-assets")

def get_img(filename):
    return f"file://{os.path.join(ASSETS_DIR, filename)}"

print("Writing Ultimate 24-Page A4 Technical Dossier HTML...")
