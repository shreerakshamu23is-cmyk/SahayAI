let voiceUnlocked = false
let currentAudio = null

export const stopVoice = () => {
    try {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel()
        }
        if (currentAudio) {
            currentAudio.pause()
            currentAudio.currentTime = 0
            currentAudio = null
        }
    } catch (e) {
        console.warn("stopVoice error:", e)
    }
}

export const unlockVoice = () => {
    if (voiceUnlocked) return
    try {
        const synth = window.speechSynthesis
        if (synth) {
            const silent = new SpeechSynthesisUtterance(" ")
            silent.volume = 0
            synth.speak(silent)
        }
    } catch (e) {
        console.warn("Speech synthesis unlock warning:", e)
    }
    voiceUnlocked = true
}

export const playBase64Audio = (base64Data) => {
    return new Promise((resolve) => {
        try {
            if (!base64Data) {
                resolve()
                return
            }
            stopVoice()
            const src = base64Data.startsWith("data:") 
                ? base64Data 
                : `data:audio/wav;base64,${base64Data}`
            
            const audio = new Audio(src)
            currentAudio = audio
            audio.onended = () => {
                if (currentAudio === audio) currentAudio = null
                resolve()
            }
            audio.onerror = (e) => {
                console.warn("Base64 Audio Playback Error:", e)
                if (currentAudio === audio) currentAudio = null
                resolve()
            }
            audio.play().catch((err) => {
                console.warn("Audio autoplay policy block:", err)
                if (currentAudio === audio) currentAudio = null
                resolve()
            })
        } catch (e) {
            console.warn("playBase64Audio exception:", e)
            resolve()
        }
    })
}

export const speakTextWithBhashini = async (text, language = "kannada", audioBase64 = null) => {
    unlockVoice()
    
    // 1. If audioBase64 is provided directly from backend payload
    if (audioBase64) {
        return playBase64Audio(audioBase64)
    }

    if (!text || (typeof text === "string" && !text.trim())) return

    // 2. Attempt Bhashini TTS API
    try {
        const res = await fetch("http://localhost:8000/api/bhashini/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, language })
        })
        if (res.ok) {
            const data = await res.json()
            if (data.audio_base64) {
                return await playBase64Audio(data.audio_base64)
            }
        }
    } catch (e) {
        console.warn("Bhashini TTS fetch failed, falling back to browser speech:", e)
    }

    // 3. Fallback to Web SpeechSynthesis API
    return speakTextBrowser(text, language)
}

export const speakTextBrowser = (text, language = "english", rate = 0.85) => {
    return new Promise((resolve) => {
        try {
            stopVoice()
            const synth = window.speechSynthesis
            if (!synth) {
                resolve()
                return
            }

            const langCodes = {
                kannada: "kn-IN",
                hindi: "hi-IN",
                tamil: "ta-IN",
                telugu: "te-IN",
                bengali: "bn-IN",
                marathi: "mr-IN",
                english: "en-US"
            }

            const targetLang = langCodes[language?.toLowerCase()] || "en-US"

            const doSpeak = () => {
                const voices = synth.getVoices()
                const utterance = new SpeechSynthesisUtterance(text)
                utterance.lang = targetLang
                utterance.rate = rate
                utterance.volume = 1

                const voice = voices.find(v => v.lang.startsWith(targetLang.slice(0, 2))) ||
                              voices.find(v => v.lang.startsWith("en"))

                if (voice) utterance.voice = voice
                utterance.onend = resolve
                utterance.onerror = resolve
                synth.speak(utterance)
            }

            if (synth.getVoices().length === 0) {
                synth.addEventListener("voiceschanged", () => {
                    setTimeout(doSpeak, 100)
                }, { once: true })
            } else {
                setTimeout(doSpeak, 100)
            }
        } catch (err) {
            console.warn("speakTextBrowser error:", err)
            resolve()
        }
    })
}

// Default export alias for backwards compatibility
export const speakText = (text, language = "english", audioBase64 = null) => {
    return speakTextWithBhashini(text, language, audioBase64)
}