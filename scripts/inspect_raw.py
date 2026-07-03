with open("../research/ghost_niche_bible_evolutionary_mismatch.pdf", "rb") as f:
    data = f.read()

import re
stream_matches = list(re.finditer(b"stream", data))
endstream_matches = list(re.finditer(b"endstream", data))

print("Stream count:", len(stream_matches))
print("Endstream count:", len(endstream_matches))

for i in range(min(5, len(stream_matches))):
    start = stream_matches[i].start()
    # Find the endstream match
    end = None
    for em in endstream_matches:
        if em.start() > start:
            end = em.start()
            break
    
    if end is not None:
        chunk = data[start:end+15]
        print(f"\nStream {i} (range {start}:{end}):")
        print(chunk[:100])
        print("...")
        print(chunk[-100:])
