"""
LLM Mock Client - Genera eventi e impatti simulati.

In v1 questo modulo sostituisce il vero LLM con logica randomizzata
ma coerente. In futuro sara' sostituito da chiamate a OpenAI/Anthropic.

Interfaccia pubblica:
- generate_events_and_impacts(market_state, securities, templates) -> list[GeneratedEvent]
"""

import random
from dataclasses import dataclass, field
from typing import Optional, List


@dataclass
class EventImpact:
    """Singolo impatto di un evento su un titolo, settore o regione."""
    security_id: Optional[int] = None
    sector: Optional[str] = None
    region: Optional[str] = None
    impact_type: str = "multiplier"  # 'multiplier' o 'delta_percent'
    impact_value: float = 1.0


@dataclass
class GeneratedEvent:
    """Evento generato dal modulo LLM (o mock)."""
    title: str = ""
    body: str = ""
    category: str = ""
    template_id: Optional[int] = None
    impacts: List[EventImpact] = field(default_factory=list)


# ─── Catalogo di titoli/testi per il mock ────────────────────

_POSITIVE_HEADLINES = [
    ("Boom di investimenti nel settore {sector}",
     "Gli investitori istituzionali stanno aumentando significativamente le loro posizioni nel settore {sector}, spinti da risultati trimestrali superiori alle attese."),
    ("Forte crescita economica in {region}",
     "I dati macroeconomici provenienti da {region} mostrano una crescita del PIL superiore alle previsioni, trainando i mercati regionali."),
    ("{name} supera le stime degli analisti",
     "{name} ({ticker}) ha pubblicato risultati trimestrali ben oltre le aspettative, con ricavi in crescita del {pct}%."),
    ("Accordo commerciale favorisce i mercati di {region}",
     "Un nuovo accordo commerciale multilaterale promette di ridurre i dazi e stimolare gli scambi nella regione {region}."),
    ("Innovazione tecnologica rivoluziona il settore {sector}",
     "Una svolta tecnologica nel settore {sector} promette di aumentare la produttivita' e ridurre i costi operativi."),
]

_NEGATIVE_HEADLINES = [
    ("Crisi nel settore {sector}",
     "Il settore {sector} e' sotto pressione a causa di nuove regolamentazioni e calo della domanda globale."),
    ("Rallentamento economico in {region}",
     "I dati economici da {region} deludono: la crescita rallenta e la fiducia dei consumatori scende ai minimi."),
    ("{name} delude le aspettative",
     "{name} ({ticker}) ha riportato risultati sotto le stime, con un calo dei margini del {pct}%."),
    ("Tensioni geopolitiche colpiscono {region}",
     "Le crescenti tensioni geopolitiche in {region} stanno creando incertezza nei mercati finanziari."),
    ("Scandalo colpisce il settore {sector}",
     "Uno scandalo di vasta portata scuote il settore {sector}, con indagini in corso da parte delle autorita'."),
]

_NEUTRAL_HEADLINES = [
    ("Banca Centrale mantiene i tassi invariati",
     "Come previsto, la Banca Centrale ha deciso di mantenere invariati i tassi di interesse, in attesa di nuovi dati sull'inflazione."),
    ("Rotazione settoriale in corso nei mercati",
     "Gli investitori stanno spostando i capitali dal settore {sector} verso asset piu' difensivi."),
    ("Dati occupazionali misti da {region}",
     "Il mercato del lavoro in {region} mostra segnali contrastanti: occupazione stabile ma salari in leggero calo."),
]

# Intensita' -> range moltiplicatore
_INTENSITY_RANGES = {
    "low":    (0.97, 1.03),
    "medium": (0.92, 1.08),
    "high":   (0.85, 1.15),
}


