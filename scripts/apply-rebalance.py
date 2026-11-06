"""Apply the 27 rebalance proposals (from /tmp/rebalance-proposals.json) to the
five old-deck bank files. Data-only. Fails loudly on any mismatch.

Rules:
- Inline difficulty/baseXP fields are replaced in place (quote style kept).
- Jet Setter / Errand are builder-generated: difficulty comes from
  `cardType === 'Lore' ? 'medium' : 'easy'`, so those six cards get an
  explicit `difficulty: 'easy'` override on the raw definition, and the
  builder is taught to respect `card.difficulty ?? <lore rule>`.
- The 5 Heatwave rewrites replace the sentence in description, theAsk,
  shortPrompt AND mission (all four carry the same text; leaving the old
  metaphor in any of them would leave the card half-fixed).
"""
import json, re, sys

PROPOSALS = json.load(open("/tmp/rebalance-proposals.json"))

REWRITES = {
    "heatwave-01": (
        "Capture something that looks personally affected by summer.",
        "Capture something the heat got to \u2014 wilted, faded, melted, or just sweating.",
    ),
    "heatwave-05": (
        "Capture proof of vacation energy in a normal place.",
        "Capture vacation energy somewhere normal \u2014 sandals at the store, sunglasses indoors, a drink with an umbrella.",
    ),
    "heatwave-08": (
        "Take one photo that proves you entered this chapter of the day.",
        "Take one photo of the moment the day turned \u2014 a new place, a new plan, a new mood.",
    ),
    "heatwave-10": (
        "Capture your current energy as a weather report.",
        "Show today like a weather report \u2014 sunny, stormy, foggy, or clear \u2014 with a photo of what feels like your mood.",
    ),
    "heatwave-12": (
        "Capture the group\u2019s current emotional forecast.",
        "Capture the crew's mood right now \u2014 hyped, wiped, hangry, or unbothered.",
    ),
}

FILE_MAP = {
    "starter-": "src/data/starterMissionBank.ts",
    "socal-": "src/data/socalSummerChallengeBank.ts",
    "heatwave-": "src/data/heatwaveChallengeBank.ts",
    "jet-setter-": "src/data/jetSetterChallengeBank.ts",
    "errand-deck-": "src/data/errandDeckChallengeBank.ts",
}

def file_for(card_id):
    for prefix, path in FILE_MAP.items():
        if card_id.startswith(prefix):
            return path
    raise ValueError(f"no bank file for {card_id}")

def card_span(lines, card_id):
    """Return (start, end) line indices for the card object (inclusive start, exclusive end)."""
    start = None
    for i, ln in enumerate(lines):
        if re.search(rf"id:\s*[\"']{re.escape(card_id)}[\"']", ln):
            start = i
            break
    if start is None:
        raise ValueError(f"card {card_id} not found")
    for j in range(start + 1, len(lines)):
        if re.match(r"^  \},?$", lines[j]):
            return start, j + 1
    raise ValueError(f"no closing brace for {card_id}")

changes = []
edits = {}  # path -> list of (path) to write later

for p in PROPOSALS:
    cid = p["id"]
    path = file_for(cid)
    lines = edits.get(path)
    if lines is None:
        lines = open(path).read().split("\n")
        edits[path] = lines
    s, e = card_span(lines, cid)
    span = "\n".join(lines[s:e])

    # --- difficulty ---
    m = re.search(r"difficulty:\s*([\"'])(\w+)\1", span)
    if m:
        if m.group(2) != p["currentDifficulty"]:
            raise ValueError(f"{cid}: current difficulty {m.group(2)} != proposal {p['currentDifficulty']}")
        if m.group(2) != p["proposedDifficulty"]:
            span = span.replace(
                f"difficulty: {m.group(1)}{m.group(2)}{m.group(1)}",
                f"difficulty: {m.group(1)}{p['proposedDifficulty']}{m.group(1)}",
                1,
            )
            changes.append(f"{cid}: difficulty {m.group(2)} -> {p['proposedDifficulty']}")
    else:
        # builder bank: add an explicit override after the cardType line
        if not re.search(r"cardType:\s*'Lore'", span):
            raise ValueError(f"{cid}: no inline difficulty and not a Lore card — cannot apply")
        span = re.sub(
            r"(cardType:\s*'Lore',\n)",
            r"\1    difficulty: 'easy',\n",
            span,
            count=1,
        )
        changes.append(f"{cid}: difficulty override 'easy' added (builder Lore default bypassed)")

    # --- baseXP ---
    m = re.search(r"baseXP:\s*(\d+)", span)
    if m:
        if int(m.group(1)) != p["currentBaseXP"]:
            raise ValueError(f"{cid}: current baseXP {m.group(1)} != proposal {p['currentBaseXP']}")
        if int(m.group(1)) != p["proposedBaseXP"]:
            span = span.replace(f"baseXP: {m.group(1)}", f"baseXP: {p['proposedBaseXP']}", 1)
            changes.append(f"{cid}: baseXP {m.group(1)} -> {p['proposedBaseXP']}")
    else:
        if p["currentBaseXP"] != p["proposedBaseXP"]:
            raise ValueError(f"{cid}: no inline baseXP but proposal changes it")

    # --- rewrite ---
    if cid in REWRITES:
        old, new = REWRITES[cid]
        count = span.count(old)
        if count != 4:
            raise ValueError(f"{cid}: expected rewrite sentence in 4 fields, found {count}")
        span = span.replace(old, new)
        changes.append(f"{cid}: description/theAsk/shortPrompt/mission rewritten")

    lines[s:e] = span.split("\n")

# --- builder support for the difficulty override (jet-setter + errand) ---
for path, iface, builder_old in [
    ("src/data/jetSetterChallengeBank.ts", "JetSetterCardDefinition",
     "difficulty: card.cardType === 'Lore' ? 'medium' : 'easy',"),
    ("src/data/errandDeckChallengeBank.ts", "ErrandCardDefinition",
     "difficulty: card.cardType === 'Lore' ? 'medium' : 'easy',"),
]:
    lines = edits.get(path)
    if lines is None:
        lines = open(path).read().split("\n")
        edits[path] = lines
    text = "\n".join(lines)
    # 1. interface: add optional difficulty field after the cardType line
    m = re.search(rf"(interface {iface} \{{.*?cardType: \w+;\n)", text, re.S)
    if not m:
        raise ValueError(f"{path}: interface {iface} not found")
    if "difficulty?:" not in text:
        text = text.replace(m.group(1), m.group(1) + "  difficulty?: 'easy' | 'medium' | 'hard';\n", 1)
        changes.append(f"{path}: {iface} gains optional difficulty override")
    # 2. builder: respect the override
    if "card.difficulty ??" not in text:
        if builder_old not in text:
            raise ValueError(f"{path}: builder difficulty line not found")
        text = text.replace(
            builder_old,
            "difficulty: card.difficulty ?? (card.cardType === 'Lore' ? 'medium' : 'easy'),",
            1,
        )
        changes.append(f"{path}: builder respects per-card difficulty override")
    edits[path] = text.split("\n")

for path, lines in edits.items():
    open(path, "w").write("\n".join(lines))

print(f"applied {len(changes)} changes across {len(edits)} files:")
for c in changes:
    print(" -", c)
