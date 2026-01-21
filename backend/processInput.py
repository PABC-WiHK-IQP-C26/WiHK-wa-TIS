# class to process input text using spaCy
import spacy
from spacy import displacy

from spacy.lang.en import English
#also import trad chinese at some point

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
