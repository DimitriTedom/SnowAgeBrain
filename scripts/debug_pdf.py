import pypdf
import zlib

reader = pypdf.PdfReader("../research/ghost_niche_bible_evolutionary_mismatch.pdf")
print("Total pages:", len(reader.pages))

# Let's inspect objects in the PDF
for i in range(1, len(reader.indirect_objects) + 1):
    try:
        obj = reader.indirect_objects[i]
        if obj is None:
            continue
        # Check if it is a stream
        if '/Filter' in obj:
            data = obj._data
            # Let's try to decompress it
            filter_type = obj['/Filter']
            print(f"Object {i}: Filter={filter_type}, size={len(data)}")
    except Exception as e:
        print(f"Object {i} failed: {e}")
        break
