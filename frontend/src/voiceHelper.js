let voiceUnlocked = false

export const unlockVoice = () => {
    if (voiceUnlocked) return
    const synth = window.speechSynthesis
    const silent = new SpeechSynthesisUtterance(" ")
    silent.volume = 0
    synth.speak(silent)
    voiceUnlocked = true
}

export const speakText = (text, rate = 0.85) => {
    return new Promise((resolve) => {
        const synth = window.speechSynthesis
        synth.cancel()

        const doSpeak = () => {
            const voices = synth.getVoices()
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = "en-US"
            utterance.rate = rate
            utterance.volume = 1

            const voice = voices.find(v =>
                v.lang.startsWith("en") && v.localService
            ) || voices.find(v => v.lang.startsWith("en"))

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
    })
}