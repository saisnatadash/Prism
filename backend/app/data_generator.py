"""Synthetic multilingual citizen-report simulator for PRISM.

Generates 300 reports over a simulated 24-hour window in Bhubaneswar: mostly
unrelated background chatter, plus ONE emerging water-contamination event
that builds gradually (weak signals -> vomiting reports -> a dead-fish
report -> spread to a neighbouring ward -> supporting evidence -> a
contradicting official statement), all timestamped in-order.

Usage:
    python -m app.data_generator            # writes backend/data/seed_reports.json
    from app.data_generator import generate_reports, load_seed_file
"""

from __future__ import annotations

import json
import random
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

IST = timezone(timedelta(hours=5, minutes=30))
SIMULATION_DATE = date.today()

DEFAULT_SEED_PATH = Path(__file__).resolve().parent.parent / "data" / "seed_reports.json"

# ---------------------------------------------------------------------------
# Geography: approximate Bhubaneswar localities used as "wards".
# ---------------------------------------------------------------------------

LOCALITIES: dict[str, tuple[float, float]] = {
    "Old Town (Ward 12)": (20.2350, 85.8330),
    "Kharavela Nagar (Ward 9)": (20.2700, 85.8380),
    "Saheed Nagar": (20.2955, 85.8430),
    "Nayapalli": (20.2925, 85.8145),
    "Chandrasekharpur": (20.3350, 85.8190),
    "Patia": (20.3550, 85.8230),
    "Khandagiri": (20.2585, 85.7790),
    "Jaydev Vihar": (20.2965, 85.8115),
    "Rasulgarh": (20.2980, 85.8580),
    "Bapuji Nagar": (20.2650, 85.8390),
    "Laxmisagar": (20.2760, 85.8480),
    "Vani Vihar": (20.2960, 85.8290),
    "Sailashree Vihar": (20.3310, 85.8110),
    "Baramunda": (20.2870, 85.7930),
    "Sundarpada": (20.2380, 85.7960),
    "Ghatikia": (20.2660, 85.7930),
    "Kalinga Nagar": (20.3480, 85.7860),
    "Tomando": (20.2200, 85.8100),
    "Palasuni": (20.3020, 85.8650),
    "Niladri Vihar": (20.3280, 85.7950),
}

EPICENTER_WARD = "Old Town (Ward 12)"
SPREAD_WARD = "Kharavela Nagar (Ward 9)"
ALL_WARDS = list(LOCALITIES.keys())

RELATIVES = {
    "en": ["father", "mother", "son", "daughter", "wife", "husband", "brother", "sister", "neighbor", "grandmother"],
    "hi": ["पिता", "माँ", "बेटे", "बेटी", "पत्नी", "पति", "भाई", "बहन", "पड़ोसी", "दादी"],
    "or": ["ବାପା", "ମାଆ", "ପୁଅ", "ଝିଅ", "ସ୍ତ୍ରୀ", "ସ୍ୱାମୀ", "ଭାଇ", "ଭଉଣୀ", "ପଡ଼ୋଶୀ", "ଜେଜେମାଆ"],
}


@dataclass
class ReportSpec:
    text: str
    language: str
    ward: str
    hour: int
    event_tag: str
    channel: str = "simulated"


def _jitter(lat: float, lon: float, rng: random.Random, spread: float = 0.004) -> tuple[float, float]:
    return (
        round(lat + rng.uniform(-spread, spread), 6),
        round(lon + rng.uniform(-spread, spread), 6),
    )


def _pick_hour(rng: random.Random, weights: dict[int, float]) -> int:
    hours = list(weights.keys())
    probs = list(weights.values())
    return rng.choices(hours, weights=probs, k=1)[0]


# ---------------------------------------------------------------------------
# Background chatter templates (~65% of the dataset) — traffic, electricity,
# garbage collection, local events. No connection to the water event.
# ---------------------------------------------------------------------------

