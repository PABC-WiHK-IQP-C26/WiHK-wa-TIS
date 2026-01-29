# class to process input text using spaCy
import spacy
from spacy import displacy
import pandas as pd
import os
import builtins

from spacy.lang.en import English
#also import trad chinese at some point
import rapidfuzz # this is to do fuzzy matching if needed ,, necessarily for typos or different spelling conventions people may be used to
#import NLTK 
from getData import fetchTour
from getData import tourIndexer

# Debug logging control (disabled by default)
PROCESS_INPUT_VERBOSE = os.getenv("PROCESS_INPUT_VERBOSE", "0") == "1"

def debug_print(*args, **kwargs):
    if PROCESS_INPUT_VERBOSE:
        builtins.print(*args, **kwargs)

# Override local print to respect verbose flag
print = debug_print

# Hong Kong locations to regions mapping
HK_LOCATION_TO_REGIONS = {
    "central": ["hong kong island"],
    "old town central": ["hong kong island"],
    "tsim sha tsui": ["kowloon"],
    "mong kok": ["kowloon"],
    "sham shui po": ["kowloon"],
    "sheung wan": ["hong kong island"],
    "wan chai": ["hong kong island"],
    "causeway bay": ["hong kong island"],
    "yau ma tei": ["kowloon"],
    "sha tau kok": ["new territories"],
    "tai po": ["new territories"],
    "tsuen wan": ["new territories"],
    "sai ying pun": ["hong kong island"],
    "temple street": ["kowloon"],
}

# Location abbreviations mapping
HK_ABBREVIATIONS = {
    # Sham Shui Po variations
    "ssp": "sham shui po",
    "shamshui": "sham shui po",
    "shamshuipo": "sham shui po",
    
    # Tsim Sha Tsui variations
    "tst": "tsim sha tsui",
    "tss": "tsim sha tsui",
    "tsimshatsui": "tsim sha tsui",
    
    # Central variations
    "otc": "old town central",
    "oldtowncentral": "old town central",
    
    # Other common abbreviations
    "mk": "mong kok",
    "mongkok": "mong kok",
    "sw": "sheung wan",
    "sheungwan": "sheung wan",
    "wc": "wan chai",
    "wanchai": "wan chai",
    "cb": "causeway bay",
    "causewaybay": "causeway bay",
    "ymt": "yau ma tei",
    "yaumatei": "yau ma tei",
    "stk": "sha tau kok",
    "shatauk": "sha tau kok",
    "tp": "tai po",
    "taipo": "tai po",
    "tw": "tsuen wan",
    "tsuenwan": "tsuen wan",
    "syp": "sai ying pun",
    "saiyingpun": "sai ying pun",
    "ts": "temple street",
    "templestreet": "temple street",
}

# Exclude overly broad geographic terms
EXCLUDED_LOCATIONS = {
    "hong kong",
    "hk",
    "china",
}

# Prevent fuzzy matching between these similar-sounding locations
# Use exact match only for these pairs
STRICT_MATCH_LOCATIONS = set(HK_LOCATION_TO_REGIONS.keys())  # All HK locations are strict match

