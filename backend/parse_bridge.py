import sys
import json
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(BASE, "resume-ai"))

from resume_parser import parse_resumes, load_models

load_models()

data = json.loads(sys.argv[1])
cv_paths = data["cv_paths"]
applicants = data["applicants"]

# Use absolute paths relative to BE uploads folder
BE_ROOT = os.path.dirname(os.path.abspath(__file__))
abs_paths = [os.path.join(BE_ROOT, p.lstrip("/")) for p in cv_paths]

resumes = parse_resumes(abs_paths)

# Merge applicant info
for i, r in enumerate(resumes):
    if i < len(applicants):
        r["name"] = applicants[i].get("full_name") or applicants[i].get("email") or r.get("name") or "Unknown"

print(json.dumps(resumes, default=str))