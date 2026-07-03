import fitz  # PyMuPDF

doc = fitz.open("../research/ghost_niche_bible_evolutionary_mismatch.pdf")
print("Total pages:", len(doc))

with open("../research/ghost_niche_bible.txt", "w", encoding="utf-8") as f:
    for idx, page in enumerate(doc):
        text = page.get_text()
        f.write(f"--- PAGE {idx+1} ---\n")
        f.write(text)
        f.write("\n\n")

print("Done extracting text.")