def process_text(input_text, verbose=False):
    global PROCESS_INPUT_VERBOSE
    previous_verbose = PROCESS_INPUT_VERBOSE
    PROCESS_INPUT_VERBOSE = bool(verbose)
    try:
        print("Processing text with spaCy NLP model...", flush=True)
        # English NLP model
        nlp_en = spacy.load("en_core_web_sm")
        
        # Load locations from CSV and add to EntityRuler
        nlp_en, hk_locations_set = add_hk_locations_to_nlp(nlp_en)
        
        doc_en = nlp_en(input_text)
        
        # Post-process: relabel PERSON entities that match HK locations
        doc_en = relabel_hk_locations(doc_en, hk_locations_set)

        # analyzing syntax [https://spacy.io/]
        print("\n--- NLP Analysis ---", flush=True)
        print("Noun phrases:", [chunk.text for chunk in doc_en.noun_chunks])
        print("Verbs:", [token.lemma_ for token in doc_en if token.pos_ == "VERB"])

        # Extract entities
        extracted_entities = {}
        extracted_entities['locations'] = []
        extracted_entities['dates'] = []
        extracted_entities['all_entities'] = []
        
        print("\nExtracted Entities:", flush=True)
        for entity in doc_en.ents:
            print(f"  {entity.text} ({entity.label_})", flush=True)
            extracted_entities['all_entities'].append({'text': entity.text, 'label': entity.label_})
            
            if entity.label_ == "GPE":
                # Exclude overly broad locations
                if entity.text.lower() not in EXCLUDED_LOCATIONS:
                    extracted_entities['locations'].append(entity.text)
                else:
                    print(f"    (Excluded: too broad)", flush=True)
            elif entity.label_ == "DATE":
                extracted_entities['dates'].append(entity.text)
        
        print(f"\nExtracted Locations: {extracted_entities['locations']}", flush=True)
        print(f"Extracted Dates: {extracted_entities['dates']}", flush=True)
        
        # Fetch tour data
        print("\n--- Fetching Tour Data ---", flush=True)
        fetcher = fetchTour()
        tours_data = fetcher.data
        print(f"Loaded {len(tours_data)} tours", flush=True)
        
        # Match by overview and itinerary
        print("\n--- Content-Based Matching ---", flush=True)
        content_matches = match_by_overview_itinerary(input_text, tours_data)
        
        # Match by locations - also try keyword matching if no locations extracted
        print("\n--- Location-Based Matching ---", flush=True)
        if extracted_entities['locations']:
            location_matches = match_by_location(extracted_entities['locations'], tours_data)
        else:
            print(f"No locations extracted from entities, attempting keyword matching...", flush=True)
            location_matches = match_by_keywords(input_text, tours_data)
        
        # Combine results - REQUIRE BOTH LOCATION + CONTENT MATCH
        print("\n--- Final Results ---", flush=True)
        
        # Get all matched tour codes from location-based matching
        location_matched_codes = set(tour['tour_code'] for tour in location_matches)
        print(f"Location-matched tour codes: {location_matched_codes}", flush=True)
        
        # Filter content matches to only those also matched by location
        location_and_content = []
        for match in content_matches:
            tour_code = match[0]
            if tour_code in location_matched_codes:
                location_and_content.append({
                    'tour_code': tour_code,
                    'similarity': match[1],
                    'location_matched': True,
                    'match_type': 'location+content'
                })
        
        print(f"Matches both location + content: {len(location_and_content)}", flush=True)
        
        results = {
            'extracted_entities': extracted_entities,
            'location_matches': location_matches,  # raw location matches (for debugging)
            'content_matches': location_and_content,  # only location+content
            'all_matches': location_and_content,  # final recommendations
            'doc': doc_en
        }
        
        print(f"Total recommendations (location + content): {len(location_and_content)}", flush=True)
        print(f"--- End Final Results ---\n", flush=True)
        
        return results
    finally:
        PROCESS_INPUT_VERBOSE = previous_verbose


def add_hk_locations_to_nlp(nlp):
    """Load Hong Kong locations from locations.csv and location mappings, then add to EntityRuler"""
    try:
        # Read locations from CSV
        csv_path = os.path.join(os.path.dirname(__file__), 'Data', 'locations.csv')
        if not os.path.exists(csv_path):
            print(f"Warning: locations.csv not found at {csv_path}", flush=True)
            return nlp, set()
        
        locations_df = pd.read_csv(csv_path)
        # Get unique locations
        unique_locations = locations_df['location'].unique()
        hk_locations_set = set(loc.strip() for loc in unique_locations if loc)
        
        # Add hardcoded locations from mapping dictionary
        hk_locations_set.update(HK_LOCATION_TO_REGIONS.keys())
        
        # Add regions to the set as well
        all_regions = set()
        for regions in HK_LOCATION_TO_REGIONS.values():
            all_regions.update(regions)
        hk_locations_set.update(all_regions)
        
        print(f"Loaded {len(unique_locations)} locations from CSV + {len(HK_LOCATION_TO_REGIONS)} from mapping dict + {len(all_regions)} regions", flush=True)
        
        # Remove existing entity ruler if it exists
        if "entity_ruler" in nlp.pipe_names:
            nlp.remove_pipe("entity_ruler")
        
        # Add EntityRuler with HK locations and regions
        ruler = nlp.add_pipe("entity_ruler", before="ner")
        
        # Create patterns for all locations and regions
        patterns = [{"label": "GPE", "pattern": location} for location in hk_locations_set]
        ruler.add_patterns(patterns)
        
        print(f"Added {len(patterns)} location/region patterns to entity ruler", flush=True)
        return nlp, hk_locations_set
        
    except Exception as e:
        print(f"Error loading locations from CSV: {str(e)}", flush=True)
        return nlp, set()