BACKGROUND_TEMPLATES: dict[str, list[str]] = {
    "en": [
        "Heavy traffic jam near {ward} junction since morning, signal not working.",
        "Traffic police missing at {ward} crossing, vehicles stuck for 20 minutes.",
        "Illegal parking on the main road in {ward} blocking one lane.",
        "Pothole near {ward} bus stop causing traffic slowdown.",
        "Power cut in {ward} since {hour12}, no update from the Discom yet.",
        "Frequent voltage fluctuation in {ward}, appliances getting damaged.",
        "Streetlights not working on the main road in {ward} for a week now.",
        "Transformer sparking near {ward} market, please send a technician.",
        "Garbage not collected in {ward} for three days, smell is unbearable.",
        "Municipal truck skipped our lane in {ward} again this week.",
        "Overflowing dustbin near {ward} park needs urgent clearance.",
        "Stray dogs spreading garbage on the {ward} main road every morning.",
        "Durga Puja pandal committee meeting held in {ward} community hall today.",
        "Local cricket tournament finals happening at {ward} ground this evening.",
        "Road closed in {ward} for a wedding procession till 9pm.",
        "Free health check-up camp organized in {ward} tomorrow morning.",
        "New vegetable market has opened near {ward} crossing, quite crowded.",
        "Noise complaint: loudspeaker from a function in {ward} playing till late.",
        "Stray cattle blocking the {ward} main road again this morning.",
        "Water tanker arrived late in {ward} today, long queue at the stand post.",
    ],
    "hi": [
        "{ward} चौराहे पर सुबह से भारी जाम है, सिग्नल खराब है।",
        "{ward} mein traffic jam laga hai, signal kaam nahi kar raha.",
        "{ward} के पास गलत पार्किंग की वजह से एक लेन बंद है।",
        "{ward} में {hour12} से बिजली गुल है, कोई सूचना नहीं मिली।",
        "{ward} mein baar baar light chali jaati hai, appliance kharab ho rahe hain.",
        "{ward} की मुख्य सड़क पर स्ट्रीट लाइट हफ्ते भर से खराब है।",
        "{ward} में तीन दिन से कचरा नहीं उठाया गया, बदबू आ रही है।",
        "{ward} ki gali mein kachra truck nahi aaya is hafte.",
        "{ward} पार्क के पास कूड़ेदान भर गया है, सफाई जरूरी है।",
        "{ward} सामुदायिक भवन में आज शाम पूजा समिति की बैठक है।",
        "{ward} ground mein cricket tournament ka final aaj shaam ko hai.",
        "{ward} mein baraat ke chalte raat 9 baje tak road band rahega.",
        "{ward} mein aawara pashu subah se road jam kar rahe hain.",
        "{ward} mein aaj bhi paani ka tanker der se aaya, lambi line lagi.",
    ],
    "or": [
        "{ward} ଛକରେ ସକାଳୁ ପ୍ରବଳ ଯାନଜଟ, ସିଗନାଲ୍ ଖରାପ ହୋଇଛି।",
        "{ward} area re traffic jam heichi, police nahaanti.",
        "{ward} ରେ {hour12} ଠାରୁ ବିଦ୍ୟୁତ୍ ନାହିଁ, କୌଣସି ସୂଚନା ମିଳିଲାନାହିଁ।",
        "{ward} re light bara bara jaauchi, jinis nasta heuchi.",
        "{ward} ମୁଖ୍ୟ ରାସ୍ତାରେ ଷ୍ଟ୍ରିଟ୍ ଲାଇଟ୍ ଗତ ସପ୍ତାହରୁ ଖରାପ ଅଛି।",
        "{ward} ରେ ତିନି ଦିନ ହେଲା ଆବର୍ଜନା ଉଠାଯାଇ ନାହିଁ, ଦୁର୍ଗନ୍ଧ ଆସୁଛି।",
        "{ward} re aji municipal truck asini, kachra jama heichi.",
        "{ward} ପାର୍କ ପାଖରେ ଆବର୍ଜନା ପାତ୍ର ଭରି ଯାଇଛି।",
        "{ward} ସାମୁଦାୟିକ ଭବନରେ ଆଜି ସନ୍ଧ୍ୟାରେ ପୂଜା କମିଟି ବୈଠକ ଅଛି।",
        "{ward} ground re aji sandhya re cricket tournament final heba.",
        "{ward} ରେ ବରଯାତ୍ରା ପାଇଁ ରାତି ୯ଟା ପର୍ଯ୍ୟନ୍ତ ରାସ୍ତା ବନ୍ଦ ରହିବ।",
        "{ward} re gai gawru sakalu ru rasta jam karideichanti.",
    ],
}

