import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { speakText, unlockVoice } from "../voiceHelper"

const CENTRAL_SCHEMES = [
  {
    id: 1,
    icon: "🏥",
    category: "health",
    name: "Ayushman Bharat PM-JAY",
    nameLocal: {
      kannada: "ಆಯುಷ್ಮಾನ್ ಭಾರತ್ PM-JAY",
      hindi: "आयुष्मान भारत PM-JAY",
      tamil: "ஆயுஷ்மான் பாரத் PM-JAY",
      telugu: "ఆయుష్మాన్ భారత్ PM-JAY",
      marathi: "आयुष्मान भारत PM-JAY",
      bengali: "আয়ुष্মান ভারত PM-JAY",
      gujarati: "આયુષ્માન ભારત PM-JAY",
      punjabi: "ਆਯੁਸ਼ਮਾਨ ਭਾਰਤ PM-JAY",
    },
    who: "Poor families — bottom 40% of population",
    whoLocal: {
      kannada: "ಬಡ ಕುಟುಂಬಗಳಿಗೆ — ಜನಸಂಖ್ಯೆಯ ಕೆಳ 40%",
      hindi: "गरीब परिवार — नीचे की 40% जनसंख्या",
      tamil: "ஏழை குடும்பங்கள் — கீழ் 40% மக்கள்",
      telugu: "పేద కుటుంబాలు — దిగువ 40% ജനాభా",
      marathi: "गरीब कुटुंबे — खालील 40% लोकसंख्या",
      bengali: "দরিদ্র পরিবার — নিচের ৪০% জনগণ",
      gujarati: "ગરીબ પરિવારો — નીચેના ૪૦% લોકો",
      punjabi: "ਗਰੀਬ ਪਰਿਵਾਰ — ਹੇਠਲੇ 40% ਲੋਕ",
    },
    benefit: "₹5 lakh free hospital treatment per year",
    benefitLocal: {
      kannada: "ವರ್ಷಕ್ಕೆ ₹5 ಲಕ್ಷ ಉಚಿತ ಆಸ್ಪತ್ರೆ ಚಿಕಿತ್ಸೆ",
      hindi: "प्रति वर्ष ₹5 लाख मुफ्त अस्पताल इलाज",
      tamil: "ஆண்டுக்கு ₹5 லட்சம் இலவச மருத்துவமனை சிகிச்சை",
      telugu: "సంవత్సరానికి ₹5 లక్షల ఉచిత ఆసుపత్రి చికిత్స",
      marathi: "वर्षाला ₹5 लाख मोफत रुग्णालय उपचार",
      bengali: "বছরে ₹5 লাখ বিনামূল্যে হাসপাতাল চিকিৎসা",
      gujarati: "વર્ષે ₹5 લાખ મફત હોસ્પિટલ સારવાર",
      punjabi: "ਸਾਲਾਨਾ ₹5 ਲੱਖ ਮੁਫ਼ਤ ਹਸਪਤਾਲ ਇਲਾਜ",
    },
    howToApply: "Visit nearest government hospital or Common Service Centre (CSC). Bring Aadhaar card and ration card.",
    applyUrl: "https://pmjay.gov.in",
    color: "#E1F5EE",
    borderColor: "#9FE1CB",
  },
  {
    id: 2,
    icon: "🤱",
    category: "womenChild",
    name: "Janani Suraksha Yojana",
    nameLocal: {
      kannada: "ಜನನಿ ಸುರಕ್ಷಾ ಯೋಜನೆ",
      hindi: "जननी सुरक्षा योजना",
      tamil: "ஜனனி சுரக்ஷா யோஜனா",
      telugu: "జననీ సురక్షా యోజన",
      marathi: "जननी सुरक्षा योजना",
      bengali: "জননী সুরক্ষা যোজনা",
      gujarati: "જનની સુરક્ષા યોજના",
      punjabi: "ਜਨਨੀ ਸੁਰੱਖਿਆ ਯੋਜਨਾ",
    },
    who: "Pregnant women from poor families",
    whoLocal: {
      kannada: "ಬಡ ಕುಟುಂಬಗಳ ಗರ್ಭಿಣಿ ಮಹಿಳೆಯರು",
      hindi: "गरीब परिवारों की गर्भवती महिलाएं",
      tamil: "ஏழை குடும்பங்களில் கர்ப்பிணி பெண்கள்",
      telugu: "పేద కుటుంబాల గర్భిణీ స్త్రీలు",
      marathi: "गरीब कुटुंबातील गरोदर महिला",
      bengali: "দরিদ্র পরিবারের গর্ভবতী মহিলারা",
      gujarati: "ગરીબ પરિવારોની સગર્ભા મહિલાઓ",
      punjabi: "ਗਰੀਬ ਪਰਿਵਾਰਾਂ ਦੀਆਂ ਗਰਭਵਤੀ ਔਰਤਾਂ",
    },
    benefit: "₹1400 (rural) / ₹1000 (urban) cash after delivery",
    benefitLocal: {
      kannada: "ಹೆರಿಗೆ ನಂತರ ₹1400 (ಗ್ರಾಮೀಣ) / ₹1000 (ನಗರ) ನಗದು",
      hindi: "प्रसव के बाद ₹1400 (ग्रामीण) / ₹1000 (शहरी) नकद",
      tamil: "பிரசவத்திற்கு பிறகு ₹1400 (கிராமம்) / ₹1000 (நகரம்) பணம்",
      telugu: "ప్రసవం తర్వాత ₹1400 (గ్రామీణ) / ₹1000 (పట్టణ) నగదు",
      marathi: "प्रसूतीनंतर ₹1400 (ग्रामीण) / ₹1000 (शहरी) रोख",
      bengali: "প্রসবের পরে ₹1400 (গ্রামীণ) / ₹1000 (শহর) নগদ",
      gujarati: "પ્રસૂતિ પછી ₹1400 (ગ્રામ) / ₹1000 (શહેર) રોકડ",
      punjabi: "ਜਣੇਪੇ ਤੋਂ ਬਾਅਦ ₹1400 (ਪੇਂਡੂ) / ₹1000 (ਸ਼ਹਿਰ) ਨਕਦ",
    },
    howToApply: "Register at nearest government hospital or ASHA worker. Bring Aadhaar and bank passbook.",
    applyUrl: "https://nhm.gov.in/index1.php?lang=1&level=3&sublinkid=841&lid=309",
    color: "#FFF3CD",
    borderColor: "#FFD700",
  },
  {
    id: 3,
    icon: "💊",
    category: "health",
    name: "PM Jan Aushadhi Yojana",
    nameLocal: {
      kannada: "ಪ್ರಧಾನ ಮಂತ್ರಿ ಜನ ಔಷಧಿ ಯೋಜನೆ",
      hindi: "प्रधानमंत्री जन औषधि योजना",
      tamil: "பிரதம மந்திரி ஜன் ஔஷதி யோஜனா",
      telugu: "ప్రధాన మంత్రి జన్ ఔషధి యోజన",
      marathi: "प्रधानमंत्री जन औषधी योजना",
      bengali: "প্রধানমন্ত্রী জন ঔষধি যোজনা",
      gujarati: "પ્રધાનમંત્રી જન ઔષધિ યોજના",
      punjabi: "ਪ੍ਰਧਾਨ ਮੰਤਰੀ ਜਨ ਔਸ਼ਧੀ ਯੋਜਨਾ",
    },
    who: "All citizens",
    whoLocal: {
      kannada: "ಎಲ್ಲಾ ನಾಗರಿಕರು",
      hindi: "सभी नागरिक",
      tamil: "அனைத்து குடிமக்கள்",
      telugu: "అందరు పౌరులు",
      marathi: "सर्व नागरिक",
      bengali: "সকল নাগরিক",
      gujarati: "તમામ નાગરિકો",
      punjabi: "ਸਾਰੇ ਨਾਗਰਿਕ",
    },
    benefit: "Generic medicines at 50-90% less price",
    benefitLocal: {
      kannada: "50-90% ಕಡಿಮೆ ಬೆಲೆಯಲ್ಲಿ ಜೆನೆರಿಕ್ ಔಷಧಿಗಳು",
      hindi: "50-90% कम कीमत पर जेनेरिक दवाइयां",
      tamil: "50-90% குறைந்த விலையில் பொதுவான மருந்துகள்",
      telugu: "50-90% తక్కువ ధరలో జెనెరిక్ మందులు",
      marathi: "50-90% कमी किंमतीत जेनेरिक औषधे",
      bengali: "50-90% কম দামে জেনেরিক ওষুধ",
      gujarati: "50-90% ઓછી કિંમતે જનરિક દવાઓ",
      punjabi: "50-90% ਘੱਟ ਕੀਮਤ 'ਤੇ ਜੈਨੇਰਿਕ ਦਵਾਈਆਂ",
    },
    howToApply: "Visit nearest Jan Aushadhi Kendra store. No registration needed — just show prescription.",
    applyUrl: "https://janaushadhi.gov.in",
    color: "#E6F1FB",
    borderColor: "#B5D4F4",
  },
  {
    id: 4,
    icon: "🤰",
    category: "womenChild",
    name: "PM Matru Vandana Yojana",
    nameLocal: {
      kannada: "ಪ್ರಧಾನ ಮಂತ್ರಿ ಮಾತೃ ವಂದನಾ ಯೋಜನೆ",
      hindi: "प्रधानमंत्री मातृ वंदना योजना",
      tamil: "பிரதம மந்திரி மாத்ரு வந்தனா யோஜனா",
      telugu: "ప్రధాన మంత్రి మాతృ వందన యోజన",
      marathi: "प्रधानमंत्री मातृ वंदना योजना",
      bengali: "প্রধানমন্ত্রী মাতৃ বন্দনা যোজনা",
      gujarati: "પ્રધાનમંત્રી માતૃ વંદના યોજના",
      punjabi: "ਪ੍ਰਧਾਨ ਮੰਤਰੀ ਮਾਤਰੂ ਵੰਦਨਾ ਯੋਜਨਾ",
    },
    who: "Pregnant and lactating mothers for first child",
    whoLocal: {
      kannada: "ಮೊದಲ ಮಗುವಿಗೆ ಗರ್ಭಿಣಿ ಮತ್ತು ಹಾಲುಣಿಸುವ ತಾಯಂದಿರು",
      hindi: "पहले बच्चे के लिए गर्भवती और स्तनपान कराने वाली माताएं",
      tamil: "முதல் குழந்தைக்கு கர்ப்பிணி மற்றும் தாய்ப்பால் கொடுக்கும் தாய்மார்கள்",
      telugu: "మొదటి బిడ్డకు గర్భిణీ మరియు పాలిచ్చే తల్లులు",
      marathi: "पहिल्या मुलासाठी गरोदर आणि स्तनपान करणाऱ्या माता",
      bengali: "প্রথম সন্তানের জন্য গর্ভবতী ও স্তন্যদানকারী মায়েরা",
      gujarati: "પ્રથમ બાળક માટે સગર્ભા અને સ્તનપાન કરાવતી માતાઓ",
      punjabi: "ਪਹਿਲੇ ਬੱਚੇ ਲਈ ਗਰਭਵਤੀ ਅਤੇ ਦੁੱਧ ਪਿਲਾਉਣ ਵਾਲੀਆਂ ਮਾਵਾਂ",
    },
    benefit: "₹5000 in 3 installments directly to bank account",
    benefitLocal: {
      kannada: "ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ 3 ಕಂತುಗಳಲ್ಲಿ ₹5000",
      hindi: "बैंक खाते में 3 किस्तों में ₹5000",
      tamil: "வங்கி கணக்கில் 3 தவணைகளில் ₹5000",
      telugu: "బ్యాంక్ ఖాతాకు 3 వాయిదాలలో ₹5000",
      marathi: "बँक खात्यात 3 हप्त्यांमध्ये ₹5000",
      bengali: "ব্যাংক অ্যাকাউন্টে 3 কিস্তিতে ₹5000",
      gujarati: "બેંક ખાતામાં 3 હપ્તામાં ₹5000",
      punjabi: "ਬੈਂਕ ਖਾਤੇ ਵਿੱਚ 3 ਕਿਸ਼ਤਾਂ ਵਿੱਚ ₹5000",
    },
    howToApply: "Register at Anganwadi centre or nearest government hospital. Bring Aadhaar and bank passbook.",
    applyUrl: "https://pmmvy.wcd.gov.in",
    color: "#FBEAF0",
    borderColor: "#F4C0D1",
  },
  {
    id: 5,
    icon: "🛡️",
    category: "insurance",
    name: "PM Suraksha Bima Yojana",
    nameLocal: {
      kannada: "ಪ್ರಧಾನ ಮಂತ್ರಿ ಸುರಕ್ಷಾ ಬಿಮಾ ಯೋಜನೆ",
      hindi: "प्रधानमंत्री सुरक्षा बीमा योजना",
      tamil: "பிரதம மந்திரி சுரக்ஷா பீமா யோஜனா",
      telugu: "ప్రధాన మంత్రి సురక్షా బీమా యోజన",
      marathi: "प्रधानमंत्री सुरक्षा विमा योजना",
      bengali: "প্রধানমন্ত্রী সুরক্ষা বীমা যোজনা",
      gujarati: "પ્રધાનમંત્રી સુરક્ષા બીમા યોજના",
      punjabi: "ਪ੍ਰਧਾਨ ਮੰਤਰੀ ਸੁਰੱਖਿਆ ਬੀਮਾ ਯੋਜਨਾ",
    },
    who: "Anyone aged 18-70 with bank account",
    whoLocal: {
      kannada: "ಬ್ಯಾಂಕ್ ಖಾತೆ ಇರುವ 18-70 ವಯಸ್ಸಿನ ಯಾರಾದರೂ",
      hindi: "बैंक खाते वाला 18-70 वर्ष का कोई भी व्यक्ति",
      tamil: "வங்கி கணக்கு உள்ள 18-70 வயதினர் யாரும்",
      telugu: "బ్యాంక్ ఖాతా ఉన్న 18-70 వయస్సు వారు",
      marathi: "बँक खाते असलेला 18-70 वर्षांचा कोणीही",
      bengali: "ব্যাংক অ্যাকাউন্ট আছে এমন ১৮-৭০ বছর বয়সী যেকেউ",
      gujarati: "બેંક ખાતું ધરાવતા 18-70 વર્ષના કોઈપણ",
      punjabi: "ਬੈਂਕ ਖਾਤੇ ਵਾਲਾ 18-70 ਸਾਲ ਦਾ ਕੋਈ ਵੀ",
    },
    benefit: "₹2 lakh accident insurance for only ₹20/year",
    benefitLocal: {
      kannada: "ಕೇವಲ ₹20/ವರ್ಷಕ್ಕೆ ₹2 ಲಕ್ಷ ಅಪಘಾತ ವಿಮೆ",
      hindi: "केवल ₹20/साल में ₹2 लाख दुर्घटना बीमा",
      tamil: "வெறும் ₹20/வருடத்தில் ₹2 லட்சம் விபத்து காப்பீடு",
      telugu: "కేవలం ₹20/సంవత్సరానికి ₹2 లక్షల ప్రమాద బీమా",
      marathi: "फक्त ₹20/वर्षात ₹2 लाख अपघात विमा",
      bengali: "মাত্র ₹20/বছরে ₹2 লাখ দুর্ঘটনা বীমা",
      gujarati: "માત્ર ₹20/વર્ષમાં ₹2 લાખ અકસ્માત વીમો",
      punjabi: "ਸਿਰਫ਼ ₹20/ਸਾਲ ਵਿੱਚ ₹2 ਲੱਖ ਦੁਰਘਟਨਾ ਬੀਮਾ",
    },
    howToApply: "Visit any bank branch or apply online through net banking. Link with Aadhaar.",
    applyUrl: "https://www.jansuraksha.gov.in",
    color: "#EAF3DE",
    borderColor: "#C0DD97",
  },
  {
    id: 6,
    icon: "👴",
    category: "health",
    name: "National Health Mission",
    nameLocal: {
      kannada: "ರಾಷ್ಟ್ರೀಯ ಆರೋಗ್ಯ ಮಿಷನ್",
      hindi: "राष्ट्रीय स्वास्थ्य मिशन",
      tamil: "தேசிய சுகாதார இயக்கம்",
      telugu: "జాతీయ ఆరోగ్య మిషన్",
      marathi: "राष्ट्रीय आरोग्य अभियान",
      bengali: "জাতীয় স্বাস্থ্য মিশন",
      gujarati: "રાષ્ટ્રીય આરોગ્ય મિશન",
      punjabi: "ਰਾਸ਼ਟਰੀ ਸਿਹਤ ਮਿਸ਼ਨ",
    },
    who: "All rural and urban poor citizens",
    whoLocal: {
      kannada: "ಎಲ್ಲಾ ಗ್ರಾಮೀಣ ಮತ್ತು ನಗರ ಬಡ ನಾಗರಿಕರು",
      hindi: "सभी ग्रामीण और शहरी गरीब नागरिक",
      tamil: "அனைத்து கிராமப்புற மற்றும் நகர்ப்புற ஏழை குடிமக்கள்",
      telugu: "అందరు గ్రామీణ మరియు పట్టణ పేద పౌరులు",
      marathi: "सर्व ग्रामीण आणि शहरी गरीब नागरिक",
      bengali: "সকল গ্রামীণ ও শহুরে দরিদ্র নাগরিক",
      gujarati: "તમામ ગામઠા અને શહેર ગરીબ નાગરિકો",
      punjabi: "ਸਾਰੇ ਪੇਂਡੂ ਅਤੇ ਸ਼ਹਿਰੀ ਗਰੀਬ ਨਾਗਰਿਕ",
    },
    benefit: "Free primary healthcare, medicines and diagnostics",
    benefitLocal: {
      kannada: "ಉಚಿತ ಪ್ರಾಥಮಿಕ ಆರೋಗ್ಯ ಸೇವೆ, ಔಷಧಿ ಮತ್ತು ಪರೀಕ್ಷೆಗಳು",
      hindi: "मुफ्त प्राथमिक स्वास्थ्य सेवा, दवाइयां और जांच",
      tamil: "இலவச முதன்மை சுகாதாரம், மருந்துகள் மற்றும் பரிசோதனைகள்",
      telugu: "ఉచిత ప్రాథమిక ఆరోగ్య సేవలు, మందులు మరియు పరీక్షలు",
      marathi: "मोफत प्राथमिक आरोग्यसेवा, औषधे आणि चाचण्या",
      bengali: "বিনামূল্যে প্রাথমিক স্বাস্থ্যসেবা, ওষুধ ও পরীক্ষা",
      gujarati: "મફત પ્રાથમિક આરોગ્ય સેવા, દવાઓ અને પરીક્ષણો",
      punjabi: "ਮੁਫ਼ਤ ਮੁੱਢਲੀ ਸਿਹਤ ਸੇਵਾ, ਦਵਾਈਆਂ ਅਤੇ ਜਾਂਚ",
    },
    howToApply: "Visit your nearest Primary Health Centre (PHC) or Sub-centre. No registration needed.",
    applyUrl: "https://nhm.gov.in",
    color: "#FAECE7",
    borderColor: "#F5C4B3",
  },
  {
    id: 7,
    icon: "🧬",
    category: "welfare",
    name: "Rashtriya Bal Swasthya Karyakram",
    nameLocal: {
      kannada: "ರಾಷ್ಟ್ರೀಯ ಬಾಲ ಸ್ವಾಸ್ಥ್ಯ ಕಾರ್ಯಕ್ರಮ",
      hindi: "राष्ट्रीय बाल स्वास्थ्य कार्यक्रम",
      tamil: "ராஷ்டிரிய பால் ஸ்வஸ்த்ய கார்யக்ரம்",
      telugu: "రాష్ట్రీయ బాల స్వాస్థ్య కార్యక్రమం",
      marathi: "राष्ट्रीय बाल स्वास्थ्य कार्यक्रम",
      bengali: "রাষ্ট্রীয় বাল স্বাস্থ্য কর্মসূচি",
      gujarati: "રાષ્ટ્રીય બાળ સ્વાસ્થ્ય કાર્યક્રમ",
      punjabi: "ਰਾਸ਼ਟਰੀ ਬਾਲ ਸਿਹਤ ਕਾਰਜਕ੍ਰਮ",
    },
    who: "Children from 0 to 18 years",
    whoLocal: {
      kannada: "0ರಿಂದ 18 ವರ್ಷ ವಯಸ್ಸಿನ ಮಕ್ಕಳು",
      hindi: "0 से 18 वर्ष के बच्चे",
      tamil: "0 முதல் 18 வயது குழந்தைகள்",
      telugu: "0 నుండి 18 సంవత్సరాల పిల్లలు",
      marathi: "0 ते 18 वर्षांपर्यंतची मुले",
      bengali: "০ থেকে ১৮ বছরের শিশুরা",
      gujarati: "0થી 18 વર્ષના બાળકો",
      punjabi: "0 ਤੋਂ 18 ਸਾਲ ਦੇ ਬੱਚੇ",
    },
    benefit: "Free health screening and treatment for 30 conditions",
    benefitLocal: {
      kannada: "30 ಸ್ಥಿತಿಗಳಿಗೆ ಉಚಿತ ಆರೋಗ್ಯ ತಪಾಸಣೆ ಮತ್ತು ಚಿಕಿತ್ಸೆ",
      hindi: "30 बीमारियों के लिए मुफ्त स्वास्थ्य जांच और इलाज",
      tamil: "30 நிலைகளுக்கு இலவச சுகாதார பரிசோதனை மற்றும் சிகிச்சை",
      telugu: "30 పరిస్థితులకు ఉచిత ఆరోగ్య పరీక్ష మరియు చికిత్స",
      marathi: "30 आजारांसाठी मोफत आरोग्य तपासणी आणि उपचार",
      bengali: "৩০টি রোগের জন্য বিনামূল্যে স্বাস্থ্য পরীক্ষা ও চিকিৎসা",
      gujarati: "30 રોગો માટે મફત આરોગ્ય તપાસ અને સારવાર",
      punjabi: "30 ਬਿਮਾਰੀਆਂ ਲਈ ਮੁਫ਼ਤ ਸਿਹਤ ਜਾਂਚ ਅਤੇ ਇਲਾਜ",
    },
    howToApply: "Mobile health teams visit schools and anganwadis. Also available at government hospitals.",
    applyUrl: "https://nhm.gov.in/index1.php?lang=1&level=3&sublinkid=1228&lid=678",
    color: "#E6F1FB",
    borderColor: "#B5D4F4",
  },
  {
    id: 8,
    icon: "🩺",
    category: "health",
    name: "Pradhan Mantri National Dialysis Programme",
    nameLocal: {
      kannada: "ಪ್ರಧಾನ ಮంత్రಿ ರಾಷ್ಟ್ರೀಯ ಡಯಾಲಿಸಿಸ್ ಕಾರ್ಯಕ್ರಮ",
      hindi: "प्रधानमंत्री राष्ट्रीय डायलिसिस कार्यक्रम",
      tamil: "பிரதம மந்திரி தேசிய டயாலிசிஸ் திட்டம்",
      telugu: "ప్రధాన మంత్రి జాతీయ డయాలసిస్ కార్యక్రమం",
      marathi: "प्रधानमंत्री राष्ट्रीय डायलिसिस कार्यक्रम",
      bengali: "প্রধানমন্ত্রী জাতীয় ডায়ালিসিস কর্মসূচি",
      gujarati: "પ્રધાનમંત્રી રાષ્ટ્રીય ડાયાલિસિસ કાર્યક્રમ",
      punjabi: "ਪ੍ਰਧਾਨ ਮੰਤਰੀ ਰਾਸ਼ਟਰੀ ਡਾਇਲਸਿਸ ਪ੍ਰੋਗਰਾਮ",
    },
    who: "Poor patients with kidney failure",
    whoLocal: {
      kannada: "ಮೂತ್ರಪಿಂಡ ವೈಫಲ್ಯ ಹೊಂದಿರುವ ಬಡ ರೋಗಿಗಳು",
      hindi: "किडनी फेलियर वाले गरीब मरीज",
      tamil: "சிறுநீரக செயலிழப்பு உள்ள ஏழை நோயாளிகள்",
      telugu: "కిడ్నీ వైఫల్యం ఉన్న పేద రోగులు",
      marathi: "किडनी निकामी असलेले गरीब रुग्ण",
      bengali: "কিডনি ব্যর্থতার সাথে দরিদ্র রোগী",
      gujarati: "કિડની નિષ્ફળતા ધરાવતા ગરીબ દર્દીઓ",
      punjabi: "ਕਿਡਨੀ ਫੇਲ੍ਹ ਹੋਣ ਵਾਲੇ ਗਰੀਬ ਮਰੀਜ਼",
    },
    benefit: "Free dialysis at government hospitals",
    benefitLocal: {
      kannada: "ಸರ್ಕಾರಿ ಆಸ್ಪತ್ರೆಗಳಲ್ಲಿ ಉಚಿತ ಡಯಾಲಿಸಿಸ್",
      hindi: "सरकारी अस्पतालों में मुफ्त डायलिसिस",
      tamil: "அரசு மருத்துவமனைகளில் இலவச டயாலிசிஸ்",
      telugu: "ప్రభుత్వ ఆసుపత్రులలో ఉచిత డయాలసిస్",
      marathi: "सरकारी रुग्णालयांमध्ये मोफत डायलिसिस",
      bengali: "সরকারি হাসপাতালে বিনামূল্যে ডায়ালিসিস",
      gujarati: "સરકારી હોસ્પિટલોમાં મફત ડાયાલিসિસ",
      punjabi: "ਸਰਕਾਰੀ ਹਸਪਤਾਲਾਂ ਵਿੱਚ ਮੁਫ਼ਤ ਡਾਇਲਸਿਸ",
    },
    howToApply: "Visit nearest district hospital with Aadhaar card and BPL certificate.",
    applyUrl: "https://nhm.gov.in",
    color: "#FAEEDA",
    borderColor: "#FAC775",
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
      who: "All Punjab residents",
      whoLocal: { punjabi: "ਪੰਜਾਬ ਦੇ ਸਾਰੇ ਨਿਵਾਸੀ" },
      benefit: "₹5 lakh free treatment per family per year",
      benefitLocal: { punjabi: "ਪਰਿਵਾਰ ਪ੍ਰਤੀ ਸਾਲ ₹5 ਲੱਖ ਮੁਫ਼ਤ ਇਲਾਜ" },
      howToApply: "Visit nearest government hospital or Common Service Centre with Aadhaar.",
      applyUrl: "https://sha.punjab.gov.in",
      color: "#E1F5EE",
      borderColor: "#9FE1CB",
    },
  ],
}

