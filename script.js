const petContainer = document.getElementById('pet-container');
const petSvg = document.getElementById('pet-svg');
const chatWindow = document.getElementById('chat-window');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('typing-indicator');
const startersContainer = document.getElementById('starters-container');
const loadHistoryBtn = document.getElementById('load-history-btn');

const leftEyeShape = document.getElementById('left-eye-shape');
const rightEyeShape = document.getElementById('right-eye-shape');

let petState = 'idle';
let chatHistory = [];
let userName = '';

const SYSTEM_PROMPT = "You are a friendly and helpful AI assistant. Keep your answers simple, positive, and very short. Greet the user warmly and be ready to help.";
const STARTER_PROMPTS = ["Tell me a fun fact", "Give me a creative idea", "Explain a complex topic simply", "Tell me a joke"];

function saveState() {
    localStorage.setItem('aiPetChatHistory', JSON.stringify(chatHistory));
    localStorage.setItem('aiPetUserName', userName);
}

function loadUser() {
    const savedName = localStorage.getItem('aiPetUserName');
    if (savedName) userName = savedName;
}

function setPetState(newState) {
    if (petState === newState) return;
    petState = newState;
    petContainer.className = '';
    petContainer.classList.add(`pet-${newState}`);
    
    switch(newState) {
        case 'happy':
        case 'excited':
            leftEyeShape.setAttribute('d', 'M 35 50 Q 45 45, 55 50');
            rightEyeShape.setAttribute('d', 'M 65 50 Q 75 45, 85 50');
            break;
        case 'sad':
            leftEyeShape.setAttribute('d', 'M 35 50 Q 45 55, 55 50');
            rightEyeShape.setAttribute('d', 'M 65 50 Q 75 55, 85 50');
            break;
        default:
            leftEyeShape.setAttribute('d', 'M 35 50 C 40 45, 50 45, 55 50 C 50 55, 40 55, 35 50');
            rightEyeShape.setAttribute('d', 'M 65 50 C 70 45, 80 45, 85 50 C 80 55, 70 55, 65 50');
            break;
    }
}

function getEmotionFromText(text) {
    const lowerText = text.toLowerCase();
    const happyWords = ['love', 'like', 'awesome', 'great', 'happy', 'thanks', 'cool', 'amazing'];
    const sadWords = ['sad', 'no', 'bad', 'hate', 'problem', 'angry'];
    const excitedWords = ['wow', 'amazing', 'fantastic', 'awesome!'];
    
    if (excitedWords.some(word => lowerText.includes(word))) return 'excited';
    if (happyWords.some(word => lowerText.includes(word))) return 'happy';
    if (sadWords.some(word => lowerText.includes(word))) return 'sad';
    return text.includes('?') ? 'thinking' : 'idle';
}

function addMessage(message, role) {
    const bubble = document.createElement('div');
    bubble.className = role === 'user' ? 'user-bubble' : 'bot-bubble';
    bubble.innerHTML = marked.parse(message);
    
    if (role === 'model') {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.title = 'Copy text';
        copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
        bubble.appendChild(copyBtn);
    }

    chatWindow.appendChild(bubble);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function renderChatHistory() {
    chatWindow.innerHTML = '';
    chatHistory.forEach(msg => addMessage(msg.parts[0].text, msg.role));
}

async function getAIResponse(history) {
    const apiKey = "AIzaSyAjG3fT7YGUjqwLy_Zo4Qhr7JHdyXyNt38";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    const payload = {
        contents: history,
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) { throw new Error(`API Error: ${response.status}`); }
        
        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!text) {
             setPetState('confused');
             return "I'm not sure how to respond to that.";
        }
        return text;
    } catch (error) {
        console.error("AI Fetch Error:", error);
        setPetState('sad');
        return "Sorry, I'm having trouble connecting right now.";
    }
}

function toggleForm(isDisabled) {
    sendBtn.disabled = isDisabled;
    chatInput.disabled = isDisabled;
}

