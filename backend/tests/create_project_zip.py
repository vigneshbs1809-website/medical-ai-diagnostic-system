"""
Script to create a clean, comprehensive distribution ZIP of the Medical AI Diagnostic System.
Includes:
- backend/ (excluding .venv and __pycache__)
- client/ (including src, dist, configs; excluding node_modules)
- models/ (all trained weights, checkpoints, configs, and audit graphs)
- documentation/ (model audit and testing reports)
- root configurations and READMEs
"""

import os
import zipfile
from pathlib import Path
import time

def create_zip():
    root_dir = Path(r"C:\Users\Vignesh\OneDrive\Desktop\frontend")
    zip_output_path = root_dir / "Medical_AI_Diagnostic_System.zip"

    # Folders to completely exclude
    exclude_dirs = {
        ".venv",
        "node_modules",
        "__pycache__",
        ".git"
    }

    # Specific root files to exclude (e.g. raw redundant zip archives)
    exclude_files = {
        "BALL_Classification_outputs-20261117T080302Z-1-001.zip",
        "PCMMD_Results_final-20261117T033914Z-1-001.zip",
        "Medical_AI_Diagnostic_System.zip"
    }

    print(f"Creating distribution ZIP: {zip_output_path}")
    t0 = time.time()
    file_count = 0
    total_uncompressed_bytes = 0

    with zipfile.ZipFile(zip_output_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zipf:
        for foldername, subfolders, filenames in os.walk(root_dir):
            current_path = Path(foldername)

            # Filter out excluded directories in-place
            subfolders[:] = [d for d in subfolders if d not in exclude_dirs]

            # Check if current path contains any excluded directory
            parts = current_path.relative_to(root_dir).parts
            if any(part in exclude_dirs for part in parts):
                continue

            for filename in filenames:
                if filename in exclude_files:
                    continue
                if filename.endswith(".pyc") or filename.endswith(".tmp"):
                    continue

                filepath = current_path / filename
                arcname = filepath.relative_to(root_dir)

                try:
                    file_size = filepath.stat().st_size
                    zipf.write(filepath, arcname)
                    file_count += 1
                    total_uncompressed_bytes += file_size
                except Exception as e:
                    print(f"Warning: Could not add {filepath}: {e}")

    zip_size = zip_output_path.stat().st_size
    duration = time.time() - t0

    print(f"\nZIP Archive Created Successfully!")
    print(f"Path: {zip_output_path}")
    print(f"Total Files Added: {file_count}")
    print(f"Uncompressed Size: {total_uncompressed_bytes / (1024*1024):.2f} MB")
    print(f"Compressed Size: {zip_size / (1024*1024):.2f} MB")
    print(f"Compression Ratio: {(1 - zip_size / total_uncompressed_bytes) * 100:.1f}%")
    print(f"Time Taken: {duration:.2f} seconds")

if __name__ == "__main__":
    create_zip()