WEAK_SIGNAL_TEMPLATES = [
    ("en", "Tap water tastes a bit off this morning in {ward}, anyone else noticing it?"),
    ("hi", "{ward} में आज सुबह नल के पानी से थोड़ी अजीब गंध आ रही है।"),
    ("or", "{ward} ରେ ଆଜି ପାଣିର ସ୍ୱାଦ ଟିକେ ଅଲଗା ଲାଗୁଛି, ଅନ୍ୟ କେହି ଲକ୍ଷ୍ୟ କଲେ କି?"),
]

VOMITING_TEMPLATES: dict[str, list[str]] = {
    "en": [
        "My {relative} has been vomiting since morning after drinking tap water in {ward}.",
        "Sudden stomach pain and vomiting reported by {n} people on our street in {ward}.",
        "Went to the local clinic in {ward}, doctor says several patients came in today with vomiting and loose motions.",
        "Feeling nauseous since afternoon, a few neighbors in {ward} complaining of the same thing.",
        "{n} children in our lane in {ward} fell sick with vomiting after school today.",
    ],
    "hi": [
        "{ward} में मेरे {relative} को सुबह से उल्टी हो रही है, नल का पानी पीने के बाद से।",
        "{ward} ki gali mein {n} log ulti aur pet dard ki shikayat kar rahe hain.",
        "{ward} ke clinic mein aaj bahut saare mareez ulti-dast lekar aaye hain.",
        "{ward} mein dopahar se jee michla raha hai, padosi bhi yahi keh rahe hain.",
        "{ward} में {n} बच्चों को स्कूल से लौटने के बाद उल्टी शुरू हो गई।",
        "{ward} ke {relative} ko pichhle kuch ghanton se pet mein bahut dard hai.",
    ],
    "or": [
        "{ward} ରେ ମୋ {relative} ଙ୍କୁ ସକାଳୁ ଠାରୁ ବାନ୍ତି ହେଉଛି, ଟାପ୍ ପାଣି ପିଇବା ପରେ।",
        "{ward} ଅଞ୍ଚଳରେ {n} ଜଣ ପେଟ ଯନ୍ତ୍ରଣା ଓ ବାନ୍ତିର ଅଭିଯୋଗ କରୁଛନ୍ତି।",
        "{ward} clinic re aji bohut lok pet kharap o banti niye asichanti.",
        "{ward} re {n} jana pilha school ru firi asi banti kariba lagila.",
        "{ward} ରେ ମୋ {relative} ଙ୍କର ପେଟ ବହୁତ ଖରାପ ହୋଇଯାଇଛି ଗତ କିଛି ଘଣ୍ଟା ଧରି।",
    ],
}

DEAD_FISH_TEMPLATES = [
    ("en", "Dozens of dead fish floating in the canal behind {ward} market this afternoon, terrible smell."),
    ("or", "{ward} ପଛପାଖ ନାଳରେ ଆଜି ଅପରାହ୍ନରେ ବହୁତ ମରା ମାଛ ଭାସୁଛି, ବହୁତ ଦୁର୍ଗନ୍ଧ।"),
]

SPREAD_EXPLICIT_TEMPLATES: dict[str, list[str]] = {
    "en": [
        "Same vomiting problem now being reported in {ward} too, not just Old Town.",
        "Looks like whatever is happening in Old Town has reached {ward} as well.",
    ],
    "hi": [
        "{ward} mein bhi ab wahi ulti wali shikayat aa rahi hai jo Old Town mein thi.",
    ],
}

SUPPORTING_EVIDENCE_TEMPLATES = [
    ("en", "Municipal workers found a cracked sewer pipe running right next to the main water line near {ward} pumping station, repair crew is on site now."),
    ("hi", "{ward} पंपिंग स्टेशन के पास पानी की मुख्य लाइन के ठीक बगल में सीवर पाइप टूटी मिली है, मरम्मत टीम मौके पर पहुंच गई है।"),
    ("or", "{ward} ପମ୍ପିଂ ଷ୍ଟେସନ ପାଖରେ ମୁଖ୍ୟ ପାଣି ଲାଇନ ପାଖରେ ଏକ ଭଙ୍ଗା ଡ୍ରେନ ପାଇପ ମିଳିଛି, ମରାମତି ଦଳ ଘଟଣାସ୍ଥଳରେ ପହଞ୍ଚିଛନ୍ତି।"),
]

