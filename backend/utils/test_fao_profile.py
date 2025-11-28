
from fao_profile_service import get_profile

def test(species, category, stage):
    print(f"\n SPECIE: {species or 'N/D'}, categoria: {category or 'N/D'}, stadio: {stage or 'N/D'}")
    profilo = get_profile(species, category, stage)
    for k, v in profilo.items():
        print(f"  {k}: {v}")

if __name__ == "__main__":
    test("broccoli", "ortivo", "iniziale")       # ✔︎ dovrebbe usare pyfao56
    test("rosa", "arbustiva", "fioritura")       # ✘ fallback statico
    test("carrots", None, "crescita")            # ✔︎ da FAO
    test("basilico", "erbacea", "raccolta")      # ✘ fallback statico
    test("lettuce", None, "mid")                 # ✔︎ da FAO