const LANGUAGE_OPTIONS = [
  { value: "english", label: "English" },
  { value: "hindi", label: "हिन्दी" },
  { value: "kannada", label: "ಕನ್ನಡ" },
  { value: "tamil", label: "தமிழ்" },
  { value: "telugu", label: "తెలుగు" },
  { value: "marathi", label: "मराठी" },
  { value: "bengali", label: "বাংলা" },
  { value: "gujarati", label: "ગુજરાતી" },
  { value: "punjabi", label: "ਪੰਜਾਬੀ" },
]

const STATE_OPTIONS = [
  { value: "karnataka", label: "Karnataka" },
  { value: "rajasthan", label: "Rajasthan" },
  { value: "tamilNadu", label: "Tamil Nadu" },
  { value: "andhraPradesh", label: "Andhra Pradesh" },
  { value: "maharashtra", label: "Maharashtra" },
  { value: "westBengal", label: "West Bengal" },
  { value: "gujarat", label: "Gujarat" },
  { value: "punjab", label: "Punjab" },
]

const categoryLabels = {
  kannada: { all: "ಎಲ್ಲಾ", health: "ಆರೋಗ್ಯ", insurance: "ವಿಮೆ", womenChild: "ಮಹಿಳಾ ಮತ್ತು ಮಕ್ಕಳ", welfare: "ಕಲ್ಯಾಣ" },
  hindi: { all: "सभी", health: "स्वास्थ्य", insurance: "बीमा", womenChild: "महिला एवं बाल", welfare: "कल्याण" },
  tamil: { all: "அனைத்து", health: "ஆரோக்கியம்", insurance: "விமா", womenChild: "பெண்கள் மற்றும் குழந்தைகள்", welfare: "நலன்" },
  telugu: { all: "అన్ని", health: "ఆరోగ్యం", insurance: "బీమా", womenChild: "మహిళలు & పిల్లలు", welfare: "సంక్షేమం" },
  marathi: { all: "सर्व", health: "आरोग्य", insurance: "विमा", womenChild: "महिला आणि बाल", welfare: "कल्याण" },
  bengali: { all: "সব", health: "স্বাস্থ্য", insurance: "বীমা", womenChild: "নারী ও শিশু", welfare: "কল্যাণ" },
  gujarati: { all: "બધું", health: "આરોગ્ય", insurance: "વીમા", womenChild: "સ્ત્રી અને બાળક", welfare: "કલ્યાણ" },
  punjabi: { all: "ਸਭ", health: "ਸਿਹਤ", insurance: "ਬੀਮਾ", womenChild: "ਔਰਤ & ਬੱਚਾ", welfare: "ਭਲਾਈ" },
  english: { all: "All", health: "Health", insurance: "Insurance", womenChild: "Women & Child", welfare: "Welfare" },
}

