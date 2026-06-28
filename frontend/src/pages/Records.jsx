import { useState, useEffect, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { speakText, unlockVoice } from "../voiceHelper"

const recordTranslations = {
  kannada: {
    prescriptions: "ಔಷಧಿ ಚೀಟಿಗಳು",
    myDocuments: "ನನ್ನ ದಾಖಲೆಗಳು",
    upload: "ಅಪ್ಲೋಡ್ ಮಾಡಿ",
    noPrescriptions: "ಇನ್ನೂ ಔಷಧಿ ಚೀಟಿಗಳಿಲ್ಲ",
    scanFirst: "ಮೊದಲ ದಾಖಲೆ ಸೇರಿಸಲು ಔಷಧಿ ಚೀಟಿ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ",
    scanBtn: "ಔಷಧಿ ಚೀಟಿ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ",
    readAloud: "ಜೋರಾಗಿ ಓದಿ",
    noDocuments: "ಇನ್ನೂ ದಾಖಲೆಗಳಿಲ್ಲ",
    uploadFirst: "ಲ್ಯಾಬ್ ರಿಪೋರ್ಟ್, ಎಕ್ಸ್-ರೇ ಅಪ್ಲೋಡ್ ಮಾಡಿ",
    uploadBtn: "ದಾಖಲೆ ಅಪ್ಲೋಡ್ ಮಾಡಿ",
    uploadTitle: "ವೈದ್ಯಕೀಯ ದಾಖಲೆ ಅಪ್ಲೋಡ್ ಮಾಡಿ",
    titleLabel: "ದಾಖಲೆಯ ಹೆಸರು",
    titlePlaceholder: "ಉದಾ: ರಕ್ತ ಪರೀಕ್ಷೆ - ಜನವರಿ 2025",
    typeLabel: "ದಾಖಲೆಯ ವಿಧ",
    descLabel: "ವಿವರಣೆ (ಐಚ್ಛಿಕ)",
    descPlaceholder: "ಈ ದಾಖಲೆಯ ಬಗ್ಗೆ ಟಿಪ್ಪಣಿ ಸೇರಿಸಿ...",
    fileLabel: "ಫೈಲ್ ಆಯ್ಕೆ ಮಾಡಿ",
    uploading: "ಅಪ್ಲೋಡ್ ಆಗುತ್ತಿದೆ...",
    uploadSuccess: "ದಾಖಲೆ ಯಶಸ್ವಿಯಾಗಿ ಅಪ್ಲೋಡ್ ಆಯಿತು!",
    back: "← ಹಿಂದೆ",
    medicines: "ಔಷಧಿಗಳು ಸೂಚಿಸಲಾಗಿದೆ",
    loading: "ನಿಮ್ಮ ದಾಖಲೆಗಳನ್ನು ತರುತ್ತಿದ್ದೇನೆ...",
    voiceTab1: "ಔಷಧಿ ಚೀಟಿಗಳನ್ನು ತೋರಿಸುತ್ತಿದ್ದೇನೆ",
    voiceTab2: "ನಿಮ್ಮ ದಾಖಲೆಗಳನ್ನು ತೋರಿಸುತ್ತಿದ್ದೇನೆ",
    voiceTab3: "ಹೊಸ ದಾಖಲೆ ಅಪ್ಲೋಡ್ ಮಾಡಲು ಇಲ್ಲಿ ಒತ್ತಿ",
    voiceRead: "ಔಷಧಿಗಳ ವಿವರ:",
    voiceScan: "ಔಷಧಿ ಚೀಟಿ ಸ್ಕ್ಯಾನ್ ಮಾಡಲು ಹೋಗುತ್ತಿದ್ದೇನೆ",
    voiceUpload: "ದಾಖಲೆ ಅಪ್ಲೋಡ್ ಮಾಡಲು ಹೋಗುತ್ತಿದ್ದೇನೆ",
    voiceBack: "ಹಿಂದಿನ ಪುಟಕ್ಕೆ ಹೋಗುತ್ತಿದ್ದೇನೆ",
    fillTitle: "ದಯವಿಟ್ಟು ದಾಖಲೆಯ ಹೆಸರು ಮತ್ತು ಫೈಲ್ ಆಯ್ಕೆ ಮಾಡಿ",
  },
  hindi: {
    prescriptions: "पर्चे",
    myDocuments: "मेरे दस्तावेज़",
    upload: "अपलोड करें",
    noPrescriptions: "अभी कोई पर्चा नहीं",
    scanFirst: "पहला रिकॉर्ड जोड़ने के लिए पर्चा स्कैन करें",
    scanBtn: "पर्चा स्कैन करें",
    readAloud: "ज़ोर से पढ़ें",
    noDocuments: "अभी कोई दस्तावेज़ नहीं",
    uploadFirst: "लैब रिपोर्ट, एक्स-रे अपलोड करें",
    uploadBtn: "दस्तावेज़ अपलोड करें",
    uploadTitle: "मेडिकल दस्तावेज़ अपलोड करें",
    titleLabel: "दस्तावेज़ का नाम",
    titlePlaceholder: "जैसे: रक्त परीक्षण - जनवरी 2025",
    typeLabel: "दस्तावेज़ का प्रकार",
    descLabel: "विवरण (वैकल्पिक)",
    descPlaceholder: "इस दस्तावेज़ के बारे में नोट जोड़ें...",
    fileLabel: "फ़ाइल चुनें",
    uploading: "अपलोड हो रहा है...",
    uploadSuccess: "दस्तावेज़ सफलतापूर्वक अपलोड हुआ!",
    back: "← वापस",
    medicines: "दवाइयां सुझाई गई",
    loading: "आपके रिकॉर्ड लोड हो रहे हैं...",
    voiceTab1: "पर्चे दिखा रहा हूं",
    voiceTab2: "आपके दस्तावेज़ दिखा रहा हूं",
    voiceTab3: "नया दस्तावेज़ अपलोड करने के लिए यहां दबाएं",
    voiceRead: "दवाइयों का विवरण:",
    voiceScan: "पर्चा स्कैन करने जा रहा हूं",
    voiceUpload: "दस्तावेज़ अपलोड करने जा रहा हूं",
    voiceBack: "पिछले पेज पर जा रहा हूं",
    fillTitle: "कृपया दस्तावेज़ का नाम और फ़ाइल चुनें",
  },
  tamil: {
    prescriptions: "மருந்து சீட்டுகள்",
    myDocuments: "என் ஆவணங்கள்",
    upload: "பதிவேற்றம்",
    noPrescriptions: "இன்னும் மருந்து சீட்டுகள் இல்லை",
    scanFirst: "முதல் பதிவை சேர்க்க மருந்து சீட்டை ஸ்கேன் செய்யுங்கள்",
    scanBtn: "மருந்து சீட்டை ஸ்கேன் செய்யுங்கள்",
    readAloud: "சத்தமாக படியுங்கள்",
    noDocuments: "இன்னும் ஆவணங்கள் இல்லை",
    uploadFirst: "ஆய்வக அறிக்கைகள், எக்ஸ்-கதிர்கள் பதிவேற்றுங்கள்",
    uploadBtn: "ஆவணத்தை பதிவேற்றுங்கள்",
    uploadTitle: "மருத்துவ ஆவணத்தை பதிவேற்றுங்கள்",
    titleLabel: "ஆவண தலைப்பு",
    titlePlaceholder: "எ.கா: இரத்த பரிசோதனை - ஜனவரி 2025",
    typeLabel: "ஆவண வகை",
    descLabel: "விளக்கம் (விருப்பம்)",
    descPlaceholder: "இந்த ஆவணத்தைப் பற்றி குறிப்புகள் சேர்க்கவும்...",
    fileLabel: "கோப்பை தேர்ந்தெடுக்கவும்",
    uploading: "பதிவேற்றம் ஆகிறது...",
    uploadSuccess: "ஆவணம் வெற்றிகரமாக பதிவேற்றப்பட்டது!",
    back: "← பின்னால்",
    medicines: "மருந்துகள் பரிந்துரைக்கப்பட்டன",
    loading: "உங்கள் பதிவுகளை ஏற்றுகிறேன்...",
    voiceTab1: "உங்கள் மருந்து சீட்டுகளை காட்டுகிறேன்",
    voiceTab2: "உங்கள் ஆவணங்களை காட்டுகிறேன்",
    voiceTab3: "புதிய ஆவணத்தை பதிவேற்ற இங்கே அழுத்துங்கள்",
    voiceRead: "மருந்துகளின் விவரம்:",
    voiceScan: "மருந்து சீட்டை ஸ்கேன் செய்ய போகிறேன்",
    voiceUpload: "ஆவணத்தை பதிவேற்ற போகிறேன்",
    voiceBack: "முந்தைய பக்கத்திற்கு போகிறேன்",
    fillTitle: "தயவுசெய்து ஆவண தலைப்பு மற்றும் கோப்பை தேர்ந்தெடுக்கவும்",
  },
  telugu: {
    prescriptions: "మందుల చీటీలు",
    myDocuments: "నా పత్రాలు",
    upload: "అప్లోడ్ చేయండి",
    noPrescriptions: "ఇంకా మందుల చీటీలు లేవు",
    scanFirst: "మొదటి రికార్డు జోడించడానికి మందుల చీటీని స్కాన్ చేయండి",
    scanBtn: "మందుల చీటీని స్కాన్ చేయండి",
    readAloud: "బిగ్గరగా చదవండి",
    noDocuments: "ఇంకా పత్రాలు అప్లోడ్ చేయలేదు",
    uploadFirst: "లాబ్ రిపోర్టులు, ఎక్స్-రేలు అప్లోడ్ చేయండి",
    uploadBtn: "పత్రం అప్లోడ్ చేయండి",
    uploadTitle: "వైద్య పత్రం అప్లోడ్ చేయండి",
    titleLabel: "పత్రం పేరు",
    titlePlaceholder: "ఉదా: రక్త పరీక్ష - జనవరి 2025",
    typeLabel: "పత్రం రకం",
    descLabel: "వివరణ (ఐచ్ఛికం)",
    descPlaceholder: "ఈ పత్రం గురించి గమనికలు జోడించండి...",
    fileLabel: "ఫైల్ ఎంచుకోండి",
    uploading: "అప్లోడ్ అవుతోంది...",
    uploadSuccess: "పత్రం విజయవంతంగా అప్లోడ్ అయింది!",
    back: "← వెనక్కి",
    medicines: "మందులు సూచించబడ్డాయి",
    loading: "మీ రికార్డులు లోడ్ అవుతున్నాయి...",
    voiceTab1: "మీ మందుల చీటీలు చూపిస్తున్నాను",
    voiceTab2: "మీ పత్రాలు చూపిస్తున్నాను",
    voiceTab3: "కొత్త పత్రం అప్లోడ్ చేయడానికి ఇక్కడ నొక్కండి",
    voiceRead: "మందుల వివరాలు:",
    voiceScan: "మందుల చీటీని స్కాన్ చేయడానికి వెళ్తున్నాను",
    voiceUpload: "పత్రం అప్లోడ్ చేయడానికి వెళ్తున్నాను",
    voiceBack: "మునుపటి పేజీకి వెళ్తున్నాను",
    fillTitle: "దయచేసి పత్రం పేరు మరియు ఫైల్ ఎంచుకోండి",
  },
  marathi: {
    prescriptions: "प्रिस्क्रिप्शन",
    myDocuments: "माझे कागदपत्रे",
    upload: "अपलोड करा",
    noPrescriptions: "अजून कोणतेही प्रिस्क्रिप्शन नाही",
    scanFirst: "पहिली नोंद जोडण्यासाठी प्रिस्क्रिप्शन स्कॅन करा",
    scanBtn: "प्रिस्क्रिप्शन स्कॅन करा",
    readAloud: "मोठ्याने वाचा",
    noDocuments: "अजून कोणतेही दस्तऐवज नाही",
    uploadFirst: "लॅब रिपोर्ट, एक्स-रे अपलोड करा",
    uploadBtn: "दस्तऐवज अपलोड करा",
    uploadTitle: "वैद्यकीय दस्तऐवज अपलोड करा",
    titleLabel: "दस्तऐवजाचे नाव",
    titlePlaceholder: "उदा: रक्त तपासणी - जानेवारी 2025",
    typeLabel: "दस्तऐवजाचा प्रकार",
    descLabel: "वर्णन (पर्यायी)",
    descPlaceholder: "या दस्तऐवजाबद्दल नोट्स जोडा...",
    fileLabel: "फाइल निवडा",
    uploading: "अपलोड होत आहे...",
    uploadSuccess: "दस्तऐवज यशस्वीरित्या अपलोड झाला!",
    back: "← मागे",
    medicines: "औषधे सुचवली",
    loading: "तुमचे रेकॉर्ड लोड होत आहेत...",
    voiceTab1: "तुमचे प्रिस्क्रिप्शन दाखवत आहे",
    voiceTab2: "तुमचे कागदपत्रे दाखवत आहे",
    voiceTab3: "नवीन कागदपत्र अपलोड करण्यासाठी येथे दाबा",
    voiceRead: "औषधांचा तपशील:",
    voiceScan: "प्रिस्क्रिप्शन स्कॅन करण्यासाठी जात आहे",
    voiceUpload: "दस्तऐवज अपलोड करण्यासाठी जात आहे",
    voiceBack: "मागील पृष्ठावर जात आहे",
    fillTitle: "कृपया दस्तऐवजाचे नाव आणि फाइल निवडा",
  },
  bengali: {
    prescriptions: "প্রেসক্রিপশন",
    myDocuments: "আমার নথিপত্র",
    upload: "আপলোড করুন",
    noPrescriptions: "এখনও কোনো প্রেসক্রিপশন নেই",
    scanFirst: "প্রথম রেকর্ড যোগ করতে প্রেসক্রিপশন স্ক্যান করুন",
    scanBtn: "প্রেসক্রিপশন স্ক্যান করুন",
    readAloud: "জোরে পড়ুন",
    noDocuments: "এখনও কোনো নথি আপলোড হয়নি",
    uploadFirst: "ল্যাব রিপোর্ট, এক্স-রে আপলোড করুন",
    uploadBtn: "নথি আপলোড করুন",
    uploadTitle: "চিকিৎসা নথি আপলোড করুন",
    titleLabel: "নথির শিরোনাম",
    titlePlaceholder: "যেমন: রক্ত পরীক্ষা - জানুয়ারি 2025",
    typeLabel: "নথির ধরন",
    descLabel: "বিবরণ (ঐচ্ছিক)",
    descPlaceholder: "এই নথি সম্পর্কে নোট যোগ করুন...",
    fileLabel: "ফাইল নির্বাচন করুন",
    uploading: "আপলোড হচ্ছে...",
    uploadSuccess: "নথি সফলভাবে আপলোড হয়েছে!",
    back: "← পিছনে",
    medicines: "ওষুধ নির্ধারিত হয়েছে",
    loading: "আপনার রেকর্ড লোড হচ্ছে...",
    voiceTab1: "আপনার প্রেসক্রিপশন দেখাচ্ছি",
    voiceTab2: "আপনার নথি দেখাচ্ছি",
    voiceTab3: "নতুন নথি আপলোড করতে এখানে চাপুন",
    voiceRead: "ওষুধের বিবরণ:",
    voiceScan: "প্রেসক্রিপশন স্ক্যান করতে যাচ্ছি",
    voiceUpload: "নথি আপলোড করতে যাচ্ছি",
    voiceBack: "আগের পাতায় ফিরে যাচ্ছি",
    fillTitle: "অনুগ্রহ করে নথির শিরোনাম এবং ফাইল নির্বাচন করুন",
  },
  gujarati: {
    prescriptions: "પ્રિસ્ક્રિપ્શન",
    myDocuments: "મારા દસ્તાવેજો",
    upload: "અપલોડ કરો",
    noPrescriptions: "હજી કોઈ પ્રિસ્ક્રિપ્શન નથી",
    scanFirst: "પ્રથમ રેકોર્ડ ઉમેરવા પ્રિસ્ક્રિપ્શન સ્કેન કરો",
    scanBtn: "પ્રિસ્ક્રિપ્શન સ્કેન કરો",
    readAloud: "મોટેથી વાંચો",
    noDocuments: "હજી કોઈ દસ્તાવેજ નથી",
    uploadFirst: "લેબ રિપોર્ટ, એક્સ-રે અપલોડ કરો",
    uploadBtn: "દસ્તાવેજ અપલોડ કરો",
    uploadTitle: "તબીબી દસ્તાવેજ અપલોડ કરો",
    titleLabel: "દસ્તાવેજ શીર્ષક",
    titlePlaceholder: "દા.ત. રક્ત પરીક્ષણ - જાન્યુઆરી 2025",
    typeLabel: "દસ્તાવેજ પ્રકાર",
    descLabel: "વર્ણન (વૈકલ્પિક)",
    descPlaceholder: "આ દસ્તાવેજ વિશે નોંધ ઉમેરો...",
    fileLabel: "ફાઇલ પસંદ કરો",
    uploading: "અપલોડ થઈ રહ્યું છે...",
    uploadSuccess: "દસ્તાવેજ સફળતાપૂર્વક અપલોડ થયો!",
    back: "← પાછળ",
    medicines: "દવાઓ સૂચવવામાં આવી",
    loading: "તમારા રેકોર્ડ લોડ થઈ રહ્યા છે...",
    voiceTab1: "તમારા પ્રિસ્ક્રિપ્શન બતાવી રહ્યો છું",
    voiceTab2: "તમારા દસ્તાવેજો બતાવી રહ્યો છું",
    voiceTab3: "નવો દસ્તાવેજ અપલોડ કરવા અહીં દબાવો",
    voiceRead: "દવાઓની વિગત:",
    voiceScan: "પ્રિસ્ક્રિપ્શન સ્કેન કરવા જઈ રહ્યો છું",
    voiceUpload: "દસ્તાવેજ અપલોડ કરવા જઈ રહ્યો છું",
    voiceBack: "પાછલા પૃષ્ઠ પર જઈ રહ્યો છું",
    fillTitle: "કૃપા કરીને દસ્તાવેજ શીર્ષક અને ફાઇલ પસંદ કરો",
  },
  punjabi: {
    prescriptions: "ਨੁਸਖੇ",
    myDocuments: "ਮੇਰੇ ਦਸਤਾਵੇਜ਼",
    upload: "ਅਪਲੋਡ ਕਰੋ",
    noPrescriptions: "ਅਜੇ ਕੋਈ ਨੁਸਖਾ ਨਹੀਂ",
    scanFirst: "ਪਹਿਲਾ ਰਿਕਾਰਡ ਜੋੜਨ ਲਈ ਨੁਸਖਾ ਸਕੈਨ ਕਰੋ",
    scanBtn: "ਨੁਸਖਾ ਸਕੈਨ ਕਰੋ",
    readAloud: "ਜ਼ੋਰ ਨਾਲ ਪੜ੍ਹੋ",
    noDocuments: "ਅਜੇ ਕੋਈ ਦਸਤਾਵੇਜ਼ ਨਹੀਂ",
    uploadFirst: "ਲੈਬ ਰਿਪੋਰਟ, ਐਕਸ-ਰੇ ਅਪਲੋਡ ਕਰੋ",
    uploadBtn: "ਦਸਤਾਵੇਜ਼ ਅਪਲੋਡ ਕਰੋ",
    uploadTitle: "ਮੈਡੀਕਲ ਦਸਤਾਵੇਜ਼ ਅਪਲੋਡ ਕਰੋ",
    titleLabel: "ਦਸਤਾਵੇਜ਼ ਦਾ ਸਿਰਲੇਖ",
    titlePlaceholder: "ਜਿਵੇਂ: ਖੂਨ ਦੀ ਜਾਂਚ - ਜਨਵਰੀ 2025",
    typeLabel: "ਦਸਤਾਵੇਜ਼ ਦੀ ਕਿਸਮ",
    descLabel: "ਵੇਰਵਾ (ਵਿਕਲਪਿਕ)",
    descPlaceholder: "ਇਸ ਦਸਤਾਵੇਜ਼ ਬਾਰੇ ਨੋਟਸ ਜੋੜੋ...",
    fileLabel: "ਫਾਈਲ ਚੁਣੋ",
    uploading: "ਅਪਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...",
    uploadSuccess: "ਦਸਤਾਵੇਜ਼ ਸਫਲਤਾਪੂਰਵਕ ਅਪਲੋਡ ਹੋਇਆ!",
    back: "← ਵਾਪਸ",
    medicines: "ਦਵਾਈਆਂ ਦੱਸੀਆਂ ਗਈਆਂ",
    loading: "ਤੁਹਾਡੇ ਰਿਕਾਰਡ ਲੋਡ ਹੋ ਰਹੇ ਹਨ...",
    voiceTab1: "ਤੁਹਾਡੇ ਨੁਸਖੇ ਦਿਖਾ ਰਿਹਾ ਹਾਂ",
    voiceTab2: "ਤੁਹਾਡੇ ਦਸਤਾਵੇਜ਼ ਦਿਖਾ ਰਿਹਾ ਹਾਂ",
    voiceTab3: "ਨਵਾਂ ਦਸਤਾਵੇਜ਼ ਅਪਲੋਡ ਕਰਨ ਲਈ ਇੱਥੇ ਦਬਾਓ",
    voiceRead: "ਦਵਾਈਆਂ ਦਾ ਵੇਰਵਾ:",
    voiceScan: "ਨੁਸਖਾ ਸਕੈਨ ਕਰਨ ਜਾ ਰਿਹਾ ਹਾਂ",
    voiceUpload: "ਦਸਤਾਵੇਜ਼ ਅਪਲੋਡ ਕਰਨ ਜਾ ਰਿਹਾ ਹਾਂ",
    voiceBack: "ਪਿਛਲੇ ਪੰਨੇ ਤੇ ਜਾ ਰਿਹਾ ਹਾਂ",
    fillTitle: "ਕਿਰਪਾ ਕਰਕੇ ਦਸਤਾਵੇਜ਼ ਦਾ ਸਿਰਲੇਖ ਅਤੇ ਫਾਈਲ ਚੁਣੋ",
  },
  english: {
    prescriptions: "Prescriptions",
    myDocuments: "My Documents",
    upload: "Upload",
    noPrescriptions: "No prescriptions yet",
    scanFirst: "Scan a prescription to add your first record",
    scanBtn: "Scan Prescription",
    readAloud: "Read aloud",
    noDocuments: "No documents uploaded yet",
    uploadFirst: "Upload lab reports, X-rays and other documents",
    uploadBtn: "Upload Document",
    uploadTitle: "Upload Medical Document",
    titleLabel: "Document Title",
    titlePlaceholder: "e.g. Blood Test Report - Jan 2025",
    typeLabel: "Document Type",
    descLabel: "Description (optional)",
    descPlaceholder: "Add any notes about this document...",
    fileLabel: "Select File",
    uploading: "Uploading...",
    uploadSuccess: "Document uploaded successfully!",
    back: "← Back",
    medicines: "medicine(s) prescribed",
    loading: "Loading your records...",
    voiceTab1: "Showing your prescriptions",
    voiceTab2: "Showing your documents",
    voiceTab3: "Tap here to upload a new document",
    voiceRead: "Your medicines:",
    voiceScan: "Going to scan prescription",
    voiceUpload: "Going to upload document",
    voiceBack: "Going back to dashboard",
    fillTitle: "Please select a file and enter a title",
  }
}

const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', sans-serif; background: #f9f9f7; }
  .page { min-height: 100vh; }
  .topbar {
    background: #0F6E56; padding: 16px 24px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .logo { color: white; font-weight: 700; font-size: 1.3rem; }
  .back {
    background: rgba(255,255,255,0.15); border: none;
    color: white; padding: 8px 16px; border-radius: 8px; cursor: pointer;
  }
  .content { padding: 2rem; max-width: 800px; margin: 0 auto; }
  .tabs {
    display: flex; gap: 4px; margin-bottom: 1.5rem;
    border-bottom: 2px solid #e8e8e4;
  }
  .tab {
    padding: 10px 16px; border: none; background: none;
    cursor: pointer; font-size: .85rem; font-weight: 500;
    color: #888; border-bottom: 2px solid transparent;
    margin-bottom: -2px; transition: all .2s;
  }
  .tab.active { color: #0F6E56; border-bottom-color: #0F6E56; }
  .record-card {
    background: white; border-radius: 16px;
    padding: 1.5rem; margin-bottom: 1rem;
    border: 0.5px solid #e8e8e4;
  }
  .record-date { font-size: .8rem; color: #888; margin-bottom: .8rem; }
  .record-title { font-weight: 700; color: #1a1a1a; margin-bottom: .5rem; }
  .medicine-item {
    background: #f0faf5; border-radius: 10px;
    padding: 10px 14px; margin-bottom: .5rem;
    border: 1px solid #9FE1CB;
  }
  .med-name { font-weight: 600; color: #085041; }
  .med-detail { font-size: .85rem; color: #0F6E56; margin-top: 2px; }
  .speak-btn {
    background: #1a1a1a; color: white; border: none;
    padding: 10px 20px; border-radius: 8px;
    cursor: pointer; font-size: .9rem; margin-top: .8rem;
    width: 100%;
  }
  .doc-card {
    background: white; border-radius: 16px;
    padding: 1.5rem; margin-bottom: 1rem;
    border: 0.5px solid #e8e8e4;
    display: flex; align-items: flex-start; gap: 1rem;
  }
  .doc-icon { font-size: 2rem; flex-shrink: 0; }
  .doc-info { flex: 1; }
  .doc-title { font-weight: 700; color: #1a1a1a; margin-bottom: 4px; }
  .doc-desc { font-size: .85rem; color: #888; margin-bottom: 4px; }
  .doc-date { font-size: .75rem; color: #bbb; }
  .doc-type {
    display: inline-block; padding: 2px 10px;
    background: #f0faf5; border-radius: 20px;
    font-size: .75rem; color: #0F6E56;
    border: 1px solid #9FE1CB; margin-bottom: 6px;
  }
  .upload-card {
    background: white; border-radius: 16px;
    padding: 1.5rem; margin-bottom: 1rem;
    border: 2px dashed #9FE1CB;
  }
  .upload-title { font-weight: 700; color: #1a1a1a; margin-bottom: 1rem; font-size: 1.1rem; }
  .field { margin-bottom: 1rem; }
  .field label {
    display: block; font-size: .8rem; font-weight: 600;
    color: #444; margin-bottom: 4px; text-transform: uppercase;
  }
  .field input, .field select, .field textarea {
    width: 100%; padding: 10px 14px; border-radius: 10px;
    border: 1.5px solid #e0e0dc; font-size: .95rem;
    background: #fafafa; outline: none; box-sizing: border-box;
  }
  .field textarea { resize: vertical; min-height: 80px; }
  .upload-btn {
    width: 100%; padding: 12px; background: #0F6E56;
    color: white; border: none; border-radius: 10px;
    font-size: 1rem; font-weight: 600; cursor: pointer;
  }
  .upload-btn:disabled { background: #aaa; cursor: not-allowed; }
  .empty {
    background: white; border-radius: 16px;
    padding: 3rem; text-align: center;
    border: 0.5px solid #e8e8e4; color: #888;
  }
  .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
  .action-btn {
    background: #0F6E56; color: white; border: none;
    padding: 12px 24px; border-radius: 10px;
    font-size: 1rem; cursor: pointer; margin-top: 1rem;
  }
  .msg-success {
    padding: 12px; background: #E1F5EE; border-radius: 10px;
    color: #085041; font-size: .9rem; margin-bottom: 1rem;
    border: 1px solid #9FE1CB;
  }
  .msg-error {
    padding: 12px; background: #FCEBEB; border-radius: 10px;
    color: #A32D2D; font-size: .9rem; margin-bottom: 1rem;
  }
`

const DOC_TYPES = [
  { value: "prescription", label: "Prescription", icon: "💊" },
  { value: "lab_report", label: "Lab Report", icon: "🔬" },
  { value: "xray", label: "X-Ray / Scan", icon: "🩻" },
  { value: "discharge", label: "Discharge Summary", icon: "🏥" },
  { value: "vaccination", label: "Vaccination Record", icon: "💉" },
  { value: "insurance", label: "Insurance Card", icon: "🪪" },
  { value: "other", label: "Other", icon: "📄" },
]

const getDocIcon = (type) => {
  const found = DOC_TYPES.find(d => d.value === type)
  return found ? found.icon : "📄"
}

function Records() {
  const location = useLocation()
  const navigate = useNavigate()
  const fileRef = useRef(null)

  const name = location.state?.name || "User"
  const language = location.state?.language || "english"
  const userId = location.state?.userId

  const t = recordTranslations[language] || recordTranslations["english"]

  const [activeTab, setActiveTab] = useState("prescriptions")
  const [prescriptions, setPrescriptions] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState("")
  const [uploadMsgType, setUploadMsgType] = useState("")
  const [docTitle, setDocTitle] = useState("")
  const [docDesc, setDocDesc] = useState("")
  const [docType, setDocType] = useState("other")
  const [selectedFile, setSelectedFile] = useState(null)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    try {
      const [presRes, docRes] = await Promise.all([
        fetch(`http://localhost:8000/prescriptions/${userId}`),
        fetch(`http://localhost:8000/documents/${userId}`)
      ])
      const presData = await presRes.json()
      const docData = await docRes.json()
      setPrescriptions(presData.prescriptions || [])
      setDocuments(docData.documents || [])
    } catch {
      console.log("Could not fetch records")
    } finally {
      setLoading(false)
    }
  }

  const announceAndAct = (voiceText, action) => {
    unlockVoice()
    speakText(voiceText)
    if (action) setTimeout(action, 800)
  }

  const handleFileSelect = (e) => {
    setSelectedFile(e.target.files[0])
  }

  const uploadDocument = async () => {
    if (!selectedFile || !docTitle) {
      speakText(t.fillTitle)
      setUploadMsg(t.fillTitle)
      setUploadMsgType("error")
      return
    }

    setUploading(true)
    setUploadMsg("")

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)

      const response = await fetch(
        `http://localhost:8000/upload-document/${userId}?title=${encodeURIComponent(docTitle)}&description=${encodeURIComponent(docDesc)}&document_type=${docType}`,
        { method: "POST", body: formData }
      )
      const data = await response.json()

      if (data.error) {
        setUploadMsg(data.error)
        setUploadMsgType("error")
      } else {
        setUploadMsg(t.uploadSuccess)
        setUploadMsgType("success")
        speakText(t.uploadSuccess)
        setDocTitle("")
        setDocDesc("")
        setDocType("other")
        setSelectedFile(null)
        fetchAll()
      }
    } catch {
      setUploadMsg("Could not connect to server")
      setUploadMsgType("error")
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <style>{styles}</style>
      <div className="page">
        <div className="topbar">
          <span className="logo">SahayAI</span>
          <button
            className="back"
            onClick={() => announceAndAct(t.voiceBack, () =>
              navigate("/dashboard", { state: { userId, name, language } })
            )}
          >
            {t.back}
          </button>
        </div>

        <div className="content">

          <div className="tabs">
            <button
              className={`tab ${activeTab === "prescriptions" ? "active" : ""}`}
              onClick={() => announceAndAct(t.voiceTab1, () => setActiveTab("prescriptions"))}
            >
              💊 {t.prescriptions}
            </button>
            <button
              className={`tab ${activeTab === "documents" ? "active" : ""}`}
              onClick={() => announceAndAct(t.voiceTab2, () => setActiveTab("documents"))}
            >
              📁 {t.myDocuments}
            </button>
            <button
              className={`tab ${activeTab === "upload" ? "active" : ""}`}
              onClick={() => announceAndAct(t.voiceTab3, () => setActiveTab("upload"))}
            >
              ➕ {t.upload}
            </button>
          </div>

          {loading && (
            <div className="empty">
              <div className="empty-icon">⏳</div>
              <p>{t.loading}</p>
            </div>
          )}

          {/* PRESCRIPTIONS TAB */}
          {!loading && activeTab === "prescriptions" && (
            <>
              {prescriptions.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">💊</div>
                  <p style={{ fontWeight: 600, color: "#1a1a1a" }}>{t.noPrescriptions}</p>
                  <p style={{ fontSize: ".85rem", marginTop: ".5rem" }}>{t.scanFirst}</p>
                  <button
                    className="action-btn"
                    onClick={() => announceAndAct(t.voiceScan, () =>
                      navigate("/prescription", { state: { userId, name, language } })
                    )}
                  >
                    {t.scanBtn}
                  </button>
                </div>
              ) : (
                prescriptions.map((p) => (
                  <div className="record-card" key={p.id}>
                    <div className="record-date">📅 {p.scanned_at}</div>
                    <div className="record-title">
                      💊 {p.medicines?.length || 0} {t.medicines}
                    </div>
                    {p.medicines && p.medicines.map((med, i) => (
                      <div className="medicine-item" key={i}>
                        <div className="med-name">{med.medicine}</div>
                        <div className="med-detail">
                          {med.dose && `${med.dose} · `}
                          {med.frequency && `${med.frequency}`}
                          {med.duration && ` · ${med.duration}`}
                        </div>
                      </div>
                    ))}
                    <button
                      className="speak-btn"
                      onClick={() => speakText(t.voiceRead + " " + p.speech_text)}
                    >
                      🔊 {t.readAloud}
                    </button>
                  </div>
                ))
              )}
            </>
          )}

          {/* DOCUMENTS TAB */}
          {!loading && activeTab === "documents" && (
            <>
              {documents.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">📁</div>
                  <p style={{ fontWeight: 600, color: "#1a1a1a" }}>{t.noDocuments}</p>
                  <p style={{ fontSize: ".85rem", marginTop: ".5rem" }}>{t.uploadFirst}</p>
                  <button
                    className="action-btn"
                    onClick={() => announceAndAct(t.voiceUpload, () => setActiveTab("upload"))}
                  >
                    {t.uploadBtn}
                  </button>
                </div>
              ) : (
                documents.map((doc) => (
                  <div className="doc-card" key={doc.id}>
                    <div className="doc-icon">{getDocIcon(doc.document_type)}</div>
                    <div className="doc-info">
                      <div className="doc-type">
                        {DOC_TYPES.find(d => d.value === doc.document_type)?.label || "Document"}
                      </div>
                      <div className="doc-title">{doc.title}</div>
                      {doc.description && (
                        <div className="doc-desc">{doc.description}</div>
                      )}
                      <div className="doc-date">📅 {doc.uploaded_at}</div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {/* UPLOAD TAB */}
          {!loading && activeTab === "upload" && (
            <div className="upload-card">
              <div className="upload-title">📤 {t.uploadTitle}</div>

              {uploadMsg && (
                <div className={uploadMsgType === "success" ? "msg-success" : "msg-error"}>
                  {uploadMsg}
                </div>
              )}

              <div className="field">
                <label>{t.titleLabel} *</label>
                <input
                  type="text"
                  placeholder={t.titlePlaceholder}
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                />
              </div>

              <div className="field">
                <label>{t.typeLabel}</label>
                <select value={docType} onChange={(e) => setDocType(e.target.value)}>
                  {DOC_TYPES.map(dt => (
                    <option key={dt.value} value={dt.value}>
                      {dt.icon} {dt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>{t.descLabel}</label>
                <textarea
                  placeholder={t.descPlaceholder}
                  value={docDesc}
                  onChange={(e) => setDocDesc(e.target.value)}
                />
              </div>

              <div className="field">
                <label>{t.fileLabel} *</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileSelect}
                  style={{ padding: "8px" }}
                />
                {selectedFile && (
                  <p style={{ fontSize: ".8rem", color: "#0F6E56", marginTop: "4px" }}>
                    ✅ {selectedFile.name}
                  </p>
                )}
              </div>

              <button
                className="upload-btn"
                onClick={uploadDocument}
                disabled={uploading}
              >
                {uploading ? t.uploading : `📤 ${t.uploadBtn}`}
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  )
}

export default Records