def generate_events_and_impacts(
    market_state: dict,
    securities: list[dict],
    templates: list[dict]
) -> list[GeneratedEvent]:
    """
    Genera eventi e impatti mock basandosi sui template forniti.

    Args:
        market_state: stato corrente del mercato (ciclo, trend, ecc.)
        securities: lista dei titoli con settore, regione, prezzo
        templates: lista dei template evento selezionati per questo ciclo

    Returns:
        Lista di GeneratedEvent con impatti strutturati
    """
    if not templates:
        templates = [{"id": None, "category": "macroeconomia", "intensity_level": "medium"}]

    events = []

    # Raccogli settori e regioni disponibili
    sectors = list(set(s["sector"] for s in securities))
    regions = list(set(s["region"] for s in securities))

    for template in templates:
        intensity = template.get("intensity_level", "medium")
        category = template.get("category", "macroeconomia")
        template_id = template.get("id")
        target_sector = template.get("target_sector")
        target_region = template.get("target_region")

        # Scegli tipo di evento (positivo, negativo, neutro)
        event_type = random.choices(
            ["positive", "negative", "neutral"],
            weights=[0.35, 0.35, 0.30],
            k=1
        )[0]

        # Seleziona headline pool
        if event_type == "positive":
            pool = _POSITIVE_HEADLINES
        elif event_type == "negative":
            pool = _NEGATIVE_HEADLINES
        else:
            pool = _NEUTRAL_HEADLINES

        headline_template = random.choice(pool)

        # Scegli il target per formattazione
        chosen_sector = target_sector or random.choice(sectors)
        chosen_region = target_region or random.choice(regions)
        chosen_security = random.choice(
            [s for s in securities if s["sector"] == chosen_sector]
            or securities
        )

        # Formatta titolo e corpo
        fmt = {
            "sector": chosen_sector,
            "region": chosen_region,
            "name": chosen_security["name"],
            "ticker": chosen_security["ticker"],
            "pct": random.randint(5, 25),
        }
        title = headline_template[0].format(**fmt)
        body = headline_template[1].format(**fmt)

        # Genera impatti
        impacts = _generate_impacts(
            event_type=event_type,
            intensity=intensity,
            securities=securities,
            target_sector=target_sector or chosen_sector,
            target_region=target_region,
            chosen_security_id=chosen_security["id"]
        )

        events.append(GeneratedEvent(
            title=title,
            body=body,
            category=category,
            template_id=template_id,
            impacts=impacts
        ))

    return events


def _generate_impacts(
    event_type: str,
    intensity: str,
    securities: list[dict],
    target_sector: str,
    target_region: Optional[str],
    chosen_security_id: int
) -> list[EventImpact]:
    """
    Genera impatti coerenti per un evento.
    La logica varia in base al tipo di evento e all'intensita'.
    """
    impacts = []
    low, high = _INTENSITY_RANGES.get(intensity, (0.95, 1.05))

    # Determina il segno: positivo o negativo
    if event_type == "positive":
        # Impatto positivo: moltiplicatori > 1
        sector_mult = round(random.uniform(1.0, high), 4)
        specific_mult = round(random.uniform(max(1.0, high - 0.05), high + 0.03), 4)
    elif event_type == "negative":
        # Impatto negativo: moltiplicatori < 1
        sector_mult = round(random.uniform(low, 1.0), 4)
        specific_mult = round(random.uniform(low - 0.03, min(1.0, low + 0.05)), 4)
    else:
        # Neutro: moltiplicatori vicini a 1
        sector_mult = round(random.uniform(0.98, 1.02), 4)
        specific_mult = round(random.uniform(0.97, 1.03), 4)

    # Impatto a livello di settore
    impacts.append(EventImpact(
        sector=target_sector,
        impact_type="multiplier",
        impact_value=sector_mult
    ))

    # Impatto specifico su un singolo titolo (piu' forte)
    impacts.append(EventImpact(
        security_id=chosen_security_id,
        impact_type="multiplier",
        impact_value=specific_mult
    ))

    # Impatto regionale (se specificato, piu' lieve)
    if target_region:
        if event_type == "positive":
            region_mult = round(random.uniform(1.0, 1.0 + (high - 1.0) * 0.5), 4)
        elif event_type == "negative":
            region_mult = round(random.uniform(1.0 - (1.0 - low) * 0.5, 1.0), 4)
        else:
            region_mult = round(random.uniform(0.99, 1.01), 4)

        impacts.append(EventImpact(
            region=target_region,
            impact_type="multiplier",
            impact_value=region_mult
        ))

    return impacts
