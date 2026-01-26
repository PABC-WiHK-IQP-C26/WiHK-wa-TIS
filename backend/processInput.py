# class to process input text using spaCy
import spacy
from spacy import displacy

from spacy.lang.en import English
#also import trad chinese at some point
import rapidfuzz # this is to do fuzzy matching if needed ,, necessarily for typos or different spelling conventions people may be used to
import NLTK # text processing library
import getData

def process_text(input_text):
    print("Processing text with spaCy NLP model...", flush=True)
    # English NLP model
    nlp_en = spacy.load("en_core_web_sm")
    doc_en = nlp_en(input_text)

    # analyzing syntax [https://spacy.io/]
    print("Noun phrases:", [chunk.text for chunk in doc_en.noun_chunks])
    print("Verbs:", [token.lemma_ for token in doc_en if token.pos_ == "VERB"])

    for entity in doc_en.ents:
        print(entity.text, entity.label_) 

    # rapidfuzz can be used to do a word or sentence by sentence similarity check with the overview and itinerary fields from the tours data fetched from Google Sheets.



    """
    The idea is to tokenize client input, identify key entities (e.g., locations, dates), relevant information regarding location etc.
    Primarily use the overview and itinerary fields from the tours data fetched from Google Sheets.
    https://spotintelligence.com/2022/12/19/text-similarity-python/ 
    >>TF_IDF approach for text similarity
    """




