import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { speakText, unlockVoice } from "../voiceHelper"

const LANGUAGE_OPTIONS = [
  { value: "english", label: "English" },
  { value: "kannada", label: "ಕನ್ನಡ (Kannada)" },
  { value: "hindi", label: "हिन्दी (Hindi)" },
]

const STATE_OPTIONS = [
  { value: "karnataka", label: "Karnataka" },
  { value: "rajasthan", label: "Rajasthan" },
  { value: "tamilnadu", label: "Tamil Nadu" },
  { value: "westbengal", label: "West Bengal" },
  { value: "gujarat", label: "Gujarat" },
  { value: "punjab", label: "Punjab" },
]

const stateNames = {
  english: { karnataka: "Karnataka", rajasthan: "Rajasthan", tamilnadu: "Tamil Nadu", westbengal: "West Bengal", gujarat: "Gujarat", punjab: "Punjab" },
  kannada: { karnataka: "ಕರ್ನಾಟಕ", rajasthan: "ರಾಜಸ್ಥಾನ", tamilnadu: "ತಮಿಳುನಾಡು", westbengal: "ಪಶ್ಚಿಮ ಬಂಗಾಳ", gujarat: "ಗುಜರಾತ್", punjab: "ಪಂಜಾಬ್" },
  hindi: { karnataka: "कर्नाटक", rajasthan: "राजस्थान", tamilnadu: "तमिलनाडु", westbengal: "पश्चिम बंगाल", gujarat: "गुजरात", punjab: "पंजाब" },
}

const categoryLabels = {
  english: { all: "All Categories", health: "Health & Medical", insurance: "Insurance & Security", women: "Women & Child", welfare: "Social Welfare", pension: "Pension & Seniors", farmers: "Agriculture & Farmers" },
  kannada: { all: "ಎಲ್ಲಾ ಶ್ರೇಣಿಗಳು", health: "ಆರೋಗ್ಯ ಮತ್ತು ವೈದ್ಯಕೀಯ", insurance: "ವಿಮೆ ಮತ್ತು ಭದ್ರತೆ", women: "ಮಹಿಳೆ ಮತ್ತು ಮಗು", welfare: "ಸಾಮಾಜಿಕ ಕಲ್ಯಾಣ", pension: "ಪಿಂಚಣಿ", farmers: "ಕೃಷಿ ಮತ್ತು ರೈತರು" },
  hindi: { all: "सभी श्रेणियां", health: "स्वास्थ्य और चिकित्सा", insurance: "बीमा और सुरक्षा", women: "महिला और बाल", welfare: "सामाजिक कल्याण", pension: "पेंशन", farmers: "कृषि और किसान" },
}


