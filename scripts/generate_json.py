import json
import re

# File paths
script_path = r"c:\Users\Dimitri SnowDev\Documents\Zenn\episodes\why_you_cant_stop_scrolling\why_you_cant_stop_scrolling_script.txt"
json_path = r"c:\Users\Dimitri SnowDev\Documents\Zenn\episodes\why_you_cant_stop_scrolling\why_you_cant_stop_scrolling.json"

# Read narration script
with open(script_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Keyword-to-drawing mapping for image prompts
keyword_prompts = [
    # Beat 1: Hook
    ("prefrontal cortex", "A stick figure with a giant pink circle inside its head showing a brain with wobbly lines."),
    ("circuitry", "A stick figure with glowing red and yellow circuits drawn on its body."),
    ("pocket", "A stick figure reaching its hand into its pants pocket."),
    ("unlock", "A stick figure clicking a lock button on a simple black rectangle representing a phone."),
    ("screen", "A simple close up of a hand made of thin lines touching a black phone screen, a curved arrow pointing up."),
    ("refresh", "A black rectangle representing a screen with a curved arrow forming a circle to show refresh."),
    ("lack of discipline", "A stick figure trying to pull its own hand away from a phone using a rope."),
    ("attention span", "A stick figure with a small dotted line showing a very short path to a question mark."),
    ("scientists call", "A stick figure wearing a lab coat and holding a beaker, with a big question mark."),
    ("echo", "A stick figure speaking with multiple light grey waves radiating from its mouth."),
    ("prehistoric", "A stick figure running in a simple green grass field with a spear in hand."),
    ("natural environment", "A simple tree with green leaves and a round brown trunk under a yellow circle sun."),
    ("detoxing", "A stick figure crossing its arms and saying 'NO' to a glowing rectangle."),
    ("biological weapon", "A stick figure standing next to a giant hand-drawn bomb with a phone screen on it."),
    ("trap", "A simple hand-drawn bear trap with a phone placed in the middle."),
    # Beat 2: Setup the Science
    ("evolutionary mismatch", "A stick figure wearing caveman animal skins standing in front of a giant laptop."),
    ("afflictions", "A stick figure with a sad wavy mouth and teardrops coming from its dot eyes."),
    ("nomadic", "Three simple stick figures standing in a line holding hands under a blue sky."),
    ("hunter-gatherers", "A stick figure holding a simple bow and arrow, aiming at a round target."),
    ("survival", "A stick figure escaping from a giant stick animal that looks like a mammoth."),
    ("scarcity", "A stick figure with an empty bowl and a sad face, ribs drawn as simple horizontal lines."),
    ("VTA", "A simple diagram showing a human head with a pathway highlighted in bright yellow from the base to the front."),
    ("dopamine reward", "A stick figure with a huge smiley face and yellow stars radiating from its head."),
    ("neurobiologists", "A stick figure pointing a stick at a blackboard that has simple drawings of molecules on it."),
    ("Hofmann", "A simple drawing of a textbook with 'HOFMANN 2012' written on the cover."),
    ("track", "A stick figure writing on a clipboard with a giant magnifying glass."),
    ("media and smartphones", "A pile of black rectangles with blue screens and a stick figure looking overwhelmed."),
    ("physiological needs", "A stick figure eating a simple chicken leg and another stick figure sleeping under a blanket."),
    ("distinguish", "A stick figure standing at a fork in the road, pointing left to a berry and right to a phone."),
    # Beat 3: The Ancient World
    ("savanna", "A wide landscape with a simple drawing of a yellow sun, blue sky, and a single acacia tree."),
    ("calories", "A stick figure holding a giant red apple that is larger than its head."),
    ("social information", "Two stick figures talking with speech bubbles that contain simple drawings of stick people."),
    ("berry", "A simple green cloud shape (bush) with red dots (berries) scattered on it."),
    ("harvest", "A stick figure holding a basket and putting red berry dots into it."),
    ("anticipation", "A stick figure looking through binoculars with a huge smile on its face."),
    ("neurochemical engine", "A stick figure with a cartoon engine drawn on its chest, smoke coming out."),
    ("ridge", "A stick figure walking up a simple black line representing a mountain ridge."),
    ("exhaustion", "A stick figure lying flat on the ground with its head down and tongue sticking out."),
    ("compass", "A simple compass with a red needle pointing to a red berry."),
    ("self-limiting", "A stick figure sitting down next to a pile of berries, holding its stomach with a happy face."),
    ("starvation", "A stick figure looking thin with simple lines representing bones."),
    ("rest", "A stick figure sleeping on a simple hammock tied between two green trees."),
    ("hunt", "A stick figure running after a simple mammoth drawing with a spear."),
    # Beat 4: The Jump to Now
    ("twenty-first century", "A skyline of simple black rectangle buildings with square windows under a gray sky."),
    ("digital savanna", "A group of trees where the leaves are replaced by glowing phone screens."),
    ("swipe down", "A close up of a hand made of thin lines touching a black phone screen, a curved arrow pointing down."),
    ("exploit", "A giant cartoon hand with dollar signs on it holding a puppet strings attached to a stick figure."),
    ("intermittent", "A slot machine made of a simple box with a lever, showing a question mark."),
    ("advertisement", "A screen showing a giant yellow star with the word 'BUY' written inside in crude letters."),
    ("mundane", "A stick figure looking bored, with a single straight line for a mouth."),
    ("shocking news", "A stick figure with its jaw dropped to the floor, eyes wide open in surprise."),
    ("direct message", "A stick figure looking at a phone screen with a small envelope icon flashing next to it."),
    ("activation", "A stick figure plugged into a wall outlet, sparks flying out of its head."),
    ("boundary", "A stick figure hitting its head against a solid black wall under a red stop sign."),
    ("feed", "A stick figure holding a fork and eating a stream of tiny letter characters coming out of a phone."),
    # Beat 5: The Dark Implication
    ("willpower", "A stick figure trying to push a giant boulder up a hill, sweat drops flying."),
    ("limits", "A stick figure standing behind a red fence with a phone on the other side."),
    ("cognitive cost", "A stick figure holding its head with both hands, multiple scribbles drawn above its head to show confusion."),
    ("Ward", "A simple drawing of a textbook with 'WARD 2017' written on the cover."),
    ("desk", "A stick figure sitting at a desk with a phone next to it, a dotted line showing energy draining from its head."),
    ("brain drain", "A stick figure's head drawn as a sink with a water faucet running, and a phone sitting in the sink drain."),
    ("working memory", "A stick figure trying to hold five giant balls labeled 'A', 'B', 'C', 'D', 'E' at the same time."),
    ("portal", "A simple dark portal drawing with purple lines swirling around a stick figure."),
    ("validation", "Three stick figures clapping and pointing at a central stick figure with a crown."),
    ("braced", "A stick figure standing in a defensive shield pose under a blue umbrella."),
    ("silent", "A stick figure with its mouth taped shut with a simple grey strip."),
    # Beat 6: The Evidence
    ("striatum", "A simple diagram of a human head with a pathway highlighted in bright yellow from the base to the front."),
    ("striatal", "A simple diagram of a human head with a pathway highlighted in bright yellow from the base to the front."),
    ("millisecond delay", "A simple clock drawing with hands spinning fast."),
    ("design choice", "A stick figure sitting at a drawing board with a blueprint of a phone screen."),
    ("Wu", "A simple drawing of a textbook with 'WU 2016' written on the cover."),
    ("decision-making", "A stick figure standing at a crossroads with signs pointing to 'GOOD' and 'BAD'."),
    ("consciously", "A stick figure thinking with a giant glowing lightbulb above its head."),
    ("life-or-death", "A stick figure balanced on a tightrope over a pit of red scribbles representing fire."),
    # Beat 7: The Resonant Close
    ("guilt", "A stick figure sitting on the floor with its head in its hands, looking sad."),
    ("moral failure", "A stick figure with a red 'X' drawn over its chest, looking down cast."),
    ("discipline", "A stick figure standing tall with a straight back and crossed arms, looking determined."),
    ("tragedy", "A stick figure crying next to a broken heart icon."),
    ("consumption", "A stick figure holding a fork and knife, looking at an empty plate."),
    ("stopped hunting", "A stick figure putting down a spear and sitting by a simple campfire under a night sky."),
    ("screen", "A stick figure trapped inside a giant TV screen, waving its hands to get out."),
]

style_constraint = ", Style constraint: An extremely simple childish drawing made in MS Paint. Looks like an amateur drew it quickly by hand. White background, thick uneven black outlines, wobbly hand-drawn lines, simple stick figure human with round head and line body, simple dot eyes, flat colors only, no realistic shading, no 3D, no cinematic lighting, horizontal 16:9 frame format."

# Process narration text and divide into beats and words
current_beat = 1
words_by_beat = {1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: []}

for line in lines:
    line = line.strip()
    if not line:
        continue
    # Check for beat markers
    match = re.match(r"\[BEAT (\d+):", line)
    if match:
        current_beat = int(match.group(1))
        continue
    # Tokenize words
    words = line.split()
    words_by_beat[current_beat].extend(words)

# Group words into chunks of 5 to 8 words per beat
timeline = []
current_time_seconds = 0.0

# Speaking speed: 150 words per minute -> 2.5 words per second.
# That is ~0.4 seconds per word.
word_duration = 0.4

def format_time(seconds):
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins:02d}:{secs:02d}"