def relabel_hk_locations(doc, hk_locations_set):
    """Relabel PERSON entities that match HK locations"""
    print(f"\n--- Relabeling HK Locations ---", flush=True)
    print(f"Available HK locations ({len(hk_locations_set)}): {sorted(list(hk_locations_set))[:15]}...", flush=True)
    
    with doc.retokenize() as retokenizer:
        for ent in doc.ents:
            original_label = ent.label_
            # Check if entity text matches any HK location (case-insensitive)
            if ent.label_ == "PERSON":
                entity_lower = ent.text.lower()
                
                # Check abbreviations first
                if entity_lower in HK_ABBREVIATIONS:
                    full_name = HK_ABBREVIATIONS[entity_lower]
                    ent.label_ = "GPE"
                    regions = HK_LOCATION_TO_REGIONS.get(full_name, [])
                    region_info = f" → {', '.join(regions)}" if regions else ""
                    print(f"✓ ABBREVIATION MATCH: '{ent.text}' (abbr for '{full_name}') relabeled from {original_label} to {ent.label_}{region_info}", flush=True)
                # Exact match
                elif ent.text in hk_locations_set or ent.text.strip() in hk_locations_set:
                    ent.label_ = "GPE"
                    regions = HK_LOCATION_TO_REGIONS.get(entity_lower, [])
                    region_info = f" → {', '.join(regions)}" if regions else ""
                    print(f"✓ EXACT MATCH: '{ent.text}' relabeled from {original_label} to {ent.label_}{region_info}", flush=True)
                else:
                    # Fuzzy match with high threshold
                    best_match = rapidfuzz.process.extractOne(
                        ent.text, 
                        hk_locations_set, 
                        score_cutoff=85
                    )
                    if best_match:
                        ent.label_ = "GPE"
                        matched_location = best_match[0]
                        regions = HK_LOCATION_TO_REGIONS.get(matched_location.lower(), [])
                        region_info = f" → {', '.join(regions)}" if regions else ""
                        print(f"✓ FUZZY MATCH: '{ent.text}' relabeled from {original_label} to {ent.label_} (matched '{matched_location}' - {best_match[1]}%{region_info})", flush=True)
                    else:
                        print(f"✗ NO MATCH: '{ent.text}' remains {original_label}", flush=True)
    print(f"--- End Relabeling ---\n", flush=True)
    return doc


