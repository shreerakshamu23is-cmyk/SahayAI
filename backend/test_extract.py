from modules.ocr import extract_medicines_locally
raw = '''DEA# GB 05455616 LIC # 976269
MEDICAL CENTRE
824 14" Street
New York, NY 91743, USA
appress _/6Z Example S+ M7 pate O9-I/-1Z
Betaloe 100mg - | tablet twice daily
Dorzolamidua lO mg - | 4b SID
Cimetidine 50 m3 - Z 46s three times daily
Oxprelol 20 ms - | 4b QV
NS
= Dr. Steve Jobason
© signature
te OLABEL
~~ REFILL 0(12 3 4 5 as needed
[e) WTX-N-PRESC-T
hy 1-889-422-0700
Ps
3
'''
meds = extract_medicines_locally(raw)
import json
print(json.dumps(meds, indent=2))
