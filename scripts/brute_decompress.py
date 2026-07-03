import re
import zlib

with open("../research/ghost_niche_bible_evolutionary_mismatch.pdf", "rb") as f:
    data = f.read()

# Find all occurrences of stream ... endstream
# Stream data usually starts after 'stream\r\n' or 'stream\n'
# and ends before 'endstream'

stream_matches = list(re.finditer(b"stream\r?\n", data))
endstream_matches = list(re.finditer(b"endstream", data))

print(f"Found {len(stream_matches)} stream starts and {len(endstream_matches)} stream ends.")

decompressed_texts = []

for idx, match in enumerate(stream_matches):
    start_pos = match.end()
    # Find the first endstream after start_pos
    end_pos = None
    for end_match in endstream_matches:
        if end_match.start() > start_pos:
            end_pos = end_match.start()
            break
    
    if end_pos is None:
        continue
    
    stream_data = data[start_pos:end_pos]
    # Clean up trailing/leading whitespace/newlines if any, but zlib needs exact bytes.
    # Sometimes there is a carriage return or newline before endstream.
    if stream_data.endswith(b"\r\n"):
        stream_data = stream_data[:-2]
    elif stream_data.endswith(b"\n") or stream_data.endswith(b"\r"):
        stream_data = stream_data[:-1]
        
    # Try decompressing
    success = False
    decompressed = None
    for wbits in [15, -15, 31]: # 15 = zlib, -15 = raw deflate, 31 = gzip
        try:
            decompressed = zlib.decompress(stream_data, wbits)
            success = True
            break
        except Exception:
            pass
            
    if success:
        try:
            text = decompressed.decode("utf-8", errors="ignore")
            decompressed_texts.append((start_pos, text))
        except Exception:
            pass

print(f"Successfully decompressed {len(decompressed_texts)} streams.")

# Let's search for keywords in the decompressed text
keywords = ["niche", "bible", "evolutionary", "structure", "VTA", "Hofmann", "Ward"]
for pos, text in decompressed_texts:
    matches = [k for k in keywords if k.lower() in text.lower()]
    if matches:
        print(f"\n--- Stream at pos {pos} matched: {matches} (length {len(text)}) ---")
        # Print a snippet
        lines = text.split("\n")
        for line in lines[:20]:
            if line.strip():
                print(line[:120])
        if len(lines) > 20:
            print("...")