def match_by_overview_itinerary(input_text, tours_data):
    """Match input text against tour overviews and itineraries using TF-IDF"""
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    import numpy as np

    print(f"\n--- TF-IDF Matching Debug ---", flush=True)
    print(f"Input text: '{input_text}'", flush=True)
    print(f"Total tours: {len(tours_data)}", flush=True)
    
    # Filter tours with valid names and content
    valid_tours = [
        tour for tour in tours_data 
        if tour.get('name_eng') and (tour.get('ov_eng') or tour.get('itn_eng'))
    ]
    print(f"Valid tours (with name and content): {len(valid_tours)}", flush=True)

    # Prepare corpus: combine overview and itinerary for each tour
    corpus = []
    tour_ids = []
    for idx, tour in enumerate(valid_tours):
        combined_text = f"{tour.get('ov_eng', '')} {tour.get('itn_eng', '')}"
        corpus.append(combined_text)
        tour_ids.append(tour.get('tour_code', 'unknown'))
        print(f"Tour {idx + 1} - Code: {tour.get('tour_code', 'unknown')}, Name: {tour.get('name_eng', 'N/A')}, Text length: {len(combined_text)} chars", flush=True)

    if not corpus:
        print(f"No valid tours to match!", flush=True)
        return []

    # Add input text to corpus
    corpus.append(input_text)
    print(f"\nTotal corpus size: {len(corpus)} documents (tours + input)", flush=True)

    # Compute TF-IDF matrix
    print(f"Computing TF-IDF vectors...", flush=True)
    vectorizer = TfidfVectorizer().fit_transform(corpus)
    vectors = vectorizer.toarray()
    print(f"TF-IDF matrix shape: {vectors.shape}", flush=True)

    # Compute cosine similarity between input text and all tours
    input_vector = vectors[-1]  # last vector is the input text
    tour_vectors = vectors[:-1]  # all others are tours
    
    print(f"Input vector shape: {input_vector.shape}", flush=True)
    print(f"Tour vectors shape: {tour_vectors.shape}", flush=True)

    similarities = cosine_similarity([input_vector], tour_vectors)[0]
    print(f"\nSimilarity scores for all tours:", flush=True)
    for idx, (tour_id, sim_score) in enumerate(zip(tour_ids, similarities)):
        print(f"  {idx + 1}. Tour {tour_id}: {sim_score:.4f}", flush=True)

    # Get top matches
    top_indices = np.argsort(similarities)[::-1][:5]  # top 5 matches
    top_matches = [(tour_ids[i], similarities[i]) for i in top_indices if similarities[i] > 0.02]  # Lowered threshold to 0.02

    print(f"\nTop matches (similarity > 0.05):", flush=True)
    for idx, (tour_id, sim_score) in enumerate(top_matches):
        print(f"  {idx + 1}. Tour {tour_id}: {sim_score:.4f}", flush=True)
    
    if not top_matches:
        print(f"  No strong matches found. Best match score: {max(similarities):.4f}", flush=True)
        # Show top 3 regardless of threshold
        print(f"\n  Best 3 anyway:", flush=True)
        best_3 = [(tour_ids[i], similarities[i]) for i in np.argsort(similarities)[::-1][:3]]
        for idx, (tour_id, sim_score) in enumerate(best_3):
            print(f"    {idx + 1}. {tour_id}: {sim_score:.4f}", flush=True)
    
    print(f"--- End TF-IDF Matching ---\n", flush=True)

    return top_matches


