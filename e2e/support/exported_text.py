"""Text of exported files for the structured-assessments e2e spec (needs Python 3 with pypdf).

Usage: python exported_text.py FILE... -> JSON list, one entry per file:
  PDF:  {"file", "pages": [text per page]}
  DOCX: {"file", "text", "paragraphs", "omml", "images", "footers": [text per footer part]}
"""
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def docx(path):
    z = zipfile.ZipFile(path)
    if z.testzip() is not None:
        raise ValueError(f"corrupt zip: {path}")
    xml = z.read("word/document.xml")
    root = ET.fromstring(xml)
    # One line per paragraph, so tests can look for whole lines.
    paras = ["".join(t.text or "" for t in p.iter(W + "t")) for p in root.iter(W + "p")]

    def text_of(name):
        return "".join(t.text or "" for t in ET.fromstring(z.read(name)).iter(W + "t"))

    return {
        "file": path,
        "text": "\n".join(paras),
        "paragraphs": len(paras),
        "omml": len(re.findall(rb"<m:oMath[ >]", xml)),
        "images": len([n for n in z.namelist() if n.startswith("word/media/")]),
        "footers": [text_of(n) for n in sorted(z.namelist()) if re.match(r"word/footer\d*\.xml$", n)],
    }


def pdf(path):
    import pypdf

    return {"file": path, "pages": [p.extract_text() or "" for p in pypdf.PdfReader(path).pages]}


out = [pdf(f) if f.lower().endswith(".pdf") else docx(f) for f in sys.argv[1:]]
sys.stdout.reconfigure(encoding="utf-8")
print(json.dumps(out, ensure_ascii=False))
