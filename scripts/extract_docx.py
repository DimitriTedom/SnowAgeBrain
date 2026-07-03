import zipfile
import xml.etree.ElementTree as ET

docx_path = r"c:\Users\Dimitri SnowDev\Documents\js-doc\ghost_niche_bible_evolutionary_mismatch.docx"
txt_path = r"c:\Users\Dimitri SnowDev\Documents\Zenn\research\ghost_niche_bible_docx.txt"

namespaces = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
}

with zipfile.ZipFile(docx_path) as docx:
    xml_content = docx.read('word/document.xml')
    root = ET.fromstring(xml_content)
    
    # Extract text from paragraphs
    paragraphs = []
    for paragraph in root.iter(f"{{{namespaces['w']}}}p"):
        texts = []
        for text in paragraph.iter(f"{{{namespaces['w']}}}t"):
            if text.text:
                texts.append(text.text)
        if texts:
            paragraphs.append("".join(texts))
        else:
            paragraphs.append("") # empty paragraph
            
with open(txt_path, "w", encoding="utf-8") as f:
    f.write("\n".join(paragraphs))

print("Successfully extracted DOCX text! Total paragraphs:", len(paragraphs))