const stateNames = {
  kannada: { karnataka: "ಕರ್ನಾಟಕ", rajasthan: "ರಾಜಸ್ಥಾನ್", tamilNadu: "தமிழ்நாடு", andhraPradesh: "ఆంధ్రప్రదేశ్", maharashtra: "ಮಹಾರಾಷ್ಟ್ರ", westBengal: "ಪಶ್ಚಿಮ ಬಂಗಾಳ", gujarat: "ગુજરાત", punjab: "ਪੰਜਾਬ" },
  hindi: { karnataka: "कर्नाटक", rajasthan: "राजस्थान", tamilNadu: "तमिलनाडु", andhraPradesh: "आंध्र प्रदेश", maharashtra: "महाराष्ट्र", westBengal: "पश्चिम बंगाल", gujarat: "गुजरात", punjab: "पंजाब" },
  tamil: { karnataka: "கர்நாடகம்", rajasthan: "ராஜஸ்தான்", tamilNadu: "தமிழ்நாடு", andhraPradesh: "ஆంధ్రப் பிரதேசம்", maharashtra: "மகாராஷ்டிரா", westBengal: "மேற்கு வங்காளம்", gujarat: "குஜராத்", punjab: "பஞ்சாப்" },
  telugu: { karnataka: "కర్ణాటక", rajasthan: "రాజస్థాన్", tamilNadu: "తమిళనాడు", andhraPradesh: "ఆంధ్రప్రదేశ్", maharashtra: "మహారాష్ట్ర", westBengal: "పశ్చిమ బంగాల్", gujarat: "గుజరాత్", punjab: "పంజాబ్" },
  marathi: { karnataka: "कर्नाटक", rajasthan: "राजस्थान", tamilNadu: "तमिळनाडु", andhraPradesh: "आंध्र प्रदेश", maharashtra: "महाराष्ट्र", westBengal: "पश्चिम बंगाल", gujarat: "गुजरात", punjab: "पंजाब" },
  bengali: { karnataka: "কর্নাটক", rajasthan: "রাজস্থান", tamilNadu: "তামিলনাড়ু", andhraPradesh: "আন্ধ্র প্রদেশ", maharashtra: "মহারাষ্ট্র", westBengal: "পশ্চিমবঙ্গ", gujarat: "গুজরাট", punjab: "পাঞ্জাব" },
  gujarati: { karnataka: "કર્ણાટક", rajasthan: "રાજસ્થાન", tamilNadu: "તમિલનાડુ", andhraPradesh: "આંધ્ર પ્રદેશ", maharashtra: "મહારાષ્ટ્ર", westBengal: "પશ્ચિમ બંગાળ", gujarat: "ગુજરાત", punjab: "પંજાબ" },
  punjabi: { karnataka: "ਕਰਨਾਟਕ", rajasthan: "ਰਾਜਸਥਾਨ", tamilNadu: "ਤਮਿਲਨਾਡੁ", andhraPradesh: "આંધ્રા ਪ੍ਰਦੇશ", maharashtra: "મહારાષ્ટ્ર", westBengal: "પશ્ચિમ બંગાળ", gujarat: "ગુજરાત", punjab: "પંજાબ" },
  english: { karnataka: "Karnataka", rajasthan: "Rajasthan", tamilNadu: "Tamil Nadu", andhraPradesh: "Andhra Pradesh", maharashtra: "Maharashtra", westBengal: "West Bengal", gujarat: "Gujarat", punjab: "Punjab" },
}

