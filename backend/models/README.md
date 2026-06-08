# Models

`flowchart.pt` — YOLOv11 hand-drawn flowchart detector (shapes + arrows), used by
`app/services/detect.py`. **Not committed** (large binary, gitignored).

To produce it: run `notebooks/train_flowchart_yolo.ipynb` on Google Colab (free
T4 GPU, ~30–60 min), then download `best.pt` and save it here as
`backend/models/flowchart.pt`.

Without this file, `detect_available()` returns False and diagram blocks fall back
to the cropped-photo embed automatically — the app still works.