def match_by_location(extracted_locations, tours_data):
    """Match tours based on extracted location entities"""
    print(f"\n--- Location-Based Matching ---", flush=True)
    
    if not extracted_locations:
        print(f"No locations extracted from input", flush=True)
        return []
    
    # Filter tours with valid names
    valid_tours = [tour for tour in tours_data if tour.get('name_eng')]
    print(f"Valid tours (with name): {len(valid_tours)} / {len(tours_data)}", flush=True)
    
    print(f"Searching for tours matching locations: {extracted_locations}", flush=True)
    
    location_matches = []
    
    for location in extracted_locations:
        location_lower = location.lower()
        print(f"\nSearching for tours with location: '{location}'", flush=True)
        
        # Check if it's an abbreviation
        expanded_location = HK_ABBREVIATIONS.get(location_lower, location_lower)
        if expanded_location != location_lower:
            print(f"  Abbreviation '{location}' expanded to '{expanded_location}'", flush=True)
            location_lower = expanded_location
        
        # Get region(s) for this location
        search_regions = HK_LOCATION_TO_REGIONS.get(location_lower, [])
        if search_regions:
            print(f"  Location belongs to region(s): {search_regions}", flush=True)
        
        # Find tours that have this location or region
        matching_tours = []
        for tour in valid_tours:
            tour_locations = tour.get('locations', [])
            if any(loc.lower() == location_lower for loc in tour_locations):
                matching_tours.append({
                    'tour_code': tour.get('tour_code'),
                    'tour_name': tour.get('name_eng'),
                    'matched_location': location,
                    'match_type': 'exact'
                })
            # Check if this is a strict match location (no fuzzy matching)
            elif location_lower not in STRICT_MATCH_LOCATIONS and tour_locations:
                for tour_loc in tour_locations:
                    # Check if tour_loc is in same region as requested location
                    tour_loc_regions = HK_LOCATION_TO_REGIONS.get(tour_loc.lower(), [])
                    
                    # Only fuzzy match if in same region or no region constraint
                    if not search_regions or any(r in tour_loc_regions for r in search_regions):
                        match = rapidfuzz.process.extractOne(
                            location_lower,
                            [tour_loc.lower()],
                            score_cutoff=80
                        )
                        if match:
                            matching_tours.append({
                                'tour_code': tour.get('tour_code'),
                                'tour_name': tour.get('name_eng'),
                                'matched_location': location,
                                'match_type': f'fuzzy ({match[1]}%)',
                                'fuzzy_matched_to': tour_loc
                            })
                            break
                    else:
                        print(f"    (Skipped fuzzy match with '{tour_loc}' - different region)", flush=True)
            elif location_lower in STRICT_MATCH_LOCATIONS:
                print(f"  (Strict match only - no fuzzy matching for '{location}')", flush=True)
        
        if matching_tours:
            print(f"  Found {len(matching_tours)} matching tour(s):", flush=True)
            for tour in matching_tours:
                match_type = tour.get('match_type', 'unknown')
                print(f"    - {tour['tour_code']}: {tour['tour_name']} ({match_type})", flush=True)
            location_matches.extend(matching_tours)
        else:
            print(f"  No matching tours found for '{location}'", flush=True)
    
    print(f"\nTotal location-based matches: {len(location_matches)}", flush=True)
    print(f"--- End Location-Based Matching ---\n", flush=True)
    
    return location_matches


def match_by_keywords(input_text, tours_data):
    """Match tours by searching for location keywords in input text"""
    print(f"\n--- Keyword-Based Location Matching ---", flush=True)
    import re
    
    # Build list of all known locations and abbreviations
    all_keywords = set()
    all_keywords.update(HK_LOCATION_TO_REGIONS.keys())
    all_keywords.update(HK_ABBREVIATIONS.keys())
    
    print(f"Searching for {len(all_keywords)} location keywords in input", flush=True)
    
    # Find matching keywords in input text (whole-word matches only)
    input_lower = input_text.lower()
    found_keywords = []
    for kw in all_keywords:
        pattern = rf"\b{re.escape(kw)}\b"
        if re.search(pattern, input_lower):
            found_keywords.append(kw)
    
    if found_keywords:
        print(f"Found keywords: {found_keywords}", flush=True)
        # Expand abbreviations
        expanded_keywords = []
        for kw in found_keywords:
            if kw in HK_ABBREVIATIONS:
                expanded_keywords.append(HK_ABBREVIATIONS[kw])
            else:
                expanded_keywords.append(kw)
        print(f"Expanded to: {expanded_keywords}", flush=True)
        
        # Find tours with these locations
        matching_tours = []
        for keyword in expanded_keywords:
            for tour in tours_data:
                if not tour.get('name_eng'):
                    continue
                tour_locations = tour.get('locations', [])
                if any(loc.lower() == keyword for loc in tour_locations):
                    if not any(m['tour_code'] == tour.get('tour_code') for m in matching_tours):
                        matching_tours.append({
                            'tour_code': tour.get('tour_code'),
                            'tour_name': tour.get('name_eng'),
                            'matched_location': keyword,
                            'match_type': 'keyword'
                        })
        
        print(f"Found {len(matching_tours)} matching tours", flush=True)
        return matching_tours
    else:
        print(f"No location keywords found in input", flush=True)
        return []