for beat_idx in range(1, 8):
    beat_words = words_by_beat[beat_idx]
    i = 0
    while i < len(beat_words):
        # Determine chunk size dynamically between 5 and 8 (preferring 6 or 7)
        chunk_size = 6
        if i + 8 >= len(beat_words):
            chunk_size = len(beat_words) - i
        elif (len(beat_words) - i) % 6 == 1 or (len(beat_words) - i) % 6 == 2:
            # Avoid trailing small chunks of 1-2 words
            chunk_size = 7
        
        chunk = beat_words[i:i+chunk_size]
        chunk_text = " ".join(chunk)
        
        # Calculate timestamps
        start_str = format_time(current_time_seconds)
        duration = len(chunk) * word_duration
        current_time_seconds += duration
        end_str = format_time(current_time_seconds)
        
        # Determine visual prompt
        image_action = ""
        chunk_lower = chunk_text.lower()
        for key, description in keyword_prompts:
            if key in chunk_lower:
                image_action = description
                break
        
        # Fallback prompts per beat if no keyword matches
        if not image_action:
            beat_fallbacks = {
                1: "A simple stick figure holding a glowing black rectangle (phone) with waves radiating from it.",
                2: "A stick figure pointing a stick at a large blackboard with simple graphs and science equations.",
                3: "A stick figure walking in a simple prehistoric savanna landscape with a sun and grass.",
                4: "A stick figure scrolling down on a giant black phone screen with message bubbles popping up.",
                5: "A stick figure sitting at a computer desk with its hands on its head, looking exhausted.",
                6: "A stick figure pointing at a whiteboard with a line chart showing a spike in the line.",
                7: "A stick figure sitting on a green ground under a sky full of simple yellow star drawings."
            }
            image_action = beat_fallbacks.get(beat_idx, "A simple stick figure standing next to a giant arrow.")
            
        full_image_prompt = image_action + style_constraint
        
        timeline.append({
            "start_time": start_str,
            "end_time": end_str,
            "narration": chunk_text,
            "image_prompt": full_image_prompt
        })
        
        i += chunk_size