CONTRADICTORY_EVIDENCE_TEMPLATES = [
    ("en", "Update from PHE department: the water sample collected from {ward} tested normal today, no contamination detected."),
    ("hi", "डॉक्टर का कहना है कि उल्टी के मामले सिर्फ एक परिवार तक सीमित हैं, शायद बासी खाने की वजह से, पानी से जुड़ा नहीं लगता।"),
]


def _make_ts(hour: int, rng: random.Random) -> datetime:
    minute = rng.randint(0, 59)
    second = rng.randint(0, 59)
    return datetime.combine(SIMULATION_DATE, datetime.min.time(), tzinfo=IST) + timedelta(
        hours=hour, minutes=minute, seconds=second
    )


def _gen_background(n: int, rng: random.Random) -> list[ReportSpec]:
    # Daytime-weighted hour distribution: garbage/traffic mornings, events
    # evenings, electricity complaints any time.
    hour_weights = {h: (3.0 if 7 <= h <= 21 else 0.4) for h in range(24)}
    specs = []
    for _ in range(n):
        lang = rng.choices(["en", "hi", "or"], weights=[0.45, 0.3, 0.25])[0]
        template = rng.choice(BACKGROUND_TEMPLATES[lang])
        ward = rng.choice(ALL_WARDS)
        hour = _pick_hour(rng, hour_weights)
        text = template.format(ward=ward, hour12=f"{((hour - 1) % 12) + 1} {'AM' if hour < 12 else 'PM'}")
        specs.append(ReportSpec(text=text, language=lang, ward=ward, hour=hour, event_tag="background"))
    return specs


def _gen_weak_signal(rng: random.Random) -> list[ReportSpec]:
    hours = [6, 7, 8]
    specs = []
    for hour, (lang, template) in zip(hours, WEAK_SIGNAL_TEMPLATES):
        text = template.format(ward=EPICENTER_WARD)
        specs.append(ReportSpec(text=text, language=lang, ward=EPICENTER_WARD, hour=hour, event_tag="weak_signal"))
    return specs


def _gen_vomiting(n: int, ward: str, hour_weights: dict[int, float], rng: random.Random, explicit_spread_ratio: float = 0.0) -> list[ReportSpec]:
    specs = []
    for i in range(n):
        lang = rng.choices(["en", "hi", "or"], weights=[0.45, 0.3, 0.25])[0]
        use_explicit = explicit_spread_ratio > 0 and rng.random() < explicit_spread_ratio and lang in SPREAD_EXPLICIT_TEMPLATES
        if use_explicit:
            template = rng.choice(SPREAD_EXPLICIT_TEMPLATES[lang])
            text = template.format(ward=ward)
        else:
            template = rng.choice(VOMITING_TEMPLATES[lang])
            text = template.format(
                ward=ward,
                relative=rng.choice(RELATIVES[lang]),
                n=rng.randint(2, 8),
            )
        hour = _pick_hour(rng, hour_weights)
        tag = "escalation_spread" if ward == SPREAD_WARD else "escalation_vomiting"
        specs.append(ReportSpec(text=text, language=lang, ward=ward, hour=hour, event_tag=tag))
    return specs


def _gen_dead_fish(rng: random.Random) -> list[ReportSpec]:
    hours = [13, 14]
    specs = []
    for hour, (lang, template) in zip(hours, DEAD_FISH_TEMPLATES):
        text = template.format(ward=EPICENTER_WARD)
        specs.append(ReportSpec(text=text, language=lang, ward=EPICENTER_WARD, hour=hour, event_tag="escalation_dead_fish"))
    return specs


def _gen_supporting(rng: random.Random) -> list[ReportSpec]:
    hours = [19, 20, 20]
    specs = []
    for hour, (lang, template) in zip(hours, SUPPORTING_EVIDENCE_TEMPLATES):
        text = template.format(ward=EPICENTER_WARD)
        specs.append(ReportSpec(text=text, language=lang, ward=EPICENTER_WARD, hour=hour, event_tag="supporting_evidence"))
    return specs


