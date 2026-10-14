import os
import subprocess

ASSETS_DIR = "/home/firman/weblomba/docs/pdf-assets"

def get_img(filename):
    return f"file://{os.path.join(ASSETS_DIR, filename)}"

print("Writing Ultimate 24-Page A4 Technical Dossier HTML...")
