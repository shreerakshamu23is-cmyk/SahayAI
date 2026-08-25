import re

def score_ocr_text(text):
    if not text:
        return -100
    words = text.split()
    if not words:
        return -100
    
    # Count real words (> 2 chars) vs single letter noise
    single_char_noise = sum(1 for w in words if len(w) == 1 and not w.isdigit() and w.lower() not in ['a', 'i'])
    real_words = [w.lower() for w in words if len(w) >= 2]
    
    medical_keywords = ['mg', 'ml', 'mcg', 'tab', 'tablet', 'cap', 'capsule', 'bid', 'tid', 'qd', 'qid', 'daily', 'twice', 'three', 'once', 'rx', 'dr', 'name', 'date', 'age', 'lic', 'centre', 'street']
    med_score = sum(3 for w in real_words if any(k in w for k in medical_keywords))
    
    # Alpha word ratio
    alpha_words = sum(1 for w in real_words if re.match(r'^[a-zA-Z0-9\-\+\.]+$', w))
    
    score = (len(real_words) * 2) + med_score + (alpha_words * 1.5) - (single_char_noise * 3)
    return score

clean_sample = '''DEA# GB 05455616 LIC # 976269
MEDICAL CENTRE 824 14th Street New York
NAME John Smith AGE 34 ADDRESS 162 Example St NY DATE 09-11-12
Rx Betaloc 100mg - 1 tablet twice daily
Dorzolamidum 10 mg - 1 tablet twice daily
Cimetidine 50 mg - 2 tabs three times daily
Oxprelol 50 mg - 1 tab QD
Dr. Steve Johnson signature'''

gibberish_sample = '''no it is not at all comimg u can only test & I ¢ ‘ Ce Zs i “hil z= CPW 'D if ) Ze vl ARRON Py ie Sa CL EES es © SG Zi Zw KG (once ee 0 etogrtin VZ A bg < | a cara eu EIGe 48 fos al N - ee SSNS. A —__ Se ————— dis — ee eee ee i Ses : gt i er: Hi <a me 4 spene wy. 2 N ni ap 2 ay Sx Al ———— = Ny ae 7. $e, @: Chine Ss eo i Jo Se D aS'''

print('Clean text score:', score_ocr_text(clean_sample))
print('Gibberish score:', score_ocr_text(gibberish_sample))