def _gen_contradictory(rng: random.Random) -> list[ReportSpec]:
    hours = [21, 22]
    specs = []
    for hour, (lang, template) in zip(hours, CONTRADICTORY_EVIDENCE_TEMPLATES):
        text = template.format(ward=EPICENTER_WARD)
        specs.append(ReportSpec(text=text, language=lang, ward=EPICENTER_WARD, hour=hour, event_tag="contradictory_evidence"))
    return specs


def generate_reports(count: int = 300, seed: int = 42) -> list[dict]:
    """Generate `count` synthetic reports with one planted water-contamination event.

    Returns a list of plain dicts (JSON-serializable), sorted by simulated
    timestamp, each with: text, language, lat, lon, ward, reported_at (ISO
    8601), channel, event_tag, seq.
    """
    rng = random.Random(seed)

    n_weak = 3
    n_dead_fish = 2
    n_supporting = 3
    n_contradictory = 2
    n_vomiting = 48
    n_spread = 47
    n_background = count - (n_weak + n_dead_fish + n_supporting + n_contradictory + n_vomiting + n_spread)

    vomiting_hour_weights = {h: 0.0 for h in range(24)}
    for h in range(10, 20):
        vomiting_hour_weights[h] = 1.0 + (h - 10) * 0.6  # ramps up through the day

    spread_hour_weights = {h: 0.0 for h in range(24)}
    for h in range(15, 23):
        spread_hour_weights[h] = 1.0 + (h - 15) * 0.5  # starts later, also ramps up

    specs: list[ReportSpec] = []
    specs += _gen_background(n_background, rng)
    specs += _gen_weak_signal(rng)
    specs += _gen_vomiting(n_vomiting, EPICENTER_WARD, vomiting_hour_weights, rng)
    specs += _gen_dead_fish(rng)
    specs += _gen_vomiting(n_spread, SPREAD_WARD, spread_hour_weights, rng, explicit_spread_ratio=0.12)
    specs += _gen_supporting(rng)
    specs += _gen_contradictory(rng)

    reports = []
    for spec in specs:
        lat, lon = LOCALITIES[spec.ward]
        jlat, jlon = _jitter(lat, lon, rng)
        ts = _make_ts(spec.hour, rng)
        reports.append(
            {
                "text": spec.text,
                "language": spec.language,
                "lat": jlat,
                "lon": jlon,
                "ward": spec.ward,
                "reported_at": ts.isoformat(),
                "channel": spec.channel,
                "event_tag": spec.event_tag,
            }
        )

    reports.sort(key=lambda r: r["reported_at"])
    for i, r in enumerate(reports):
        r["seq"] = i

    return reports


def write_seed_file(path: Path = DEFAULT_SEED_PATH, count: int = 300, seed: int = 42) -> Path:
    reports = generate_reports(count=count, seed=seed)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(reports, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def load_seed_file(path: Path = DEFAULT_SEED_PATH) -> list[dict]:
    """Load a previously generated seed file. Generates one on the fly if missing."""
    if not path.exists():
        write_seed_file(path)
    return json.loads(path.read_text(encoding="utf-8"))


def _print_summary(reports: list[dict]) -> None:
    from collections import Counter

    by_tag = Counter(r["event_tag"] for r in reports)
    by_lang = Counter(r["language"] for r in reports)
    print(f"Generated {len(reports)} reports for {SIMULATION_DATE.isoformat()}")
    print("By event_tag:")
    for tag, n in by_tag.most_common():
        print(f"  {tag:24s} {n:4d} ({n / len(reports):.1%})")
    print("By language:")
    for lang, n in by_lang.most_common():
        print(f"  {lang:24s} {n:4d} ({n / len(reports):.1%})")
    print(f"Time range: {reports[0]['reported_at']} -> {reports[-1]['reported_at']}")


if __name__ == "__main__":
    out_path = write_seed_file()
    data = json.loads(out_path.read_text(encoding="utf-8"))
    print(f"Wrote {out_path}")
    _print_summary(data)