const pageText = {
  english: { brand: "SahayAI", subtitle: "Access central and state benefits in your preferred language.", sectionIntro: "Explore verified government schemes for health, insurance, women, and welfare.", languageLabel: "Language", stateLabel: "State", categoryLabel: "Category", centralTab: "Central Schemes", stateTab: "State Schemes", noStateSchemes: "No state-specific schemes found for this state.", noMatches: "No schemes match this filter. Try another category.", footerHelp: "Help", footerFaq: "FAQs", footerResources: "Official Resources", footerText: "Trusted government scheme information for all citizens.", eligibilityLabel: "Eligibility", benefitsLabel: "Key Benefits", detailsLabel: "Scheme Details", applyNow: "Apply Now →", readAloud: "🔊 Read", brandDesc: "Government scheme portal for inclusive access." },
  hindi: { brand: "SahayAI", subtitle: "अपनी पसंदीदा भाषा में केंद्र और राज्य योजनाओं तक पहुंचें।", sectionIntro: "स्वास्थ्य, बीमा, महिला और कल्याण योजनाओं के लिए सत्यापित जानकारी देखें।", languageLabel: "भाषा", stateLabel: "राज्य", categoryLabel: "श्रेणी", centralTab: "केंद्रीय योजनाएं", stateTab: "राज्य योजनाएं", noStateSchemes: "इस राज्य के लिए कोई राज्य-विशिष्ट योजनाएं नहीं मिलीं।", noMatches: "कोई योजना फ़िल्टर से मेल नहीं खाती। दूसरी श्रेणी आज़माएँ।", footerHelp: "मदद", footerFaq: "अक्सर पूछे जाने वाले प्रश्न", footerResources: "अधिकारिक संसाधन", footerText: "सभी नागरिकों के लिए विश्वसनीय सरकारी योजना जानकारी।", eligibilityLabel: "पात्रता", benefitsLabel: "मुख्य लाभ", detailsLabel: "योजना विवरण", applyNow: "अर्ज करें →", readAloud: "🔊 पढ़ें", brandDesc: "समावेशी पहुंच के लिए सरकारी योजना पोर्टल।" },
  kannada: { brand: "SahayAI", subtitle: "ನಿಮ್ಮ ಇಚ್ಛಿತ ಭಾಷೆಯಲ್ಲಿ ಕೇಂದ್ರ ಮತ್ತು ರಾಜ್ಯ ಯೋಜನೆಗಳಿಗೆ ಪ್ರವೇಶಿಸಿ.", sectionIntro: "ಆರೋಗ್ಯ, ವಿಮೆ, ಮಹಿಳಾ ಮತ್ತು ಕಲ್ಯಾಣ ಯೋಜನೆಗಳ ಪರಿಶೋಧಿತ ಮಾಹಿತಿ ಪರಿಶೀಲಿಸಿ.", languageLabel: "ಭಾಷೆ", stateLabel: "ರಾಜ್ಯ", categoryLabel: "ವರ್ಗ", centralTab: "ಕೇಂದ್ರ ಯೋಜನೆಗಳು", stateTab: "ರಾಜ್ಯ ಯೋಜನೆಗಳು", noStateSchemes: "ಈ ರಾಜ್ಯಕ್ಕೆ ರಾಜ್ಯ-ನಿರ್ದಿಷ್ಟ ಯೋಜನೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ.", noMatches: "ಯಾವುದೇ ಯೋಜನೆ ಈ ಶ್ರೇಣಿಗೆ ಹೊಂದಿಕೆಯಾಗಲಿಲ್ಲ. ಬೇರೆ ಶ್ರೇಣಿಯನ್ನು ಪ್ರಯತ್ನಿಸಿ.", footerHelp: "ಸಹಾಯ", footerFaq: "ಅक्सर ಕೇಳುವ ಪ್ರಶ್ನೆಗಳು", footerResources: "ಅಧಿಕೃತ ಸಂಪನ್ಮೂಲಗಳು", footerText: "ಎಲ್ಲಾ ನಾಗರಿಕರಿಗೂ ವಿಶ್ವಾಸಾರ್ಹ ಸರಕಾರಿ ಯೋಜನೆ ಮಾಹಿತಿ.", eligibilityLabel: "ಅರ್ಹತೆ", benefitsLabel: "ಮುಖ್ಯ ಪ್ರಯೋಜನಗಳು", detailsLabel: "ಯೋಜನೆ ವಿವರಗಳು", applyNow: "ಅರ್ಜಿಸು →", readAloud: "🔊 ಓದಿ", brandDesc: "ಸಮಾವೇಶಿ ಪ್ರವೇಶಕ್ಕಾಗಿ ಸರ್ಕಾರ ಯೋಜನೆ ಪೋರ್ಟ್‌ಲ್." },
  tamil: { brand: "SahayAI", subtitle: "உங்கள் விருப்ப மொழியில் மத்திய மற்றும் மாநில திட்டங்களை அணுகவும்.", sectionIntro: "ஆரோக்கியம், காப்பீடு, பெண்கள் மற்றும் நல திட்டங்களுக்கு சரிபார்க்கப்பட்ட தகவலை ஆராயவும்.", languageLabel: "மொழி", stateLabel: "மாநிலம்", categoryLabel: "வகை", centralTab: "மத்திய திட்டங்கள்", stateTab: "மாநில திட்டங்கள்", noStateSchemes: "இந்த மாநிலத்திற்கு மாநில-குறிப்பிட்ட திட்டங்கள் இல்லை.", noMatches: "இந்த வடிகட்டியுடன் எந்த திட்டமும் பொருந்தவில்லை. வேறு வகையை முயற்சிக்கவும்.", footerHelp: "உதவி", footerFaq: "அடிக்கடி கேட்கப்படும் கேள்விகள்", footerResources: "அதிகாரப்பூர்வ வளங்கள்", footerText: "எல்லா குடிமக்களுக்கும் நம்பகமான அரசு திட்ட தகவல்.", eligibilityLabel: "தகுதி", benefitsLabel: "முக்கிய நன்மைகள்", detailsLabel: "திட்ட விவரங்கள்", applyNow: "விண்ணப்பிக்கவும் →", readAloud: "🔊 படி", brandDesc: "முழுமையான அணுகலுக்கு அரசு திட்ட போர்ட்டல்." },
  telugu: { brand: "SahayAI", subtitle: "మీ ఇష్ట భాషలో కేంద్ర మరియు రాష్ట్ర ప్రయోజనాలను పొందండి.", sectionIntro: "ఆరోగ్య, బీమా, మహిళలు మరియు సంక్షేమ పథకాలకు ధృవీకరించబడిన సమాచారం అన్వేషించండి.", languageLabel: "భాష", stateLabel: "రాష్ట్రం", categoryLabel: "వర్గం", centralTab: "కేంద్ర పథకాలు", stateTab: "రాష్ట్ర పథకాలు", noStateSchemes: "ఈ రాష్ట్రానికి రాష్ట్ర-ప్రత్యేక పథకాలు లేవు.", noMatches: "ఈ ఫిల్టర్‌కు సరిపోలే పథకాలు లేవు. మరొక వర్గాన్ని ప్రయత్నించండి.", footerHelp: "సహాయం", footerFaq: "ప్రశ్నల సమాధానాలు", footerResources: "అధికారిక వనరులు", footerText: "అన్ని పౌరులకు నమ్మదగిన ప్రభుత్వ పథక సమాచారం.", eligibilityLabel: "అర్హత", benefitsLabel: "ప్రధాన ప్రయోజనాలు", detailsLabel: "పథకం వివరాలు", applyNow: "దరఖాస్తు చేయండి →", readAloud: "🔊 చదవండి", brandDesc: "సమానమైన ప్రాప్తికి ప్రభుత్వ పథకం పోర్టల్." },
  marathi: { brand: "SahayAI", subtitle: "आपल्या आवडत्या भाषेत केंद्र आणि राज्य योजना मिळवा.", sectionIntro: "आरोग्य, विमा, महिला आणि कल्याण योजनांसाठी प्रमाणित माहिती तपासा.", languageLabel: "भाषा", stateLabel: "राज्य", categoryLabel: "श्रेणी", centralTab: "केंद्रीय योजना", stateTab: "राज्य योजना", noStateSchemes: "या राज्यासाठी राज्य-विशिष्ट योजना आढळल्या नाहीत.", noMatches: "या फिल्टरला कोणतीही योजना जुळली नाही. दुसरी श्रेणी वापरून पहा.", footerHelp: "मदत", footerFaq: "वारंवार विचारले जाणारे प्रश्न", footerResources: "अधिकृत स्रोत", footerText: "सर्व नागरिकांसाठी विश्वासार्ह सरकारी योजना माहिती.", eligibilityLabel: "पात्रता", benefitsLabel: "मुख्य फायदे", detailsLabel: "योजना तपशील", applyNow: "अर्ज करा →", readAloud: "🔊 वाचा", brandDesc: "समावेशक प्रवेशासाठी सरकारी योजना पोर्टल." },
  bengali: { brand: "SahayAI", subtitle: "আপনার পছন্দের ভাষায় কেন্দ্রীয় ও রাজ্য প্রকল্পগুলি অ্যাক্সেস করুন।", sectionIntro: "স্বাস্থ্য, বীমা, মহিলা ও কল্যাণ প্রকল্পের সত্যাপিত তথ্য অন্বেষণ করুন।", languageLabel: "ভাষা", stateLabel: "রাজ্য", categoryLabel: "বিভাগ", centralTab: "কেন্দ্রীয় প্রকল্প", stateTab: "রাজ্য প্রকল্প", noStateSchemes: "এই রাজ্যের জন্য রাজ্য-নির্দিষ্ট প্রকল্প পাওয়া যায় নি।", noMatches: "এই ফিল্টারটি কোনও প্রকল্প মেলে না। অন্য বিভাগ চেষ্টা করুন।", footerHelp: "সাহায্য", footerFaq: "প্রায়শই জিজ্ঞাসিত প্রশ্ন", footerResources: "অফিসিয়াল রিসোর্স", footerText: "সমস্ত নাগরিকের জন্য নির্ভরযোগ্য সরকারি প্রকল্প তথ্য।", eligibilityLabel: "যোগ্যতা", benefitsLabel: "মূল সুবিধা", detailsLabel: "প্রকল্পের বিবরণ", applyNow: "আবেদন করুন →", readAloud: "🔊 পড়ুন", brandDesc: "সমন্বিত প্রবেশাধিকারের জন্য সরকারি প্রকল্প পোর্টাল।" },
  gujarati: { brand: "SahayAI", subtitle: "તમારી પસંદીદા ભાષામાં કેન્દ્ર અને રાજ્ય યોજનાઓ સુધી પહોંચો.", sectionIntro: "આરોગ્ય, વીમા, મહિલાઓ અને કલ્યાણ યોજનાઓ માટે પ્રમાણિત માહિતી તપાસો.", languageLabel: "ભાષા", stateLabel: "રાજ્ય", categoryLabel: "શ્રેણી", centralTab: "કેન્દ્રિય યોજનાઓ", stateTab: "રાજ્ય યોજનાઓ", noStateSchemes: "આ રાજ્ય માટે રાજ્ય-ખાસ યોજનાઓ મળેલ નથી.", noMatches: "આ ફિલ્ટર માટે કોઈ યોજના મળેલ નહિ. બીજી શ્રેણી અજમાવો.", footerHelp: "મદદ", footerFaq: "વારંવાર પુછીાતા પ્રશ્નો", footerResources: "અધિકૃત સ્ત્રોતો", footerText: "બધા નાગરિકો માટે વિશ્વસનીય સરકારી યોજના માહિતી.", eligibilityLabel: "પಾತ್ರતા", benefitsLabel: "મુખ્ય લાભ", detailsLabel: "યોજનાનું વિગતો", applyNow: "અરજી કરો →", readAloud: "🔊 વાંચો", brandDesc: "સમગ્ર પ્રવેશ માટે સરકારી યોજના પોર્ટલ." },
  punjabi: { brand: "SahayAI", subtitle: "ਆਪਣੀ ਮਨਪਸੰਦ ਭਾਸ਼ਾ ਵਿੱਚ ਕੇਂਦਰੀ ਅਤੇ ਰਾਜੀ ਯੋਜਨਾਵਾਂ ਤੱਕ ਪਹੁੰਚ ਕਰੋ.", sectionIntro: "ਸਿਹਤ, ਬੀਮਾ, ਮਹਿਲਾ ਅਤੇ ਭਲਾਈ ਯੋਜਨਾਵਾਂ ਲਈ ਪ੍ਰਮਾਣਿਤ ਜਾਣਕਾਰੀ ਖੋਜੋ.", languageLabel: "ਭਾਸ਼ਾ", stateLabel: "ਰਾਜ", categoryLabel: "ਵਰਗ", centralTab: "ਕੇਂਦਰੀ ਯੋਜਨਾਵਾਂ", stateTab: "ਰਾਜ ਯੋਜਨਾਵਾਂ", noStateSchemes: "ਇਸ ਰਾਜ ਲਈ ਕੋਈ ਰਾਜ-ਖਾਸ ਯੋਜਨਾ ਨਹੀਂ ਮਿਲੀ।", noMatches: "ਇਸ ਫਿਲਟਰ ਲਈ ਕੋਈ ਯੋਜਨਾ ਮੇਲ ਨਹੀਂ ਖਾਂਦੀ। ਹੋਰ ਵਰਗ ਦੀ ਕੋਸ਼ਿਸ਼ ਕਰੋ.", footerHelp: "ਸਹਾਇਤਾ", footerFaq: "ਅਕਸਰ ਪੁੱਛੇ ਜਾਣ ਵਾਲੇ ਪ੍ਰਸ਼ਨ", footerResources: "ਅਧਿਕਾਰਿਕ ਸਰੋਤ", footerText: "ਸਭ ਨਾਗਰਿਕਾਂ ਲਈ ਭਰੋਸੇਯੋਗ ਸਰਕਾਰੀ ਯੋਜਨਾ ਜਾਣਕਾਰੀ।", eligibilityLabel: "ਪਾਤਰਤਾ", benefitsLabel: "ਮੁੱਖ ਲਾਭ", detailsLabel: "ਯੋਜਨਾ ਵੇਰਵਾ", applyNow: "ਅਰਜ਼ੀ ਕਰੋ →", readAloud: "🔊 ਪੜ੍ਹੋ", brandDesc: "ਸਮਾਨ ਅਕਸੇਸ ਲਈ ਸਰਕਾਰੀ ਯੋਜਨਾ ਪੋਰਟਲ." },
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

  const backLabel = language === "hindi" ? "पीछे" : language === "kannada" ? "ಹಿಂದೆ" : language === "tamil" ? "பின்னால்" : language === "telugu" ? "తిరిగి" : language === "marathi" ? "मागे" : language === "bengali" ? "পিছনে" : language === "gujarati" ? "પાછળ" : language === "punjabi" ? "ਪੀਛੇ" : "Back"

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
