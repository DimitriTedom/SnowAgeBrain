import json

# File paths
json_path = r"c:\Users\Dimitri SnowDev\Documents\Zenn\episodes\why_you_cant_stop_scrolling\why_you_cant_stop_scrolling.json"
txt_path = r"c:\Users\Dimitri SnowDev\Documents\Zenn\episodes\why_you_cant_stop_scrolling\zapi_flow_prompts.txt"

# Load JSON timeline
with open(json_path, "r", encoding="utf-8") as f:
    data = json.load(f)

# The exact style constraint block requested by the user
exact_style_constraint = (
    "Style constraint: An extremely simple childish drawing made in MS Paint. White background, "
    "thick uneven black outlines, wobbly hand-drawn lines, simple stick figure human with round head and line body, "
    "simple dot eyes, flat colors only, no realistic shading, no 3D, no cinematic lighting, horizontal 16:9 frame format."
)

lines_to_write = []

for entry in data["timeline"]:
    # Format start time: e.g. "00:02" -> "0002"
    start_time_clean = entry["start_time"].replace(":", "")
    
    # Extract the base action description (before the style constraint in the JSON)
    full_prompt = entry["image_prompt"]
    if ", Style constraint:" in full_prompt:
        base_prompt = full_prompt.split(", Style constraint:")[0].strip()
    elif "Style constraint:" in full_prompt:
        base_prompt = full_prompt.split("Style constraint:")[0].strip()
    else:
        base_prompt = full_prompt.strip()
    
    # Strip any trailing comma or period from the base prompt before appending the constraint
    if base_prompt.endswith(","):
        base_prompt = base_prompt[:-1].strip()
    if not base_prompt.endswith("."):
        base_prompt += "."

    # Format the line: "TIMESTAMP_Description. Style constraint: ..."
    formatted_line = f"{start_time_clean}_{base_prompt} {exact_style_constraint}"
    lines_to_write.append(formatted_line)

# Join the lines with exactly one blank line between them (double newline)
output_text = "\n\n".join(lines_to_write) + "\n"

# Save to file
with open(txt_path, "w", encoding="utf-8") as f:
    f.write(output_text)

print(f"Successfully exported {len(lines_to_write)} prompts to {txt_path}!")
