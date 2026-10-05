let activeAudio = null;
let activeSession = null;
let nextSessionId = 1;

export function unlockVoice() {
try {
window.speechSynthesis.cancel();
window.speechSynthesis.resume();
} catch (error) {
console.log("[TTS] Unlock error:", error);
}
}

function getLanguageInfo(language) {
const value = String(language || "").trim().toLowerCase();

if (value === "kannada" || value === "kn" || value === "kn-in") {
    return {
        backend: "kannada",
        browser: "kn-IN"
    };
}

if (value === "hindi" || value === "hi" || value === "hi-in") {
    return {
        backend: "hindi",
        browser: "hi-IN"
    };
}

if (value === "tamil" || value === "ta" || value === "ta-in") {
    return {
        backend: "tamil",
        browser: "ta-IN"
    };
}

if (value === "telugu" || value === "te" || value === "te-in") {
    return {
        backend: "telugu",
        browser: "te-IN"
    };
}

return {
    backend: "english",
    browser: "en-US"
};

}

function createSession(label) {
if (activeSession) {
activeSession.cancelled = true;
}

if (activeAudio) {
    try {
        activeAudio.pause();
        activeAudio.currentTime = 0;
    } catch (error) {
        console.log("[TTS] Previous audio stop error:", error);
    }

    activeAudio = null;
}

try {
    window.speechSynthesis.cancel();
} catch (error) {
    console.log("[TTS] Session stop error:", error);
}

activeSession = {
    id: nextSessionId++,
    label: label || "Voice",
    cancelled: false
};

return activeSession;

}

function isSessionActive(session) {
return (
activeSession !== null &&
activeSession.id === session.id &&
session.cancelled === false
);
}

function finishSession(session) {
if (
activeSession !== null &&
activeSession.id === session.id
) {
activeSession = null;
}
}

function playAudio(audioBase64, session) {
return new Promise(function(resolve, reject) {
if (!isSessionActive(session)) {
resolve(false);
return;
}

    if (!audioBase64) {
        resolve(false);
        return;
    }

    const audio = new Audio();

    activeAudio = audio;

    if (String(audioBase64).indexOf("data:") === 0) {
        audio.src = audioBase64;
    } else {
        audio.src = "data:audio/mpeg;base64," + audioBase64;
    }

    audio.onended = function() {
        if (activeAudio === audio) {
            activeAudio = null;
        }

        resolve(true);
    };

    audio.onerror = function(error) {
        if (activeAudio === audio) {
            activeAudio = null;
        }

        reject(error);
    };

    audio.onloadeddata = function() {
        if (!isSessionActive(session)) {
            audio.pause();
            audio.currentTime = 0;

            if (activeAudio === audio) {
                activeAudio = null;
            }

            resolve(false);
            return;
        }

        audio.play().catch(function(error) {
            if (activeAudio === audio) {
                activeAudio = null;
            }

            reject(error);
        });
    };

    audio.load();
});

}

function speakWithBrowser(text, language, session) {
return new Promise(function(resolve) {
if (!isSessionActive(session)) {
resolve(false);
return;
}

    if (!("speechSynthesis" in window)) {
        resolve(false);
        return;
    }

    try {
        window.speechSynthesis.cancel();

        const info = getLanguageInfo(language);

        console.log(
            "[TTS] Browser fallback = " + info.browser
        );

        const utterance = new SpeechSynthesisUtterance(
            String(text)
        );

        utterance.lang = info.browser;
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onend = function() {
            resolve(true);
        };

        utterance.onerror = function(error) {
            console.error(
                "[TTS] Browser error:",
                error
            );

            resolve(false);
        };

        window.speechSynthesis.speak(utterance);
    } catch (error) {
        console.error(
            "[TTS] Browser fallback error:",
            error
        );

        resolve(false);
    }
});

}

async function runSession(text, language, session) {
const info = getLanguageInfo(language);

console.log(
    "[TTS] FINAL LANGUAGE = " + info.backend
);

console.log(
    "[TTS] BROWSER LANGUAGE = " + info.browser
);

try {
    const response = await fetch(
        "http://localhost:8000/api/bhashini/tts",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text: String(text),
                language: info.backend
            })
        }
    );

    if (!response.ok) {
        throw new Error(
            "TTS request failed: " + response.status
        );
    }

    const data = await response.json();

    console.log(
        "[TTS] Backend language = " +
        String(data.language || "")
    );

    if (!isSessionActive(session)) {
        return false;
    }

    if (data.audio_base64) {
        try {
            const result = await playAudio(
                data.audio_base64,
                session
            );

            if (result) {
                return true;
            }
        } catch (error) {
            console.error(
                "[TTS] Backend audio error:",
                error
            );
        }
    }

    return await speakWithBrowser(
        text,
        info.backend,
        session
    );
} catch (error) {
    console.error(
        "[TTS] Backend TTS error:",
        error
    );

    return await speakWithBrowser(
        text,
        info.backend,
        session
    );
}

}

export async function speakTextWithBhashini(
text,
language,
label
) {
if (!text) {
return false;
}

const session = createSession(
    label || "Voice"
);

try {
    return await runSession(
        String(text),
        language,
        session
    );
} finally {
    finishSession(session);
}

}

export async function speakText(
text,
language
) {
return speakTextWithBhashini(
text,
language || "english",
"Voice"
);
}

export async function speakHelper(
text,
language,
audioBase64,
userActionAt,
label
) {
if (!text) {
return false;
}

const session = createSession(
    label || "Voice"
);

try {
    if (audioBase64) {
        try {
            const result = await playAudio(
                audioBase64,
                session
            );

            if (result) {
                return true;
            }
        } catch (error) {
            console.error(
                "[TTS] Provided audio error:",
                error
            );
        }
    }

    return await runSession(
        String(text),
        language,
        session
    );
} finally {
    finishSession(session);
}

}

export function stopVoice() {
if (activeSession) {
activeSession.cancelled = true;
activeSession = null;
}

if (activeAudio) {
    try {
        activeAudio.pause();
        activeAudio.currentTime = 0;
    } catch (error) {
        console.log(
            "[TTS] Active audio stop error:",
            error
        );
    }

    activeAudio = null;
}

try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
} catch (error) {
    console.log(
        "[TTS] Stop error:",
        error
    );
}

}

export default {
unlockVoice,
speakText,
speakTextWithBhashini,
speakHelper,
stopVoice
};