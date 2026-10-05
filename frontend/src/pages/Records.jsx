import { useState, useEffect, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { speakText, unlockVoice, stopVoice } from "../voiceHelper"

const recordTranslations = {
  kannada: {
    prescriptions: "ಔಷಧಿ ಚೀಟಿಗಳು",
    myDocuments: "ನನ್ನ ದಾಖಲೆಗಳು",
    upload: "ಅಪ್ಲೋಡ್ ಮಾಡಿ",
    blockchainVault: "🛡️ ಬ್ಲಾಕ್‌ಚೈನ್ ಭದ್ರತೆ",
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
    voiceTab4: "ಬ್ಲಾಕ್‌ಚೈನ್ ಭದ್ರತಾ ಕೊಠಡಿ ತೆರೆಯುತ್ತಿದ್ದೇನೆ",
    voiceRead: "ಔಷಧಿಗಳ ವಿವರ:",
    voiceScan: "ಔಷಧಿ ಚೀಟಿ ಸ್ಕ್ಯಾನ್ ಮಾಡಲು ಹೋಗುತ್ತಿದ್ದೇನೆ",
    voiceUpload: "ದಾಖಲೆ ಅಪ್ಲೋಡ್ ಮಾಡಲು ಹೋಗುತ್ತಿದ್ದೇನೆ",
    voiceBack: "ಹಿಂದಿನ ಪುಟಕ್ಕೆ ಹೋಗುತ್ತಿದ್ದೇನೆ",
    fillTitle: "ದಯವಿಟ್ಟು ದಾಖಲೆಯ ಹೆಸರು ಮತ್ತು ಫೈಲ್ ಆಯ್ಕೆ ಮಾಡಿ",
    blockchainVerified: "ಬ್ಲಾಕ್‌ಚೈನ್ ಸತ್ಯಾಪಿತವಾಗಿದೆ",
    tamperProof: "ಯಾರೂ ಬದಲಾಯಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ (SHA-256)",
    auditBtn: "ಭದ್ರತೆ ಪರಿಶೀಲಿಸಿ (Audit Ledger)",
    blockHash: "ಬ್ಲಾಕ್ ಹ್ಯಾಶ್",
  },
  hindi: {
    prescriptions: "पर्चे",
    myDocuments: "मेरे दस्तावेज़",
    upload: "अपलोड करें",
    blockchainVault: "🛡️ ब्लॉकचेन सुरक्षा",
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
    voiceTab4: "ब्लॉकचेन सुरक्षा तिजोरी खोल रहा हूं",
    voiceRead: "दवाइयों का विवरण:",
    voiceScan: "पर्चा स्कैन करने जा रहा हूं",
    voiceUpload: "दस्तावेज़ अपलोड करने जा रहा हूं",
    voiceBack: "पिछले पेज पर जा रहा हूं",
    fillTitle: "कृपया दस्तावेज़ का नाम और फ़ाइल चुनें",
    blockchainVerified: "ब्लॉकचेन सत्यापित है",
    tamperProof: "कोई भी छेड़छाड़ नहीं कर सकता (SHA-256)",
    auditBtn: "सुरक्षा जांचें (Audit Ledger)",
    blockHash: "ब्लॉक हैश",
  },
  english: {
    prescriptions: "Prescriptions",
    myDocuments: "My Documents",
    upload: "Upload",
    blockchainVault: "🛡️ Blockchain Vault",
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
    voiceTab4: "Opening Blockchain Security Vault",
    voiceRead: "Your medicines:",
    voiceScan: "Going to scan prescription",
    voiceUpload: "Going to upload document",
    voiceBack: "Going back to dashboard",
    fillTitle: "Please select a file and enter a title",
    blockchainVerified: "Blockchain Ledger Verified",
    tamperProof: "Immutable & Tamper-Proof (SHA-256 Cryptographic Hash)",
    auditBtn: "Audit Ledger Integrity",
    blockHash: "Block Hash",
  }
}

const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Plus Jakarta Sans', sans-serif; background: #F4F8F6; color: #111827; }
  .page { min-height: 100vh; background: #F4F8F6; }
  .topbar {
    background: linear-gradient(135deg, #044E3B 0%, #0F6E56 60%, #085041 100%);
    padding: 1rem 2rem;
    display: flex; justify-content: space-between; align-items: center;
    box-shadow: 0 4px 20px rgba(4, 78, 59, 0.15);
    position: sticky; top: 0; z-index: 50;
  }
  .logo { color: white; font-weight: 800; font-size: 1.35rem; letter-spacing: -0.5px; display: flex; align-items: center; gap: 8px; }
  .back {
    background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25);
    color: white; padding: 7px 16px; border-radius: 10px; cursor: pointer;
    font-weight: 600; font-size: 0.85rem; transition: all 0.2s ease;
  }
  .back:hover { background: rgba(255,255,255,0.25); transform: translateY(-1px); }

  .content { padding: 2rem 1.5rem 3rem; max-width: 1040px; margin: 0 auto; }
  .tabs {
    display: flex; gap: 8px; margin-bottom: 1.8rem;
    border-bottom: 2px solid #E5EFEA;
  }
  .tab {
    padding: 12px 20px; border: none; background: none;
    cursor: pointer; font-size: 0.92rem; font-weight: 600;
    color: #6B7280; border-bottom: 3px solid transparent;
    margin-bottom: -2px; transition: all 0.2s ease;
  }
  .tab:hover { color: #0F6E56; }
  .tab.active { color: #044E3B; border-bottom-color: #0F6E56; font-weight: 800; }
  
  .record-card {
    background: white; border-radius: 18px;
    padding: 1.5rem; margin-bottom: 1.25rem;
    border: 1px solid #E5EFEA;
    box-shadow: 0 6px 20px rgba(15, 110, 86, 0.05);
  }
  .record-date { font-size: 0.82rem; color: #6B7280; margin-bottom: 0.8rem; font-weight: 600; }
  .record-title { font-weight: 800; color: #044E3B; margin-bottom: 0.6rem; font-size: 1.1rem; }
  .medicine-item {
    background: linear-gradient(135deg, #F0FAF5 0%, #FFFFFF 100%);
    border-radius: 12px; padding: 12px 16px; margin-bottom: 0.6rem;
    border: 1px solid #D1EBE1;
  }
  .med-name { font-weight: 700; color: #044E3B; font-size: 0.95rem; }
  .med-detail { font-size: 0.85rem; color: #0F6E56; margin-top: 2px; }
  .speak-btn {
    background: #1F2937; color: white; border: none;
    padding: 12px 20px; border-radius: 12px;
    cursor: pointer; font-size: 0.92rem; font-weight: 700;
    margin-top: 1rem; width: 100%; transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(31, 41, 55, 0.15);
  }
  .speak-btn:hover { background: #111827; transform: translateY(-1px); }

  .doc-card {
    background: white; border-radius: 18px;
    padding: 1.5rem; margin-bottom: 1.25rem;
    border: 1px solid #E5EFEA;
    box-shadow: 0 6px 20px rgba(15, 110, 86, 0.05);
    display: flex; align-items: flex-start; gap: 1.25rem;
  }
  .doc-icon { font-size: 2.2rem; flex-shrink: 0; background: #F0FAF5; padding: 10px; border-radius: 14px; border: 1px solid #D1EBE1; }
  .doc-info { flex: 1; }
  .doc-title { font-weight: 800; color: #044E3B; margin-bottom: 6px; font-size: 1.05rem; }
  .doc-desc { font-size: 0.88rem; color: #4B5563; margin-bottom: 8px; line-height: 1.4; }
  .doc-date { font-size: 0.78rem; color: #9CA3AF; font-weight: 500; }
  .doc-type {
    display: inline-block; padding: 3px 12px;
    background: #E1F5EE; border-radius: 20px;
    font-size: 0.75rem; color: #044E3B; font-weight: 700;
    border: 1px solid #9FE1CB; margin-bottom: 8px;
    text-transform: uppercase;
  }

  .upload-card {
    background: white; border-radius: 20px;
    padding: 2rem; margin-bottom: 1.5rem;
    border: 2px dashed #9FE1CB;
    box-shadow: 0 8px 24px rgba(15, 110, 86, 0.06);
  }
  .upload-title { font-weight: 800; color: #044E3B; margin-bottom: 1.2rem; font-size: 1.2rem; }
  .field { margin-bottom: 1.2rem; }
  .field label {
    display: block; font-size: 0.82rem; font-weight: 700;
    color: #374151; margin-bottom: 6px; text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .field input, .field select, .field textarea {
    width: 100%; padding: 12px 16px; border-radius: 12px;
    border: 1.5px solid #E5EFEA; font-size: 0.95rem;
    background: #F9FAFB; outline: none; box-sizing: border-box;
    transition: all 0.2s ease;
  }
  .field input:focus, .field select:focus, .field textarea:focus {
    border-color: #0F6E56; background: #FFFFFF; box-shadow: 0 0 0 3px rgba(15, 110, 86, 0.1);
  }
  .field textarea { resize: vertical; min-height: 90px; }

  .upload-btn {
    width: 100%; padding: 14px;
    background: linear-gradient(135deg, #0F6E56 0%, #085041 100%);
    color: white; border: none; border-radius: 12px;
    font-size: 1rem; font-weight: 700; cursor: pointer;
    box-shadow: 0 4px 14px rgba(15, 110, 86, 0.2);
    transition: all 0.2s ease;
  }
  .upload-btn:hover { background: linear-gradient(135deg, #085041 0%, #044E3B 100%); transform: translateY(-1px); }
  .upload-btn:disabled { background: #9CA3AF; cursor: not-allowed; box-shadow: none; transform: none; }

  .empty {
    background: white; border-radius: 20px;
    padding: 3.5rem 2rem; text-align: center;
    border: 1px solid #E5EFEA; color: #6B7280;
    box-shadow: 0 4px 16px rgba(0,0,0,0.02);
  }
  .empty-icon { font-size: 3.5rem; margin-bottom: 1rem; opacity: 0.8; }
  .action-btn {
    background: linear-gradient(135deg, #0F6E56 0%, #085041 100%);
    color: white; border: none;
    padding: 12px 28px; border-radius: 12px;
    font-size: 0.95rem; font-weight: 700; cursor: pointer; margin-top: 1.2rem;
    box-shadow: 0 4px 14px rgba(15, 110, 86, 0.2);
    transition: all 0.2s ease;
  }
  .bc-hash-pill {
    display: inline-flex; align-items: center; gap: 6px;
    background: #044E3B; color: #6EE7B7;
    font-family: monospace; font-size: 0.72rem;
    padding: 4px 10px; border-radius: 8px; margin-top: 8px;
    border: 1px solid rgba(110, 231, 183, 0.3); word-break: break-all;
  }
  .blockchain-vault-banner {
    background: linear-gradient(135deg, #044E3B 0%, #0F6E56 100%);
    color: white; border-radius: 20px; padding: 1.8rem; margin-bottom: 1.8rem;
    box-shadow: 0 8px 30px rgba(4, 78, 59, 0.25); border: 1px solid rgba(110, 231, 183, 0.2);
  }
  .bc-status-badge {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(110, 231, 183, 0.15); border: 1px solid #6EE7B7;
    color: #6EE7B7; padding: 6px 14px; border-radius: 30px;
    font-size: 0.85rem; font-weight: 700; margin-bottom: 1rem;
  }
  .audit-btn {
    background: #6EE7B7; color: #044E3B; border: none;
    padding: 10px 20px; border-radius: 12px; font-weight: 800;
    font-size: 0.88rem; cursor: pointer; transition: all 0.2s ease;
    margin-top: 1rem; display: inline-flex; align-items: center; gap: 6px;
  }
  .audit-btn:hover { background: #A7F3D0; transform: translateY(-1px); }
  .block-card {
    background: white; border-radius: 16px; padding: 1.25rem;
    margin-bottom: 1rem; border: 1px solid #E5EFEA;
    box-shadow: 0 4px 12px rgba(0,0,0,0.03); font-size: 0.88rem;
  }
  .block-header {
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 1px solid #E5EFEA; padding-bottom: 8px; margin-bottom: 10px;
  }
  .block-index { font-weight: 800; color: #044E3B; font-size: 0.95rem; }
  .block-time { color: #6B7280; font-size: 0.78rem; }
  .hash-row { margin-top: 6px; }
  .hash-label { font-size: 0.75rem; font-weight: 700; color: #4B5563; }
  .hash-val { font-family: monospace; font-size: 0.76rem; color: #0F6E56; background: #F0FAF5; padding: 3px 8px; border-radius: 6px; word-break: break-all; margin-top: 2px; }
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

  const name = location.state?.name || localStorage.getItem("userName") || "User"
  const language = location.state?.language || localStorage.getItem("userLanguage") || "english"
  const userId = location.state?.userId || localStorage.getItem("userId") || 1

  useEffect(() => {
    if (location.state?.userId) localStorage.setItem("userId", location.state.userId)
    if (location.state?.name) localStorage.setItem("userName", location.state.name)
    if (location.state?.language) localStorage.setItem("userLanguage", location.state.language)
  }, [location.state])

  const t = recordTranslations[language] || recordTranslations["english"]

  const [activeTab, setActiveTab] = useState("prescriptions")
  const [prescriptions, setPrescriptions] = useState([])
  const [documents, setDocuments] = useState([])
  const [blockchainData, setBlockchainData] = useState({ verified: true, blocks: [], total_blocks: 0 })
  const [verifyingBlockchain, setVerifyingBlockchain] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState("")
  const [uploadMsgType, setUploadMsgType] = useState("")
  const [docTitle, setDocTitle] = useState("")
  const [docDesc, setDocDesc] = useState("")
  const [docType, setDocType] = useState("other")
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewModal, setPreviewModal] = useState(null)

  useEffect(() => {
    fetchAll()
    return () => {
      stopVoice()
    }
  }, [userId])

  const fetchAll = async () => {
    const activeUserId = userId || localStorage.getItem("userId") || 1
    try {
      const [presRes, docRes, bcRes] = await Promise.all([
        fetch(`http://localhost:8000/prescriptions/${activeUserId}`),
        fetch(`http://localhost:8000/documents/${activeUserId}`),
        fetch(`http://localhost:8000/api/blockchain/records/${activeUserId}`)
      ])
      const presData = presRes.ok ? await presRes.json() : {}
      const docData = docRes.ok ? await docRes.json() : {}
      const bcData = bcRes.ok ? await bcRes.json() : {}
      setPrescriptions(presData.prescriptions || [])
      setDocuments(docData.documents || [])
      setBlockchainData(bcData || { verified: true, blocks: [], total_blocks: 0 })
    } catch (err) {
      console.log("Could not fetch records:", err)
    } finally {
      setLoading(false)
    }
  }

  const auditBlockchain = async () => {
    setVerifyingBlockchain(true)
    const activeUserId = userId || localStorage.getItem("userId") || 1
    try {
      const res = await fetch(`http://localhost:8000/api/blockchain/verify/${activeUserId}`)
      const data = await res.json()
      if (data.verified) {
        const msg = language === "kannada"
          ? "ಬ್ಲಾಕ್‌ಚೈನ್ ಪರಿಶೀಲಿಸಲಾಗಿದೆ! ನಿಮ್ಮ ಎಲ್ಲಾ ವೈದ್ಯಕೀಯ ದಾಖಲೆಗಳು 100% ಸುರಕ್ಷಿತ ಮತ್ತು ಬದಲಾಯಿಸಲಾಗದವು."
          : language === "hindi"
            ? "ब्लॉकचेन सत्यापित किया गया! आपके सभी मेडिकल रिकॉर्ड 100% सुरक्षित और अपरिवर्तनीय हैं।"
            : "Blockchain Ledger Audit Complete! All medical records verified 100% authentic and tamper-proof."
        speakText(msg, language)
      } else {
        speakText("Warning: Ledger verification issue detected.", language)
      }
    } catch {
      speakText("Unable to reach blockchain ledger audit server.", language)
    } finally {
      setVerifyingBlockchain(false)
    }
  }

  const announceAndAct = (voiceText, action) => {
    unlockVoice()
    speakText(voiceText, language)
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
      const activeUserId = userId || localStorage.getItem("userId") || 1
      const formData = new FormData()
      formData.append("file", selectedFile)

      const response = await fetch(
        `http://localhost:8000/upload-document/${activeUserId}?title=${encodeURIComponent(docTitle)}&description=${encodeURIComponent(docDesc)}&document_type=${docType}`,
        { method: "POST", body: formData }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errMsg = errorData.error || errorData.detail?.[0]?.msg || `Upload error (Server HTTP ${response.status})`
        setUploadMsg(errMsg)
        setUploadMsgType("error")
        return
      }

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
    } catch (err) {
      console.error("uploadDocument error:", err)
      setUploadMsg("Could not connect to server. Please ensure backend server is running.")
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
              className={`tab ${activeTab === "blockchain" ? "active" : ""}`}
              onClick={() => announceAndAct(t.voiceTab4, () => setActiveTab("blockchain"))}
            >
              {t.blockchainVault}
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
                          {med.instructions && ` (${med.instructions})`}
                          {med.duration && ` · ${med.duration}`}
                        </div>
                      </div>
                    ))}
                    {p.image_path && (
                      <button
                        onClick={() => {
                          const cleanPath = p.image_path.replace(/\\/g, '/')
                          const url = `http://localhost:8000/${cleanPath}`
                          const isPdf = cleanPath.toLowerCase().endsWith(".pdf")
                          setPreviewModal({ url, title: `Prescription Paper (${p.scanned_at})`, isPdf })
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          marginTop: "6px",
                          marginBottom: "8px",
                          padding: "7px 14px",
                          background: "#FFFFFF",
                          color: "#0F6E56",
                          border: "1.5px solid #0F6E56",
                          borderRadius: "10px",
                          fontSize: "0.82rem",
                          fontWeight: "700",
                          cursor: "pointer"
                        }}
                      >
                        🖼️ View Original Prescription Paper
                      </button>
                    )}
                    {p.block_hash && (
                      <div className="bc-hash-pill">
                        🛡️ SHA-256: {p.block_hash.slice(0, 16)}...{p.block_hash.slice(-8)}
                      </div>
                    )}
                    <button
                      className="speak-btn"
                      onClick={() => speakText(p.speech_text || (t.voiceRead + " " + p.prescription_text), language, p.audio_base64)}
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
                      {doc.file_path && (
                        <button
                          onClick={() => {
                            const cleanPath = doc.file_path.replace(/\\/g, '/')
                            const url = `http://localhost:8000/${cleanPath}`
                            const isPdf = cleanPath.toLowerCase().endsWith(".pdf")
                            setPreviewModal({ url, title: doc.title, isPdf })
                          }}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            marginTop: "8px",
                            marginBottom: "8px",
                            padding: "8px 16px",
                            background: "linear-gradient(135deg, #0F6E56 0%, #085041 100%)",
                            color: "white",
                            border: "none",
                            borderRadius: "10px",
                            fontSize: "0.85rem",
                            fontWeight: "700",
                            cursor: "pointer",
                            boxShadow: "0 2px 8px rgba(15, 110, 86, 0.2)"
                          }}
                        >
                          👁️ View / Open Document
                        </button>
                      )}
                      {doc.block_hash && (
                        <div className="bc-hash-pill">
                          🛡️ SHA-256: {doc.block_hash.slice(0, 16)}...{doc.block_hash.slice(-8)}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {/* BLOCKCHAIN VAULT TAB */}
          {!loading && activeTab === "blockchain" && (
            <div>
              <div className="blockchain-vault-banner">
                <div className="bc-status-badge">
                  <span>●</span> {t.blockchainVerified}
                </div>
                <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "6px" }}>
                  🛡️ Health Record Security Vault
                </h2>
                <p style={{ fontSize: "0.9rem", opacity: 0.9, lineHeight: 1.4 }}>
                  {t.tamperProof}
                </p>
                <button
                  className="audit-btn"
                  onClick={auditBlockchain}
                  disabled={verifyingBlockchain}
                >
                  {verifyingBlockchain ? "🔍 Auditing Chain..." : `🔍 ${t.auditBtn}`}
                </button>
              </div>

              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#044E3B", marginBottom: "1rem" }}>
                📜 Cryptographic Ledger Trail ({blockchainData.blocks?.length || 0} Blocks)
              </h3>

              {(!blockchainData.blocks || blockchainData.blocks.length === 0) ? (
                <div className="empty">
                  <div className="empty-icon">🛡️</div>
                  <p style={{ fontWeight: 600, color: "#1a1a1a" }}>No Blockchain Blocks Yet</p>
                  <p style={{ fontSize: ".85rem", marginTop: ".5rem" }}>
                    Scan a prescription or upload a medical document to generate your first SHA-256 block.
                  </p>
                </div>
              ) : (
                blockchainData.blocks.map((b) => (
                  <div className="block-card" key={b.block_index}>
                    <div className="block-header">
                      <span className="block-index">⛓️ Block #{b.block_index} ({b.record_type.toUpperCase()})</span>
                      <span className="block-time">🕒 {b.created_at}</span>
                    </div>
                    <div className="hash-row">
                      <div className="hash-label">Prev Hash:</div>
                      <div className="hash-val">{b.prev_hash}</div>
                    </div>
                    <div className="hash-row">
                      <div className="hash-label">Payload Hash:</div>
                      <div className="hash-val">{b.payload_hash}</div>
                    </div>
                    <div className="hash-row">
                      <div className="hash-label">SHA-256 Block Hash:</div>
                      <div className="hash-val" style={{ fontWeight: "bold", color: "#044E3B" }}>{b.block_hash}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
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

      {/* Fullscreen Document & Prescription Viewer Modal */}
      {previewModal && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.8)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem"
        }}>
          <div style={{
            background: "white",
            borderRadius: "20px",
            maxWidth: "920px",
            width: "100%",
            maxHeight: "92vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 25px 50px rgba(0,0,0,0.4)"
          }}>
            <div style={{
              background: "linear-gradient(135deg, #044E3B 0%, #0F6E56 100%)",
              color: "white",
              padding: "1rem 1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>
                📄 {previewModal.title || "Medical Document Viewer"}
              </div>
              <button
                onClick={() => setPreviewModal(null)}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  color: "white",
                  fontSize: "1.2rem",
                  fontWeight: 800,
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  cursor: "pointer"
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflow: "auto", padding: "1rem", background: "#f8fafc", textAlign: "center" }}>
              {previewModal.isPdf ? (
                <iframe
                  src={previewModal.url}
                  title={previewModal.title}
                  style={{ width: "100%", height: "70vh", border: "none", borderRadius: "12px" }}
                />
              ) : (
                <img
                  src={previewModal.url}
                  alt={previewModal.title}
                  style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: "12px" }}
                />
              )}
            </div>

            <div style={{
              padding: "1rem 1.5rem",
              background: "white",
              borderTop: "1px solid #E5EFEA",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <a
                href={previewModal.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "8px 18px",
                  background: "#0F6E56",
                  color: "white",
                  borderRadius: "10px",
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: "0.88rem"
                }}
              >
                🌐 Open Fullscreen / New Tab
              </a>
              <button
                onClick={() => setPreviewModal(null)}
                style={{
                  padding: "8px 18px",
                  background: "#374151",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Records