const CENTRAL_SCHEMES = [
  {
    id: 1,
    icon: "🏥",
    category: "health",
    name: "Ayushman Bharat PM-JAY",
    nameLocal: {
      kannada: "ಆಯುಷ್ಮಾನ್ ಭಾರತ್ PM-JAY",
      hindi: "आयुष्मान भारत PM-JAY",
    },
    who: "Poor and vulnerable families (bottom 40% population)",
    whoLocal: {
      kannada: "ಬಡ ಮತ್ತು ದುರ್ಬಲ ಕುಟುಂಬಗಳು (ಜನಸಂಖ್ಯೆಯ ಕೆಳ 40%)",
      hindi: "गरीब और कमजोर परिवार (नीचे की 40% जनसंख्या)",
    },
    benefit: "₹5 lakh free hospital cashless treatment per family per year",
    benefitLocal: {
      kannada: "ವರ್ಷಕ್ಕೆ ಕುಟುಂಬವೊಂದಕ್ಕೆ ₹5 ಲಕ್ಷ ಉಚಿತ ನಗದುರಹಿತ ಆಸ್ಪತ್ರೆ ಚಿಕಿತ್ಸೆ",
      hindi: "प्रति वर्ष प्रति परिवार ₹5 लाख मुफ्त कैशलेस इलाज",
    },
    howToApply: "Visit nearest empaneled public/private hospital or Ayushman Mitra booth with Aadhaar & Ration Card.",
    applyUrl: "https://www.myscheme.gov.in/schemes/pm-jay",
    color: "#E1F5EE",
    borderColor: "#9FE1CB",
  },
  {
    id: 2,
    icon: "🤰",
    category: "women",
    name: "Janani Suraksha Yojana (JSY)",
    nameLocal: {
      kannada: "ಜನನಿ ಸುರಕ್ಷಾ ಯೋಜನೆ",
      hindi: "जननी सुरक्षा योजना",
    },
    who: "Pregnant women from BPL/SC/ST families",
    whoLocal: {
      kannada: "ಬಿಪಿಎಲ್/ಎಸ್‌ಸಿ/ಎಸ್‌ಟಿ ಕುಟುಂಬಗಳ ಗರ್ಭಿಣಿ ಮಹಿಳೆಯರು",
      hindi: "बीपीएल/एससी/एसटी परिवारों की गर्भवती महिलाएं",
    },
    benefit: "Direct cash assistance: ₹1400 (Rural) / ₹1000 (Urban) for institutional delivery",
    benefitLocal: {
      kannada: "ಸರ್ಕಾರಿ ಆಸ್ಪತ್ರೆ ಹೆರಿಗೆಗೆ ₹1400 (ಗ್ರಾಮೀಣ) / ₹1000 (ನಗರ) ನಗದು ನೆರವು",
      hindi: "सरकारी अस्पताल में प्रसव पर ₹1400 (ग्रामीण) / ₹1000 (शहरी) नकद सहायता",
    },
    howToApply: "Register at local Anganwadi center or Government Health Center (PHC/CHC) during pregnancy.",
    applyUrl: "https://nhm.gov.in",
    color: "#FEE2E2",
    borderColor: "#FCA5A5",
  },
  {
    id: 3,
    icon: "💊",
    category: "health",
    name: "Pradhan Mantri Bhartiya Janaushadhi Pariyojana (PMBJP)",
    nameLocal: {
      kannada: "ಪ್ರಧಾನ ಮಂತ್ರಿ ಜನೌಷಧಿ ಯೋಜನೆ",
      hindi: "प्रधानमंत्री भारतीय जनऔषधि परियोजना",
    },
    who: "All citizens of India needing affordable medicine",
    whoLocal: {
      kannada: "ಕಡಿಮೆ ಬೆಲೆಯ ಔಷಧಿ ಅಗತ್ಯವಿರುವ ಎಲ್ಲಾ ನಾಗರಿಕರು",
      hindi: "किफायती दवाइयों की आवश्यकता वाले सभी नागरिक",
    },
    benefit: "High quality generic medicines & surgical items at 50% to 90% discount",
    benefitLocal: {
      kannada: "50% ರಿಂದ 90% ವರೆಗೆ ಕಡಿಮೆ ದರದಲ್ಲಿ ಉತ್ತಮ ಗುಣಮಟ್ಟದ ಜೆನೆರಿಕ್ ಔಷಧಿಗಳು",
      hindi: "50% से 90% कम कीमत पर उच्च गुणवत्ता वाली जेनेरिक दवाएं",
    },
    howToApply: "Visit any Jan Aushadhi Kendra with doctor's prescription or search store location on official portal.",
    applyUrl: "https://janaushadhi.gov.in",
    color: "#E0F2FE",
    borderColor: "#7DD3FC",
  },
  {
    id: 4,
    icon: "🍼",
    category: "women",
    name: "Pradhan Mantri Matru Vandana Yojana (PMMVY)",
    nameLocal: {
      kannada: "ಪ್ರಧಾನ ಮಂತ್ರಿ ಮಾತೃ ವಂದನಾ ಯೋಜನೆ",
      hindi: "प्रधानमंत्री मातृ वंदना योजना",
    },
    who: "Pregnant women and lactating mothers for first live child",
    whoLocal: {
      kannada: "ಮೊದಲ ಮಗುವಿಗೆ ಗರ್ಭಿಣಿ ಮತ್ತು ಹಾಲುಣಿಸುವ ತಾಯಂದಿರು",
      hindi: "पहले बच्चे के लिए गर्भवती और स्तनपान कराने वाली माताएं",
    },
    benefit: "₹5,000 cash incentive paid directly into bank account in 3 installments",
    benefitLocal: {
      kannada: "ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ 3 ಕಂತುಗಳಲ್ಲಿ direct ₹5000 ನಗದು ಪ್ರೋತ್ಸಾಹಧನ",
      hindi: "बैंक खाते में 3 किस्तों में सीधे ₹5,000 की नकद सहायता",
    },
    howToApply: "Apply at local Anganwadi Center or online through PMMVY portal with MCP card & Bank details.",
    applyUrl: "https://pmmvy.wcd.gov.in",
    color: "#FCE7F3",
    borderColor: "#F472B6",
  },
  {
    id: 5,
    icon: "🛡️",
    category: "insurance",
    name: "Pradhan Mantri Suraksha Bima Yojana (PMSBY)",
    nameLocal: {
      kannada: "ಪ್ರಧಾನ ಮಂತ್ರಿ ಸುರಕ್ಷಾ ಬಿಮಾ ಯೋಜನೆ",
      hindi: "प्रधानमंत्री सुरक्षा बीमा योजना",
    },
    who: "All bank account holders aged 18 to 70 years",
    whoLocal: {
      kannada: "ಬ್ಯಾಂಕ್ ಖಾತೆ ಹೊಂದಿರುವ 18ರಿಂದ 70 ವರ್ಷದ ನಾಗರಿಕರು",
      hindi: "18 से 70 वर्ष के सभी बैंक खाताधारक",
    },
    benefit: "₹2 lakh accidental death/full disability cover for nominal premium of ₹20/year",
    benefitLocal: {
      kannada: "ವರ್ಷಕ್ಕೆ ಕೇವಲ ₹20 ಪ್ರೀಮಿಯಂನಲ್ಲಿ ₹2 ಲಕ್ಷ ಅಪಘಾತ ವಿಮೆ ಹಾಗೂ ವೈಕಲ್ಯ ನೆರವು",
      hindi: "मात्र ₹20/वर्ष के प्रीमियम पर ₹2 लाख का दुर्घटना बीमा",
    },
    howToApply: "Submit auto-debit consent form at your bank branch or enroll via Internet Banking.",
    applyUrl: "https://www.myscheme.gov.in/schemes/pmsby",
    color: "#FEF3C7",
    borderColor: "#FCD34D",
  },
  {
    id: 6,
    icon: "📜",
    category: "insurance",
    name: "Pradhan Mantri Jeevan Jyoti Bima Yojana (PMJJBY)",
    nameLocal: {
      kannada: "ಪ್ರಧಾನ ಮಂತ್ರಿ ಜೀವನ್ ಜ್ಯೋತಿ ಬಿಮಾ ಯೋಜನೆ",
      hindi: "प्रधानमंत्री जीवन ज्योति बीमा योजना",
    },
    who: "All savings bank account holders aged 18 to 50 years",
    whoLocal: {
      kannada: "18ರಿಂದ 50 ವರ್ಷ ವಯಸ್ಸಿನ ಬ್ಯಾಂಕ್ ಖಾತೆದಾರರು",
      hindi: "18 से 50 वर्ष के बचत बैंक खाताधारक",
    },
    benefit: "₹2 lakh life insurance risk coverage upon death due to any cause at ₹436/year",
    benefitLocal: {
      kannada: "ವರ್ಷಕ್ಕೆ ₹436 ಪ್ರೀಮಿಯಂನಲ್ಲಿ ₹2 ಲಕ್ಷ ಜೀವ ವಿಮೆ ಭದ್ರತೆ",
      hindi: "₹436/वर्ष में किसी भी कारण से मृत्यु पर ₹2 लाख का जीवन बीमा",
    },
    howToApply: "Visit your home bank branch or activate auto-debit via mobile/net banking app.",
    applyUrl: "https://www.myscheme.gov.in/schemes/pmjjby",
    color: "#EBF5FF",
    borderColor: "#A3E635",
  },
  {
    id: 7,
    icon: "🏥",
    category: "health",
    name: "National Health Mission (NHM)",
    nameLocal: {
      kannada: "ರಾಷ್ಟ್ರೀಯ ಆರೋಗ್ಯ ಮಿಷನ್",
      hindi: "राष्ट्रीय स्वास्थ्य मिशन",
    },
    who: "All rural and urban citizens, especially underprivileged populations",
    whoLocal: {
      kannada: "ಎಲ್ಲಾ ಗ್ರಾಮೀಣ ಮತ್ತು ನಗರ ಬಡ ನಾಗರಿಕರು",
      hindi: "सभी ग्रामीण और शहरी नागरिक",
    },
    benefit: "Free essential medicines, free diagnostics, maternal and child healthcare services",
    benefitLocal: {
      kannada: "ಉಚಿತ ಪ್ರಾಥಮಿಕ ಚಿಕಿತ್ಸೆ, ಉಚಿತ ಪರೀಕ್ಷೆಗಳು ಮತ್ತು ಉಚಿತ ಔಷಧಿಗಳು",
      hindi: "मुफ्त प्राथमिक स्वास्थ्य सेवा, मुफ्त दवाइयां और जांच",
    },
    howToApply: "Visit any Primary Health Centre (PHC), Community Health Centre (CHC), or District Hospital.",
    applyUrl: "https://nhm.gov.in",
    color: "#F0FDF4",
    borderColor: "#86EFAC",
  },
  {
    id: 8,
    icon: "👶",
    category: "health",
    name: "Rashtriya Bal Swasthya Karyakram (RBSK)",
    nameLocal: {
      kannada: "ರಾಷ್ಟ್ರೀಯ ಬಾಲ ಸ್ವಾಸ್ಥ್ಯ ಕಾರ್ಯಕ್ರಮ",
      hindi: "राष्ट्रीय बाल स्वास्थ्य कार्यक्रम",
    },
    who: "Children from birth up to 18 years of age",
    whoLocal: {
      kannada: "0 ರಿಂದ 18 ವರ್ಷ ವಯಸ್ಸಿನ ಮಕ್ಕಳು",
      hindi: "0 से 18 वर्ष तक के बच्चे",
    },
    benefit: "Free screening & surgical treatment for 30 child health conditions (defects, deficiency, diseases)",
    benefitLocal: {
      kannada: "30 ರೋಗಸ್ಥಿತಿಗಳಿಗೆ ಮಕ್ಕಳ ಉಚಿತ ಆರೋಗ್ಯ ತಪಾಸಣೆ ಮತ್ತು ಶಸ್ತ್ರಚಿಕಿತ್ಸೆ",
      hindi: "30 स्वास्थ्य समस्याओं के लिए बच्चों की मुफ्त जांच और उपचार",
    },
    howToApply: "Mobile Health Teams screen children at Anganwadis and Government Schools.",
    applyUrl: "https://www.myscheme.gov.in/schemes/rbsk",
    color: "#FFF7ED",
    borderColor: "#FDBA74",
  },
  {
    id: 9,
    icon: "🩺",
    category: "health",
    name: "Pradhan Mantri National Dialysis Programme (PMNDP)",
    nameLocal: {
      kannada: "ಪ್ರಧಾನ ಮಂತ್ರಿ ರಾಷ್ಟ್ರೀಯ ಡಯಾಲಿಸಿಸ್ ಕಾರ್ಯಕ್ರಮ",
      hindi: "प्रधानमंत्री राष्ट्रीय डायलिसिस कार्यक्रम",
    },
    who: "BPL patients suffering from end-stage renal failure",
    whoLocal: {
      kannada: "ಮೂತ್ರಪಿಂಡ ವೈಫಲ್ಯದಿಂದ ಬಳಲುತ್ತಿರುವ ಬಿಪಿಎಲ್ ರೋಗಿಗಳು",
      hindi: "गुर्दे की बीमारी से पीड़ित बीपीएल मरीज",
    },
    benefit: "Free hemodialysis & peritoneal dialysis services at District Hospitals",
    benefitLocal: {
      kannada: "ಜಿಲ್ಲಾ ಆಸ್ಪತ್ರೆಗಳಲ್ಲಿ ಸಂಪೂರ್ಣ ಉಚಿತ ಡಯಾಲಿಸಿಸ್ ಚಿಕಿತ್ಸೆ",
      hindi: "जिला अस्पतालों में बिल्कुल मुफ्त डायलिसिस सेवा",
    },
    howToApply: "Approach District Hospital Dialysis Unit with BPL card and nephrologist consultation report.",
    applyUrl: "https://www.myscheme.gov.in/schemes/pmndp",
    color: "#EDF7F4",
    borderColor: "#9FE1CB",
  },
  {
    id: 10,
    icon: "🫁",
    category: "welfare",
    name: "NIKSHAY Poshan Yojana (TB Support)",
    nameLocal: {
      kannada: "ನಿಕ್ಷಯ್ ಪೋಷಣ್ ಯೋಜನೆ (ಕ್ಷಯರೋಗ ನೆರವು)",
      hindi: "निक्षय पोषण योजना (टीबी सहायता)",
    },
    who: "All notified Tuberculosis (TB) patients undergoing treatment",
    whoLocal: {
      kannada: "ಚಿಕಿತ್ಸೆ ಪಡೆಯುತ್ತಿರುವ ಎಲ್ಲಾ ಕ್ಷಯರೋಗಿ (TB) ಗಳು",
      hindi: "इलाज करा रहे सभी टीबी मरीज",
    },
    benefit: "Direct Bank Transfer of ₹500/month for nutritional support throughout treatment duration",
    benefitLocal: {
      kannada: "ಪೌಷ್ಟಿಕ ಆಹಾರಕ್ಕಾಗಿ ಪ್ರತಿ ತಿಂಗಳು ನೇರವಾಗಿ ₹500 ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ",
      hindi: "पोषण सहायता के लिए हर महीने ₹500 सीधे बैंक खाते में",
    },
    howToApply: "Register on NIKSHAY portal or through government DOTS treatment provider.",
    applyUrl: "https://nikshay.in",
    color: "#EFF6FF",
    borderColor: "#93C5FD",
  },
  {
    id: 11,
    icon: "💉",
    category: "health",
    name: "Mission Indradhanush (Universal Immunization)",
    nameLocal: {
      kannada: "ಮಿಷನ್ ಇಂದ್ರಧನುಷ್ (ಸಾರ್ವತ್ರಿಕ ಲಸಿಕೆ)",
      hindi: "मिशन इंद्रधनुष (सार्वभौमिक टीकाकरण)",
    },
    who: "Unvaccinated/partially vaccinated children under 2 years and pregnant women",
    whoLocal: {
      kannada: "2 ವರ್ಷಕ್ಕಿಂತ ಕಡಿಮೆ ವಯಸ್ಸಿನ ಮಕ್ಕಳು ಮತ್ತು ಗರ್ಭಿಣಿಯರು",
      hindi: "2 वर्ष से कम उम्र के बच्चे और गर्भवती महिलाएं",
    },
    benefit: "Free vaccination against 12 life-threatening diseases (Polio, Measles, Hepatitis B, Tetanus, etc.)",
    benefitLocal: {
      kannada: "12 ಅಪಾಯಕಾರಿ ರೋಗಗಳ ವಿರುದ್ಧ ಸಂಪೂರ್ಣ ಉಚಿತ ಲಸಿಕೆಗಳು",
      hindi: "12 जानलेवा बीमारियों के खिलाफ मुफ्त टीकाकरण",
    },
    howToApply: "Visit nearest health center or local special vaccination drive camps.",
    applyUrl: "https://mohfw.gov.in",
    color: "#FAF5FF",
    borderColor: "#E9D5FF",
  },
  {
    id: 12,
    icon: "🦯",
    category: "pension",
    name: "Rashtriya Vayoshri Yojana (RVY)",
    nameLocal: {
      kannada: "ರಾಷ್ಟ್ರೀಯ ವಯೋಶ್ರೀ ಯೋಜನೆ",
      hindi: "राष्ट्रीय वयोश्री योजना",
    },
    who: "Senior citizens (aged 60+) belonging to BPL category",
    whoLocal: {
      kannada: "ಬಿಪಿಎಲ್ ವರ್ಗದ ಹಿರಿಯ ನಾಗರಿಕರು (60+ ವಯಸ್ಸು)",
      hindi: "बीपीएल श्रेणी के वरिष्ठ नागरिक (60+ आयु)",
    },
    benefit: "Free assisted-living devices & physical aids (walking sticks, hearing aids, wheelchairs, spects)",
    benefitLocal: {
      kannada: "ಉಚಿತ ಗಾಲಿಕುರ್ಚಿ, ಶ್ರವಣಸಾಧನ, ಕಣ್ಣಿನ ಕನ್ನಡಕ ಮತ್ತು ಊರುಗೋಲು ಉಪಕರಣಗಳು",
      hindi: "मुफ्त व्हीलचेयर, सुनने की मशीन, चश्मा और चलने की छड़ी",
    },
    howToApply: "Apply online at ALIMCO/Social Justice portal or via District Collector assessment camps.",
    applyUrl: "https://socialjustice.gov.in",
    color: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  {
    id: 13,
    icon: "♿",
    category: "welfare",
    name: "Swavlamban Card / Unique Disability ID (UDID)",
    nameLocal: {
      kannada: "ಸ್ವಾವಲಂಬನ್ ಕಾರ್ಡ್ / ಯುಡಿಐಡಿ ಯೋಜನೆ",
      hindi: "स्वावलंबन कार्ड / यूडीआईडी योजना",
    },
    who: "Persons with Disabilities (PwDs)",
    whoLocal: {
      kannada: "ವಿಕಲಚೇತನ ನಾಗರಿಕರು",
      hindi: "दिव्यांगजन (विकलांग व्यक्ति)",
    },
    benefit: "Single nationwide Card for free medical care, disability pension, artificial limbs, & travel concessions",
    benefitLocal: {
      kannada: "ಉಚಿತ ವೈದ್ಯಕೀಯ ಚಿಕಿತ್ಸೆ, ಪಿಂಚಣಿ ಮತ್ತು ಪ್ರಯಾಣ ಸವಲತ್ತುಗಳ ಏಕೈಕ ಕಾರ್ಡ್",
      hindi: "मुफ्त इलाज, विकलांगता पेंशन और यात्रा रियायतों के लिए एकल कार्ड",
    },
    howToApply: "Apply online at Swavlamban Card portal with Disability Certificate & Photo.",
    applyUrl: "https://www.swavlambancard.gov.in",
    color: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  {
    id: 14,
    icon: "🌾",
    category: "farmers",
    name: "PM Kisan Samman Nidhi (PM-KISAN)",
    nameLocal: {
      kannada: "ಪಿಎಂ ಕಿಸಾನ್ ಸಮ್ಮಾನ್ ನಿಧಿ",
      hindi: "पीएम किसान सम्मान निधि",
    },
    who: "Small and marginal landholder farmer families across India",
    whoLocal: {
      kannada: "ಭಾರತದ ಸಣ್ಣ ಮತ್ತು ಅಂಚಿನ ರೈತ ಕುಟುಂಬಗಳು",
      hindi: "छोटे और सीमांत किसान परिवार",
    },
    benefit: "Direct income & health support of ₹6,000/year in 3 equal installments of ₹2,000",
    benefitLocal: {
      kannada: "ವರ್ಷಕ್ಕೆ ₹6,000 ನೇರ ಆರ್ಥಿಕ ನೆರವು (ವರ್ಷದಲ್ಲಿ 3 ಕಂತುಗಳಲ್ಲಿ)",
      hindi: "प्रति वर्ष ₹6,000 की नकद वित्तीय सहायता (3 किस्तों में)",
    },
    howToApply: "Self-register on PM-Kisan Portal or visit nearest Common Service Centre (CSC).",
    applyUrl: "https://pmkisan.gov.in",
    color: "#F7FEE7",
    borderColor: "#D9F99D",
  },
  {
    id: 15,
    icon: "❤️",
    category: "welfare",
    name: "PM CARES for Children Scheme",
    nameLocal: {
      kannada: "ಪಿಎಂ ಕೇರ್ಸ್ ಚಿಲ್ಡ್ರನ್ ಯೋಜನೆ",
      hindi: "पीएम केयर्स फॉर चिल्ड्रन योजना",
    },
    who: "Children who lost both parents due to COVID-19 pandemic",
    whoLocal: {
      kannada: "ಕೋವಿಡ್‌ನಿಂದ ಪೋಷಕರನ್ನು ಕಳೆದುಕೊಂಡ ಮಕ್ಕಳು",
      hindi: "कोविड महामारी के कारण अनाथ हुए बच्चे",
    },
    benefit: "Free Ayushman Bharat health insurance up to ₹5 lakh/year, education support, & ₹10 lakh corpus at age 23",
    benefitLocal: {
      kannada: "ಉಚಿತ ₹5 ಲಕ್ಷ ಆಯುಷ್ಮಾನ್ ವಿಮೆ, ಉಚಿತ ಶಿಕ್ಷಣ ಮತ್ತು 23ನೇ ವಯಸ್ಸಿಗೆ ₹10 ಲಕ್ಷ ನಿಧಿ",
      hindi: "₹5 लाख का मुफ्त स्वास्थ्य बीमा, मुफ्त शिक्षा और 23 वर्ष की उम्र में ₹10 लाख फंड",
    },
    howToApply: "Apply on PM CARES Children portal or via District Magistrate (DM) office.",
    applyUrl: "https://pmcaresforchildren.in",
    color: "#FFF1F2",
    borderColor: "#FECDD3",
  },
  {
    id: 16,
    icon: "👵",
    category: "pension",
    name: "Pradhan Mantri Vaya Vandana Yojana (PMVVY)",
    nameLocal: {
      kannada: "ಪ್ರಧಾನ ಮಂತ್ರಿ ವಯ ವಂದನಾ ಯೋಜನೆ",
      hindi: "प्रधानमंत्री वय वंदना योजना",
    },
    who: "Senior citizens aged 60 years and above",
    whoLocal: {
      kannada: "60 ವರ್ಷ ಮತ್ತು ಅದಕ್ಕಿಂತ ಹೆಚ್ಚಿನ ವಯಸ್ಸಿನ ಹಿರಿಯ ನಾಗರಿಕರು",
      hindi: "60 वर्ष और उससे अधिक आयु के वरिष्ठ नागरिक",
    },
    benefit: "Guaranteed monthly pension with 7.4% per annum interest rate for 10 years",
    benefitLocal: {
      kannada: "10 ವರ್ಷಗಳ ಅವಧಿಗೆ ನಿಗದಿತ ಮಾಸಿಕ ಪಿಂಚಣಿ ಮತ್ತು ಆರ್ಥಿಕ ಭದ್ರತೆ",
      hindi: "10 वर्षों के लिए 7.4% ब्याज दर पर गारंटीकृत मासिक पेंशन",
    },
    howToApply: "Purchase offline or online through Life Insurance Corporation of India (LIC).",
    applyUrl: "https://licindia.in",
    color: "#FDF2F8",
    borderColor: "#FBCFE8",
  },
  {
    id: 17,
    icon: "🍲",
    category: "health",
    name: "PM POSHAN Scheme (Mid-Day Meal)",
    nameLocal: {
      kannada: "ಪಿಎಂ ಪೋಷಣ್ ಯೋಜನೆ (ಮಧ್ಯಾಹ್ನದ ಬಿಸಿಊಟ)",
      hindi: "पीएम पोषण योजना (मध्याह्न भोजन)",
    },
    who: "Children studying in primary and upper primary classes in Government Schools",
    whoLocal: {
      kannada: "ಸರ್ಕಾರಿ ಶಾಲೆಗಳಲ್ಲಿ ಓದುತ್ತಿರುವ ಪ್ರಾಥಮಿಕ ಶಾಲಾ ಮಕ್ಕಳು",
      hindi: "सरकारी स्कूलों में पढ़ने वाले प्राथमिक कक्षाओं के बच्चे",
    },
    benefit: "Free nutritious hot cooked meal every school day to improve nutrition and health",
    benefitLocal: {
      kannada: "ಮಕ್ಕಳ ಪೌಷ್ಟಿಕತೆಗಾಗಿ ಪ್ರತಿದಿನ ಉಚಿತ ಬಿಸಿ ಊಟ ಮತ್ತು ಆರೋಗ್ಯ ತಪಾಸಣೆ",
      hindi: "बच्चों के पोषण और स्वास्थ्य के लिए रोजाना मुफ्त गर्म भोजन",
    },
    howToApply: "Automatic coverage for all students enrolled in Government and Aided Schools.",
    applyUrl: "https://pmposhan.education.gov.in",
    color: "#FEF9C3",
    borderColor: "#FDE047",
  },
  {
    id: 18,
    icon: "🧠",
    category: "health",
    name: "Tele-MANAS / National Mental Health Programme",
    nameLocal: {
      kannada: "ಟೆಲಿ-ಮಾನಸ್ ಉಚಿತ ಮಾನಸಿಕ ಆರೋಗ್ಯ ಸೇವೆ",
      hindi: "टेली-मानस राष्ट्रीय मानसिक स्वास्थ्य कार्यक्रम",
    },
    who: "Anyone in need of mental health support or psychological counseling",
    whoLocal: {
      kannada: "ಮಾನಸಿಕ ಆರೋಗ್ಯ ಮತ್ತು ಮಾನಸಿಕ ನೆರವು ಅಗತ್ಯವಿರುವ ಯಾರಾದರೂ",
      hindi: "मानसिक स्वास्थ्य सहायता या परामर्श चाहने वाले सभी व्यक्ति",
    },
    benefit: "24x7 free tele-mental health services in 20+ languages via Toll-Free Helpline 14416",
    benefitLocal: {
      kannada: "ಟೋಲ್-ಫ್ರೀ ಸಂಖ್ಯೆ 14416 ಮೂಲಕ 24x7 ಉಚಿತ ಮಾನಸಿಕ ಆರೋಗ್ಯ ಆಪ್ತಸಮಾಲೋಚನೆ",
      hindi: "टोल-फ्री 14416 के माध्यम से 24x7 मुफ्त मानसिक स्वास्थ्य परामर्श",
    },
    howToApply: "Call toll-free number 14416 or 1800-891-4416 from any phone anywhere in India.",
    applyUrl: "https://telemanas.mohfw.gov.in",
    color: "#E0E7FF",
    borderColor: "#818CF8",
  },
  {
    id: 19,
    icon: "🏥",
    category: "health",
    name: "PM Ayushman Bharat Health Infrastructure Mission (PM-ABHIM)",
    nameLocal: {
      kannada: "ಪಿಎಂ ಆಯುಷ್ಮಾನ್ ಭಾರತ್ ಆರೋಗ್ಯ ಮೂಲಸೌಕರ್ಯ ಯೋಜನೆ",
      hindi: "पीएम आयुष्मान भारत स्वास्थ्य बुनियादी ढांचा मिशन",
    },
    who: "All citizens benefiting from upgraded critical care & ICU hospital infrastructure",
    whoLocal: {
      kannada: "ಉತ್ತಮ ಉಚಿತ ತುರ್ತು ಚಿಕಿತ್ಸೆ ಬಯಸುವ ಎಲ್ಲಾ ನಾಗರಿಕರು",
      hindi: "बेहतर आपातकालीन और क्रिटिकल केयर सुविधा पाने वाले नागरिक",
    },
    benefit: "Establishment of Critical Care Hospital Blocks & Health and Wellness Centres nationwide",
    benefitLocal: {
      kannada: "ಜಿಲ್ಲಾ ಮಟ್ಟದಲ್ಲಿ ಉಚಿತ ಐಸಿಯು ಚಿಕಿತ್ಸಾ ಘಟಕಗಳು ಮತ್ತು ಉಚಿತ ತಪಾಸಣೆ",
      hindi: "जिला स्तर पर मुफ्त क्रिटिकल केयर ब्लॉक और स्वास्थ्य केंद्र",
    },
    howToApply: "Services accessible at all upgraded District Hospitals and Urban Health Centers.",
    applyUrl: "https://www.myscheme.gov.in/schemes/pm-abhim",
    color: "#CCFBF1",
    borderColor: "#5EEAD4",
  },
  {
    id: 20,
    icon: "🫁",
    category: "health",
    name: "National Tuberculosis Elimination Program (NTEP)",
    nameLocal: {
      kannada: "ರಾಷ್ಟ್ರೀಯ ಕ್ಷಯರೋಗ ನಿರ್ಮೂಲನಾ ಕಾರ್ಯಕ್ರಮ",
      hindi: "राष्ट्रीय टीबी उन्मूलन कार्यक्रम",
    },
    who: "All persons suspected of or diagnosed with Tuberculosis (TB)",
    whoLocal: {
      kannada: "ಕ್ಷಯರೋಗದ ಲಕ್ಷಣವಿರುವ ಅಥವಾ ಚಿಕಿತ್ಸೆ ಪಡೆಯುತ್ತಿರುವ ಯಾರಾದರೂ",
      hindi: "टीबी के लक्षण वाले या पीड़ित सभी मरीज",
    },
    benefit: "Free Sputum Testing, CBNAAT diagnostic tests, & complete course of anti-TB medicines",
    benefitLocal: {
      kannada: "ಉಚಿತ ಕ್ಷಯರೋಗ ಪರೀಕ್ಷೆಗಳು ಮತ್ತು ಸಂಪೂರ್ಣ ಉಚಿತ ಷಡ್ಮಾಸಿಕ ಔಷಧಿಗಳು",
      hindi: "मुफ्त टीबी जांच, मुफ्त दवाएं और संपूर्ण मुफ्त इलाज",
    },
    howToApply: "Visit any Government Hospital, PHC, or government designated testing center.",
    applyUrl: "https://tbcindia.gov.in",
    color: "#F1F5F9",
    borderColor: "#94A3B8",
  },
  {
    id: 21,
    icon: "💰",
    category: "health",
    name: "Rashtriya Arogya Nidhi (RAN)",
    nameLocal: {
      kannada: "ರಾಷ್ಟ್ರೀಯ ಆರೋಗ್ಯ ನಿಧಿ",
      hindi: "राष्ट्रीय आरोग्य निधि",
    },
    who: "BPL patients suffering from life-threatening major diseases (Cancer, Super-Specialty care)",
    whoLocal: {
      kannada: "ಅಪಾಯಕಾರಿ ಕಾಯಿಲೆಯಿಂದ ಬಳಲುತ್ತಿರುವ ಬಿಪಿಎಲ್ ರೋಗಿಗಳು",
      hindi: "गंभीर जानलेवा बीमारियों से पीड़ित बीपीएल मरीज",
    },
    benefit: "One-time financial assistance up to ₹15 lakh for treatment at Government Super Specialty Hospitals",
    benefitLocal: {
      kannada: "ಸೂಪರ್ ಸ್ಪೆಷಾಲಿಟಿ ಆಸ್ಪತ್ರೆ ಚಿಕಿತ್ಸೆಗೆ ಗರಿಷ್ಠ ₹15 ಲಕ್ಷ ನೇರ ಆರ್ಥಿಕ ನೆರವು",
      hindi: "सरकारी सुपर स्पेशलिटी अस्पताल में इलाज हेतु ₹15 लाख तक की वित्तीय सहायता",
    },
    howToApply: "Submit application form certified by treating doctor & Hospital Superintendent.",
    applyUrl: "https://main.mohfw.gov.in",
    color: "#FDF4FF",
    borderColor: "#F0ABFC",
  },
  {
    id: 22,
    icon: "🏥",
    category: "health",
    name: "Central Government Health Scheme (CGHS)",
    nameLocal: {
      kannada: "ಕೇಂದ್ರ ಸರ್ಕಾರಿ ನೌಕರರ ಆರೋಗ್ಯ ಯೋಜನೆ (CGHS)",
      hindi: "केंद्रीय सरकार स्वास्थ्य योजना (CGHS)",
    },
    who: "Central Government employees, pensioners, and their dependent family members",
    whoLocal: {
      kannada: "ಕೇಂದ್ರ ಸರ್ಕಾರಿ ನೌಕರರು, ಪಿಂಚಣಿದಾರರು ಮತ್ತು ಅವರ ಕುಟುಂಬದವರು",
      hindi: "केंद्रीय सरकार के कर्मचारी, पेंशनभोगी और उनके आश्रित",
    },
    benefit: "Comprehensive OPD, IPD, and cashless hospitalization across empaneled hospitals",
    benefitLocal: {
      kannada: "ಸಂಪೂರ್ಣ ಉಚಿತ ಹೊರರೋಗಿ ಮತ್ತು ಒಳರೋಗಿ ಆಸ್ಪತ್ರೆ ಚಿಕಿತ್ಸೆ",
      hindi: "मुफ्त ओपीडी, आईपीडी और एम्पैनल्ड अस्पतालों में कैशलेस इलाज",
    },
    howToApply: "Apply for CGHS Plastic Card online via CGHS portal with office endorsement.",
    applyUrl: "https://cghs.nic.in",
    color: "#ECFEFF",
    borderColor: "#67E8F9",
  },
]

const STATE_SCHEMES = {
  karnataka: [
    {
      id: 101,
      icon: "🏥",
      category: "health",
      name: "Arogya Karnataka",
      nameLocal: { kannada: "ಆರೋಗ್ಯ ಕರ್ನಾಟಕ" },
      who: "All Karnataka residents",
      whoLocal: { kannada: "ಎಲ್ಲಾ ಕರ್ನಾಟಕ ನಿವಾಸಿಗಳು" },
      benefit: "₹1.5 lakh to ₹5 lakh free treatment",
      benefitLocal: { kannada: "₹1.5 ಲಕ್ಷದಿಂದ ₹5 ಲಕ್ಷ ಉಚಿತ ಚಿಕಿತ್ಸೆ" },
      howToApply: "Visit nearest government hospital. Bring Aadhaar and ration card.",
      applyUrl: "https://arogya.karnataka.gov.in",
      color: "#E1F5EE",
      borderColor: "#9FE1CB",
    },
    {
      id: 102,
      icon: "👩",
      category: "womenChild",
      name: "Bhagyalakshmi Scheme",
      nameLocal: { kannada: "ಭಾಗ್ಯಲಕ್ಷ್ಮಿ ಯೋಜನೆ" },
      who: "Girl child born in BPL family",
      whoLocal: { kannada: "ಬಿಪಿಎಲ್ ಕುಟುಂಬದಲ್ಲಿ ಜನಿಸಿದ ಹೆಣ್ಣು ಮಗು" },
      benefit: "₹1 lakh on 18th birthday + insurance coverage",
      benefitLocal: { kannada: "18ನೇ ವಯಸ್ಸಿನಲ್ಲಿ ₹1 ಲಕ್ಷ + ವಿಮೆ" },
      howToApply: "Register at Anganwadi within 1 year of birth. Bring birth certificate.",
      applyUrl: "https://wcd.karnataka.gov.in",
      color: "#FBEAF0",
      borderColor: "#F4C0D1",
    },
  ],
  rajasthan: [
    {
      id: 201,
      icon: "🏥",
      category: "insurance",
      name: "Mukhyamantri Chiranjeevi Yojana",
      nameLocal: { hindi: "मुख्यमंत्री चिरंजीवी योजना" },
      who: "All Rajasthan residents",
      whoLocal: { hindi: "राजस्थान के सभी निवासी" },
      benefit: "₹25 lakh free health insurance per family",
      benefitLocal: { hindi: "प्रति परिवार ₹25 लाख मुफ्त स्वास्थ्य बीमा" },
      howToApply: "Register online at chiranjeevi.rajasthan.gov.in or nearest e-mitra centre.",
      applyUrl: "https://chiranjeevi.rajasthan.gov.in",
      color: "#E1F5EE",
      borderColor: "#9FE1CB",
    },
  ],
  tamilNadu: [
    {
      id: 301,
      icon: "🏥",
      category: "health",
      name: "Chief Minister's Comprehensive Health Insurance",
      nameLocal: { tamil: "முதலமைச்சர் விரிவான சுகாதார காப்பீடு" },
      who: "Families with annual income below ₹72,000",
      whoLocal: { tamil: "ஆண்டு வருமானம் ₹72,000க்கு கீழ் உள்ள குடும்பங்கள்" },
      benefit: "₹5 lakh free treatment per family per year",
      benefitLocal: { tamil: "ஆண்டுக்கு குடும்பத்திற்கு ₹5 லட்சம் இலவச சிகிச்சை" },
      howToApply: "Visit nearest government hospital with ration card and Aadhaar.",
      applyUrl: "https://www.cmchistn.com",
      color: "#E1F5EE",
      borderColor: "#9FE1CB",
    },
  ],
  andhraPradesh: [
    {
      id: 401,
      icon: "🏥",
      category: "health",
      name: "Dr. YSR Aarogyasri",
      nameLocal: { telugu: "డా. వైఎస్ఆర్ ఆరోగ్యశ్రీ" },
      who: "BPL families of Andhra Pradesh",
      whoLocal: { telugu: "ఆంధ్రప్రదేశ్ బిపిఎల్ కుటుంబాలు" },
      benefit: "₹5 lakh free treatment for 2000+ diseases",
      benefitLocal: { telugu: "2000+ వ్యాధులకు ₹5 లక్షల ఉచిత చికిత్స" },
      howToApply: "Register at nearest government hospital with white ration card.",
      applyUrl: "https://aarogyasri.ap.gov.in",
      color: "#E1F5EE",
      borderColor: "#9FE1CB",
    },
  ],
  maharashtra: [
    {
      id: 501,
      icon: "🏥",
      category: "health",
      name: "Mahatma Jyotiba Phule Jan Arogya Yojana",
      nameLocal: { marathi: "महात्मा जोतिबा फुले जन आरोग्य योजना" },
      who: "All Maharashtra residents with yellow/orange ration card",
      whoLocal: { marathi: "पिवळे/नारिंगी रेशन कार्ड असलेले महाराष्ट्रातील सर्व रहिवासी" },
      benefit: "₹5 lakh free treatment per year",
      benefitLocal: { marathi: "वर्षाला ₹5 लाख मोफत उपचार" },
      howToApply: "Visit network hospital with ration card and Aadhaar card.",
      applyUrl: "https://www.jeevandayee.gov.in",
      color: "#E1F5EE",
      borderColor: "#9FE1CB",
    },
  ],
  westBengal: [
    {
      id: 601,
      icon: "🏥",
      category: "health",
      name: "Swasthya Sathi",
      nameLocal: { bengali: "স্বাস্থ্য সাথী" },
      who: "All West Bengal families",
      whoLocal: { bengali: "পশ्चिमবঙ্গের সমস্ত পরিবার" },
      benefit: "₹5 lakh free treatment per family per year",
      benefitLocal: { bengali: "পরিবার প্রতি বছরে ₹5 লাখ বিনামূল্যে চিকিৎসা" },
      howToApply: "Apply online at swasthyasathi.gov.in or nearest health department.",
      applyUrl: "https://swasthyasathi.gov.in",
      color: "#E1F5EE",
      borderColor: "#9FE1CB",
    },
  ],
  gujarat: [
    {
      id: 701,
      icon: "🏥",
      category: "health",
      name: "Mukhyamantri Amrutum Yojana",
      nameLocal: { gujarati: "મુખ્યમંત્રી અમૃતમ યોજના" },
      who: "BPL families of Gujarat",
      whoLocal: { gujarati: "ગુજરાતના BPL પરિવારો" },
      benefit: "₹5 lakh free treatment for serious diseases",
      benefitLocal: { gujarati: "ગંભીર બિમારીઓ માટે ₹5 લાખ મફત સારવાર" },
      howToApply: "Visit nearest government hospital or MA card centre with ration card.",
      applyUrl: "https://www.magujarat.com",
      color: "#E1F5EE",
      borderColor: "#9FE1CB",
    },
  ],
  punjab: [
    {
      id: 801,
      icon: "🏥",
      category: "health",
      name: "Sarbat Sehat Bima Yojana",
      nameLocal: { punjabi: "ਸਰਬੱਤ ਸਿਹਤ ਬੀਮਾ ਯੋਜਨਾ" },
      who: "Families of Punjab",
      whoLocal: { punjabi: "ਪੰਜਾਬ ਦੇ ਪਰਿਵਾਰ" },
      benefit: "₹5 lakh health insurance per family per year",
      benefitLocal: { punjabi: "ਪ੍ਰਤੀ ਪਰਿਵਾਰ ਪ੍ਰਤੀ ਸਾਲ ₹5 ਲੱਖ ਦਾ ਮੁਫ਼ਤ ਸਿਹਤ ਬੀਮਾ" },
      howToApply: "Visit empaneled hospital or CSC centre with ration card.",
      applyUrl: "https://shapsc.punjab.gov.in",
      color: "#E1F5EE",
      borderColor: "#9FE1CB",
    },
  ],
}

const pageText = {
  english: {
    brand: "SahayAI",
    subtitle: "Access central and state schemes in your preferred language.",
    sectionIntro: "Explore verified information for health, insurance, women, and welfare schemes.",
    languageLabel: "Language",
    stateLabel: "State",
    categoryLabel: "Category",
    centralTab: "Central Schemes",
    stateTab: "State Schemes",
    noStateSchemes: "No state-specific schemes found for this state.",
    noMatches: "No schemes match this filter. Try another category.",
    footerHelp: "Help",
    footerFaq: "FAQs",
    footerResources: "Official Resources",
    footerText: "Trusted government scheme information for all citizens.",
    eligibilityLabel: "Eligibility",
    benefitsLabel: "Key Benefits",
    detailsLabel: "Scheme Details",
    applyNow: "Apply Now →",
    readAloud: "🔊 Read",
    brandDesc: "Government scheme portal for inclusive access.",
  },
  kannada: {
    brand: "SahayAI",
    subtitle: "ನಿಮ್ಮ ಇಚ್ಛಿತ ಭಾಷೆಯಲ್ಲಿ ಕೇಂದ್ರ ಮತ್ತು ರಾಜ್ಯ ಯೋಜನೆಗಳಿಗೆ ಪ್ರವೇಶಿಸಿ.",
    sectionIntro: "ಆರೋಗ್ಯ, ವಿಮೆ, ಮಹಿಳಾ ಮತ್ತು ಕಲ್ಯಾಣ ಯೋಜನೆಗಳ ಪರಿಶೋಧಿತ ಮಾಹಿತಿ ಪರಿಶೀಲಿಸಿ.",
    languageLabel: "ಭಾಷೆ",
    stateLabel: "ರಾಜ್ಯ",
    categoryLabel: "ವರ್ಗ",
    centralTab: "ಕೇಂದ್ರ ಯೋಜನೆಗಳು",
    stateTab: "ರಾಜ್ಯ ಯೋಜನೆಗಳು",
    noStateSchemes: "ಈ ರಾಜ್ಯಕ್ಕೆ ರಾಜ್ಯ-ನಿರ್ದಿಷ್ಟ ಯೋಜನೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ.",
    noMatches: "ಯಾವುದೇ ಯೋಜನೆ ಈ ಶ್ರೇಣಿಗೆ ಹೊಂದಿಕೆಯಾಗಲಿಲ್ಲ. ಬೇರೆ ಶ್ರೇಣಿಯನ್ನು ಪ್ರಯತ್ನಿಸಿ.",
    footerHelp: "ಸಹಾಯ",
    footerFaq: "ಅಾಗಾಗ ಕೇಳುವ ಪ್ರಶ್ನೆಗಳು",
    footerResources: "ಅಧಿಕೃತ ಸಂಪನ್ಮೂಲಗಳು",
    footerText: "ಎಲ್ಲಾ ನಾಗರಿಕರಿಗೂ ವಿಶ್ವಾಸಾರ್ಹ ಸರಕಾರಿ ಯೋಜನೆ ಮಾಹಿತಿ.",
    eligibilityLabel: "ಅರ್ಹತೆ",
    benefitsLabel: "ಮುಖ್ಯ ಪ್ರಯೋಜನಗಳು",
    detailsLabel: "ಯೋಜನೆ ವಿವರಗಳು",
    applyNow: "ಅರ್ಜಿಸು →",
    readAloud: "🔊 ಓದಿ",
    brandDesc: "ಸಮಾವೇಶಿ ಪ್ರವೇಶಕ್ಕಾಗಿ ಸರ್ಕಾರ ಯೋಜನೆ ಪೋರ್ಟ್‌ಲ್.",
  },
  hindi: {
    brand: "SahayAI",
    subtitle: "अपनी पसंदीदा भाषा में केंद्र और राज्य योजनाओं तक पहुंचें।",
    sectionIntro: "स्वास्थ्य, बीमा, महिला और कल्याण योजनाओं के लिए सत्यापित जानकारी देखें।",
    languageLabel: "भाषा",
    stateLabel: "राज्य",
    categoryLabel: "श्रेणी",
    centralTab: "केंद्रीय योजनाएं",
    stateTab: "राज्य योजनाएं",
    noStateSchemes: "इस राज्य के लिए कोई राज्य-विशिष्ट योजनाएं नहीं मिलीं।",
    noMatches: "कोई योजना फ़िल्टर से मेल नहीं खाती। दूसरी श्रेणी आज़माएँ।",
    footerHelp: "मदद",
    footerFaq: "अक्सर पूछे जाने वाले प्रश्न",
    footerResources: "अधिकारक संसाधन",
    footerText: "सभी नागरिकों के लिए विश्वसनीय सरकारी योजना जानकारी।",
    eligibilityLabel: "पात्रता",
    benefitsLabel: "मुख्य लाभ",
    detailsLabel: "योजना विवरण",
    applyNow: "अर्ज करें →",
    readAloud: "🔊 पढ़ें",
    brandDesc: "समावेशी पहुंच के लिए सरकारी योजना पोर्टल.",
  },
}

const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { min-height: 100%; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f3f6f8; color: #102a43; }
  .page { min-height: 100vh; display: flex; flex-direction: column; }
  .topbar { background: #0f5f5a; color: white; padding: 18px 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
  .brand { font-size: 1.4rem; font-weight: 800; letter-spacing: 0.04em; }
  .nav-items { display: flex; gap: 14px; flex-wrap: wrap; align-items: center; }
  .nav-item { color: rgba(255,255,255,0.85); text-decoration: none; font-size: 0.95rem; }
  .nav-item:hover { color: white; }
  .back-btn { background: rgba(255,255,255,0.16); border: 1px solid rgba(255,255,255,0.24); color: white; border-radius: 12px; padding: 10px 16px; cursor: pointer; }
  .back-btn:hover { background: rgba(255,255,255,0.24); }
  .content { flex: 1; width: 100%; max-width: 1180px; margin: 0 auto; padding: 24px; }
  .hero { background: white; border-radius: 24px; padding: 28px 32px; border: 1px solid #dfe7ed; box-shadow: 0 18px 40px rgba(16, 42, 67, 0.08); }
  .hero-title { font-size: 2rem; line-height: 1.05; color: #102a43; font-weight: 800; margin-bottom: 12px; }
  .hero-subtitle { font-size: 1rem; color: #425466; line-height: 1.7; max-width: 860px; margin-bottom: 24px; }
  .controls { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-top: 12px; }
  .controls label { display: flex; flex-direction: column; gap: 8px; font-size: 0.9rem; color: #334e68; }
  .controls select { min-height: 52px; border-radius: 16px; border: 1px solid #cbd5e1; padding: 12px 14px; background: white; color: #102a43; font-size: 0.95rem; }
  .tabs { display: flex; gap: 12px; margin: 24px 0 12px; flex-wrap: wrap; }
  .tab { border-radius: 14px; padding: 12px 20px; border: 1px solid transparent; background: #f8fafc; color: #334155; cursor: pointer; font-weight: 700; transition: all 0.2s ease; }
  .tab.active { background: #0f766e; color: white; border-color: #0f766e; }
  .category-pill-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
  .category-pill { padding: 8px 14px; border-radius: 999px; background: #e2e8f0; color: #334155; font-size: 0.88rem; font-weight: 700; }
  .section-intro { margin-bottom: 18px; color: #475569; font-size: 0.95rem; }
  .schemes-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
  @media (max-width: 960px) { .controls { grid-template-columns: 1fr; } .schemes-grid { grid-template-columns: 1fr; } }
  .scheme-card { background: white; border-radius: 22px; border: 1px solid #d9e2ec; padding: 22px; display: flex; flex-direction: column; gap: 18px; box-shadow: 0 8px 24px rgba(16, 42, 67, 0.04); transition: transform 0.2s ease; }
  .scheme-card:hover { transform: translateY(-2px); }
  .scheme-header { display: flex; gap: 14px; align-items: flex-start; }
  .scheme-icon { width: 56px; height: 56px; border-radius: 18px; background: #edf7f4; color: #0f766e; display: grid; place-items: center; font-size: 1.6rem; }
  .scheme-title { font-size: 1rem; font-weight: 800; color: #102a43; line-height: 1.3; }
  .scheme-who, .scheme-benefit, .scheme-how { color: #475569; font-size: 0.92rem; line-height: 1.6; }
  .scheme-pill { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 999px; background: #f8fafc; color: #334155; font-size: 0.82rem; font-weight: 700; }
  .scheme-meta { display: flex; flex-wrap: wrap; gap: 10px; }
  .scheme-segment { display: grid; gap: 8px; }
  .scheme-label { font-size: 0.82rem; font-weight: 700; color: #334155; }
  .scheme-actions { display: flex; flex-wrap: wrap; gap: 12px; }
  .action-button, .action-link { border-radius: 14px; padding: 12px 18px; font-size: 0.92rem; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
  .action-link { display: inline-flex; align-items: center; justify-content: center; text-decoration: none; color: white; background: #0f766e; }
  .action-button { background: white; color: #0f766e; border-color: #a7f3d0; }
  .action-link:hover, .action-button:hover { opacity: 0.95; }
  .empty-state { background: white; border: 1px solid #dfe7ed; border-radius: 22px; padding: 30px; text-align: center; color: #475569; }
  .empty-title { font-size: 1rem; font-weight: 700; color: #102a43; margin-bottom: 10px; }
  .footer { background: #102a43; color: #e2e8f0; padding: 32px 24px; margin-top: 24px; }
  .footer-inner { display: flex; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
  .footer-brand { font-size: 1.1rem; font-weight: 800; margin-bottom: 10px; }
  .footer-links { display: flex; gap: 18px; flex-wrap: wrap; }
  .footer-links a { color: #cbd5e1; text-decoration: none; font-size: 0.95rem; }
  .footer-links a:hover { color: white; }
  .footer-note { max-width: 660px; line-height: 1.8; color: #c5d4e1; margin-top: 14px; }
`

function Schemes() {
  const location = useLocation()
  const navigate = useNavigate()
  const [expandedId, setExpandedId] = useState(null)
  const [activeTab, setActiveTab] = useState("central")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedState, setSelectedState] = useState(location.state?.selectedState || "karnataka")
  const [language, setLanguage] = useState(location.state?.language || "english")

  const name = location.state?.name || "User"
  const userId = location.state?.userId
  const t = pageText[language] || pageText.english
  const categories = categoryLabels[language] || categoryLabels.english
  const stateLabel = stateNames[language]?.[selectedState] || selectedState

  const schemes = activeTab === "central" ? CENTRAL_SCHEMES : STATE_SCHEMES[selectedState] || []
  const visibleSchemes = schemes.filter(
    (scheme) => selectedCategory === "all" || scheme.category === selectedCategory
  )

  const getLocalText = (scheme, field) => {
    if (scheme[field + "Local"] && scheme[field + "Local"][language]) {
      return scheme[field + "Local"][language]
    }
    return scheme[field]
  }

  const speakScheme = (scheme) => {
    unlockVoice()
    const lines = [
      getLocalText(scheme, "name"),
      getLocalText(scheme, "who"),
      getLocalText(scheme, "benefit"),
      scheme.howToApply,
    ].filter(Boolean)
    speakText(lines.join(". "))
  }

  const renderCard = (scheme) => {
    const isOpen = expandedId === scheme.id
    return (
      <article
        key={scheme.id}
        className="scheme-card"
        style={{ background: scheme.color, borderColor: scheme.borderColor }}
      >
        <div className="scheme-header">
          <div className="scheme-icon" aria-hidden="true">{scheme.icon}</div>
          <div>
            <div className="scheme-title">{getLocalText(scheme, "name")}</div>
            <div className="scheme-who">{getLocalText(scheme, "who")}</div>
          </div>
        </div>

        <div className="scheme-meta">
          <span className="scheme-pill">{categories[scheme.category] || categories.all}</span>
          <span className="scheme-pill">{t.benefitsLabel}: {getLocalText(scheme, "benefit")}</span>
        </div>

        {isOpen && (
          <div className="scheme-segment">
            <span className="scheme-label">{t.detailsLabel}</span>
            <p className="scheme-how">{scheme.howToApply}</p>
          </div>
        )}

        <div className="scheme-actions">
          <button
            type="button"
            className="action-button"
            onClick={() => setExpandedId(isOpen ? null : scheme.id)}
            aria-expanded={isOpen}
          >
            {isOpen ? t.detailsLabel : t.detailsLabel}
          </button>
          <a
            href={scheme.applyUrl}
            target="_blank"
            rel="noreferrer"
            className="action-link"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              window.open(scheme.applyUrl, "_blank", "noopener,noreferrer")
            }}
          >
            {t.applyNow}
          </a>
          <button
            type="button"
            className="action-button"
            onClick={() => speakScheme(scheme)}
          >
            {t.readAloud}
          </button>
        </div>
      </article>
    )
  }

  const backLabel = language === "hindi" ? "पीछे" : language === "kannada" ? "ಹಿಂದೆ" : "Back"

  return (
    <>
      <style>{styles}</style>
      <div className="page">
        <header className="topbar">
          <div className="brand">{t.brand}</div>
          <nav className="nav-items" aria-label="Primary navigation">
            <a href="#schemes" className="nav-item">{t.centralTab}</a>
            <a href="#schemes" className="nav-item">{t.stateTab}</a>
            <a href="https://india.gov.in" className="nav-item" target="_blank" rel="noreferrer">{t.footerResources}</a>
          </nav>
          <button
            className="back-btn"
            onClick={() => navigate("/dashboard", { state: { userId, name, language, selectedState } })}
          >
            ← {backLabel}
          </button>
        </header>

        <main className="content" id="schemes">
          <section className="hero" aria-labelledby="hero-title">
            <h1 id="hero-title" className="hero-title">{t.brand} — {t.centralTab}</h1>
            <p className="hero-subtitle">{t.subtitle}</p>
            <div className="controls">
              <label>
                <span>{t.languageLabel}</span>
                <select value={language} onChange={(e) => setLanguage(e.target.value)} aria-label={t.languageLabel}>
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t.stateLabel}</span>
                <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)} aria-label={t.stateLabel}>
                  {STATE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {stateNames[language]?.[option.value] || option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t.categoryLabel}</span>
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} aria-label={t.categoryLabel}>
                  {Object.entries(categories).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <div className="tabs" role="tablist" aria-label="Scheme types">
            <button
              type="button"
              className={`tab ${activeTab === "central" ? "active" : ""}`}
              onClick={() => setActiveTab("central")}
              aria-selected={activeTab === "central"}
            >
              {t.centralTab}
            </button>
            <button
              type="button"
              className={`tab ${activeTab === "state" ? "active" : ""}`}
              onClick={() => setActiveTab("state")}
              aria-selected={activeTab === "state"}
            >
              {t.stateTab}
            </button>
          </div>

          <div className="category-pill-row" aria-label="Selected state and category">
            <span className="category-pill">{t.stateLabel}: {stateLabel}</span>
            <span className="category-pill">{t.categoryLabel}: {categories[selectedCategory]}</span>
          </div>

          <p className="section-intro">
            {activeTab === "central"
              ? t.sectionIntro
              : `${t.sectionIntro} ${stateLabel}`}
          </p>

          {visibleSchemes.length > 0 ? (
            <div className="schemes-grid">
              {visibleSchemes.map(renderCard)}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-title">
                {activeTab === "state" ? t.noStateSchemes : t.noMatches}
              </div>
              <p>{t.sectionIntro}</p>
            </div>
          )}
        </main>

        <footer className="footer">
          <div className="footer-inner">
            <div>
              <div className="footer-brand">{t.brand}</div>
              <p className="footer-note">{t.brandDesc}</p>
            </div>
            <div className="footer-links" role="navigation" aria-label="Footer links">
              <a href="#" onClick={(e) => e.preventDefault()}>{t.footerHelp}</a>
              <a href="#" onClick={(e) => e.preventDefault()}>{t.footerFaq}</a>
              <a href="https://india.gov.in" target="_blank" rel="noreferrer">{t.footerResources}</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}

export default Schemes