# Metadata and general fields
video_title = "Your Brain Treats Your Phone Like a Savanna (Why You Can't Stop)"

video_description = (
    "Every time you pick up your phone, your dopamine system fires the same signal it fired when your ancestors found food in the forest. "
    "You scroll not because you are satisfied, but because your ancient brain is convinced that the next swipe will finally bring the resource that allows it to stop.\n\n"
    "This video explores the evolutionary mismatch of digital foraging — why your inability to stop scrolling is actually an ancient seeking pathway "
    "that evolved to motivate search behavior in a resource-scarce world that no longer exists.\n\n"
    "━━━━━━━━━━━━━━━━━━━━━\n"
    "WATCH NEXT\n"
    "━━━━━━━━━━━━━━━━━━━━━\n"
    "Why Modern People Are So Lonely: [Link Pending]\n"
    "Your Anxiety Is Not a Disorder: [Link Pending]\n\n"
    "━━━━━━━━━━━━━━━━━━━━━\n"
    "SOURCES\n"
    "━━━━━━━━━━━━━━━━━━━━━\n"
    "1. Hofmann, W., Vohs, K. D., & Baumeister, R. F. (2012). What people desire, feel conflict about, and try to resist in everyday life. Psychological Science, 23(6), 582-588. DOI: 10.1177/0956797612437426\n"
    "2. Ward, A. F., Duke, K., Gneezy, A., & Bos, M. W. (2017). Brain drain: The mere presence of one’s own smartphone reduces available cognitive capacity. Journal of the Association for Consumer Research, 2(2), 140-154. DOI: 10.1086/691462\n"
    "3. Wu, M., Childs, E., & de Wit, H. (2016). Intermittent reinforcement and dopamine striatal release in humans. Neuropsychopharmacology, 41(3), 880-888. DOI: 10.1038/npp.2015.213\n\n"
    "#evolutionarymismatch #ancienthumans #humanevolution #anthropology #psychology #phoneaddiction"
)

cta_comment = (
    "If you put a wild animal in a cage with unlimited food and flashing lights, it will eat itself to death. "
    "We have done the exact same thing to ourselves. How many hours did your screen time report show this week? "
    "Let's talk in the comments below."
)

thumbnail_prompt = (
    "A split-screen visual. Left side: Warm sepia tones showing a prehistoric hunter-gatherer silhouette holding a spear in a wild savanna. "
    "Right side: Cool neon blue and purple tones showing a modern silhouette slumped over a glowing desk screen. "
    "Centered bottom text overlays bold white text reading: 'THE TRAP' with a yellow accent word: 'ANCIENT SOFTWARE'. "
    "High contrast, center focused, no realistic human faces, simple graphic design look."
)

output_json = {
    "video_title": video_title,
    "video_description": video_description,
    "cta_comment": cta_comment,
    "thumbnail_prompt": thumbnail_prompt,
    "timeline": timeline
}

# Write output JSON to file
with open(json_path, "w", encoding="utf-8") as f:
    json.dump(output_json, f, indent=2, ensure_ascii=False)

print(f"Successfully generated JSON with {len(timeline)} timeline elements!")