async function processUserMessage(userInput) {
    loadHistoryBtn.classList.add('hidden');
    startersContainer.innerHTML = '';

    addMessage(userInput, 'user');
    chatHistory.push({ role: 'user', parts: [{ text: userInput }] });
    
    toggleForm(true);
    typingIndicator.classList.remove('hidden');
    chatWindow.scrollTop = chatWindow.scrollHeight;

    const initialEmotion = getEmotionFromText(userInput);
    setPetState(initialEmotion === 'idle' ? 'thinking' : initialEmotion);

    const aiResponse = await getAIResponse(chatHistory);
    
    typingIndicator.classList.add('hidden');
    addMessage(aiResponse, 'model');
    chatHistory.push({ role: 'model', parts: [{ text: aiResponse }] });
    saveState();
    setPetState('talking');
    
    toggleForm(false);
    chatInput.focus();
    
    setTimeout(() => {
        const finalEmotion = getEmotionFromText(userInput);
        setPetState(finalEmotion === 'idle' ? 'thinking' : finalEmotion);
    }, 1500);
}

async function handleChatSubmit(e) {
    if (e) e.preventDefault();
    const userInput = chatInput.value.trim();
    if (!userInput) return;
    chatInput.value = '';
    
    loadHistoryBtn.classList.add('hidden');

    if (!userName) {
        userName = userInput;
        saveState();
        
        addMessage(userInput, 'user');
        const welcomeMessage = `Nice to meet you, How can I help you today?`;
        addMessage(welcomeMessage, 'model');
        
        chatHistory.push({ role: 'user', parts: [{ text: userInput }] });
        chatHistory.push({ role: 'model', parts: [{ text: welcomeMessage }] });
        saveState();
        startersContainer.innerHTML = '';
    } else {
        processUserMessage(userInput);
    }
}

function handleLoadHistory() {
    const savedHistory = localStorage.getItem('aiPetChatHistory');
    if (savedHistory) {
        chatHistory = JSON.parse(savedHistory);
        renderChatHistory();
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }
    loadHistoryBtn.classList.add('hidden');
    startersContainer.innerHTML = '';
}

function initialize() {
    loadUser();
    
    const savedHistory = localStorage.getItem('aiPetChatHistory');
    if (savedHistory && savedHistory !== '[]') {
        loadHistoryBtn.classList.remove('hidden');
    }

    chatHistory = [];
    
    if (!userName) {
        const initialMessage = "Hello! I'm Lucent. What's your name?";
        addMessage(initialMessage, 'model');
        chatHistory.push({ role: 'model', parts: [{ text: initialMessage }] });
    } else {
        const welcomeBackMessage = `Welcome back, ${userName}! Ask me anything, or load your previous session.`;
        addMessage(welcomeBackMessage, 'model');
        chatHistory.push({ role: 'model', parts: [{ text: welcomeBackMessage }] });
        
        STARTER_PROMPTS.forEach(prompt => {
            const btn = document.createElement('button');
            btn.className = 'starter-btn';
            btn.textContent = prompt;
            startersContainer.appendChild(btn);
        });
    }

    chatForm.addEventListener('submit', handleChatSubmit);
    loadHistoryBtn.addEventListener('click', handleLoadHistory);
    
    petSvg.addEventListener('click', () => {
        petSvg.classList.add('pet-clicked');
        setTimeout(() => petSvg.classList.remove('pet-clicked'), 400);
    });
    
    startersContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('starter-btn')) {
            processUserMessage(e.target.textContent);
        }
    });

    chatWindow.addEventListener('click', (e) => {
        const copyBtn = e.target.closest('.copy-btn');
        if (copyBtn) {
            const bubble = copyBtn.closest('.bot-bubble');
            const textToCopy = bubble.innerText;
            navigator.clipboard.writeText(textToCopy).then(() => {
                copyBtn.classList.add('copied');
                copyBtn.title = 'Copied!';
                setTimeout(() => {
                    copyBtn.classList.remove('copied');
                    copyBtn.title = 'Copy text';
                }, 2000);
            });
        }
    });

    setPetState('idle');
}

initialize();