<template>
  <div class="chatbot-container">
    <div class="chat-header">
      <div class="chatbot-avatar">🤖</div>
      <div>
        <h1>Master-Studienberatung</h1>
        <p>Hallo! Lass uns gemeinsam deine Studienoptionen besprechen.</p>
      </div>
    </div>

    <div class="chat-messages" ref="messagesContainer">
      <!-- Welcome message -->
      <div class="message bot">
        <div class="avatar">🤖</div>
        <div class="message-content">
          <p>Hallo! Ich helfe dir bei der Auswahl deines Master-Studiengangs. Lass uns Schritt für Schritt vorgehen.</p>
        </div>
      </div>

      <!-- Dynamic messages -->
      <template v-for="(message, index) in chatMessages" :key="index">
        <div :class="['message', message.sender]">
          <div class="avatar" v-if="message.sender === 'bot'">🤖</div>
          <div class="avatar" v-else>👤</div>
          <div class="message-content">
            <p>{{ message.text }}</p>
            <div v-if="message.typing" class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>

        <!-- Options or input field -->
        <div v-if="message.showOptions" class="options-container">
          <button v-for="(option, optIndex) in message.options" 
                  :key="optIndex"
                  @click="selectOption(option, message.field)"
                  class="option-button"
                  :class="{ selected: isOptionSelected(option, message.field) }">
            {{ option }}
          </button>
          <button v-if="message.multiSelect" @click="confirmSelection(message.field)" 
                  class="confirm-button" :disabled="!hasSelection(message.field)">
            Bestätigen
          </button>
        </div>

        <div v-if="message.showInput" class="input-container">
          <input v-model="form[message.field]" 
                @keyup.enter="nextQuestion" 
                type="text" 
                class="input-field" 
                :placeholder="message.placeholder || 'Deine Antwort...'" />
          <button @click="nextQuestion" class="send-button">Senden</button>
        </div>
      </template>

      <!-- Completion message -->
      <div v-if="surveyComplete" class="message bot">
        <div class="avatar">🤖</div>
        <div class="message-content">
          <p>Vielen Dank für deine Antworten! 🎓</p>
          <div v-if="form.hasAllCredits === 'Nein'" class="summary">
            <p><strong>Zusammenfassung:</strong></p>
            <p>Du interessierst dich für <strong>{{ form.masterProgram }}</strong>.</p>
            <p v-if="form.missingCredits.length">Fehlende Credits in: <strong>{{ form.missingCredits.join(', ') }}</strong></p>
          </div>
          <section class="contact-info">
            <h2>Kontaktinformationen</h2>
            <p class="intro">Bei weiteren Fragen kannst du dich jederzeit melden. Viel Erfolg bei deinem Master!</p>
        
            <div class="contact-card">
              <h3>Allgemeine Anfragen</h3>
              <p><strong>Email:</strong> <a href="mailto:fb1-dekanat@bht-berlin.de">fb1-dekanat@bht-berlin.de</a></p>
              <p><strong>Adresse:</strong> Haus Gauß, Raum B 532</p>
              <p><strong>Telefon:</strong> <a href="tel:+493045045810">030 4504-5810</a></p>
            </div>
        
            <div class="contact-card">
              <h3>Prof. Dr.-Ing. Dieter Pumpe</h3>
              <p><strong>Email:</strong> <a href="mailto:dieter.pumpe@bht-berlin.de">dieter.pumpe@bht-berlin.de</a></p>
              <p><strong>Adresse:</strong> Haus Gauß, B 530</p>
              <p><strong>Telefon:</strong> <a href="tel:+493045042422">030 4504-2422</a></p>
            </div>
        
            <div class="contact-card">
              <h3>Prof. Dr. rer. pol. Hans Schmitz</h3>
              <p><strong>Email:</strong> <a href="mailto:hans.schmitz@bht-berlin.de">hans.schmitz@bht-berlin.de</a></p>
              <p><strong>Adresse:</strong> Haus Gauß, B 230</p>
              <p><strong>Telefon:</strong> <a href="tel:+493045045261">030 4504-5261</a></p>
            </div>
        
            <div class="contact-card">
              <h3>Prof. Michael Müller</h3>
              <p><strong>Email:</strong> <a href="mailto:michael.mueller@bht-berlin.de">michael.mueller@bht-berlin.de</a></p>
              <p><strong>Adresse:</strong> Haus Gauß, B 250</p>
              <p><strong>Telefon:</strong> <a href="tel:+493045042154">030 4504-2154</a></p>
            </div>
          </section>
        </div>
      </div>
    </div>

    <div v-if="isTyping" class="typing-status">
      <p>Berater schreibt...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, nextTick, onMounted } from 'vue'

const form = reactive({
  masterProgram: '',
  bachelorDegree: '',
  degreeOrigin: '',
  languageLevel: '',
  hasAllCredits: '',
  missingCredits: [],
  researchTime: '',
  infoSource: '',
  websiteLink: '',
  courseTiming: '',
  timingReason: '',
  semester: '',
  communication: '',
  communicationReason: ''
})

const missingAreas = [
  'Ingenieurswissenschaften',
  'Betriebswissenschaften',
  'Bautechnisch',
  'Wirtschaftswissenschaften'
]

const currentQuestionIndex = ref(0)
const surveyComplete = ref(false)
const isTyping = ref(false)
const chatMessages = ref([])
const messagesContainer = ref(null)

const questions = [
  {
    text: "Welchen Master-Studiengang möchtest du studieren? Ich habe diese Optionen für dich:",
    options: [
      "Berufs- und Technikpädagogik (M.A.)",
      "Management und Consulting",
      "Wirtschaftsingenieurwesen/Bautechnik und -management",
      "Wirtschaftsingenieurwesen/Maschinenbau",
      "Wirtschaftsingenieurwesen/Projektmanagement"
    ],
    field: "masterProgram",
    botDelay: 1000
  },
  {
    text: "Interessant! Und welchen Bachelor-Abschluss hast du bereits gemacht?",
    input: true,
    field: "bachelorDegree",
    placeholder: "z.B. B.Sc. Maschinenbau",
    botDelay: 800
  },
  {
    text: "Wie viel Kreditpunkte hast du in deinem Bachelor-Abschluss?",
    options: ["150 ECTS", "180 ECTS", "210 ECTS", "240 ECTS"],
    input: true,
    field: "Credits",
    placeholder: "180 ECTS",
    botDelay: 800
  },
  {
    text: "War dein Bachelor-Abschluss im Inland oder Ausland?",
    options: ["Inland", "Ausland"],
    field: "degreeOrigin",
    botDelay: 700
  },
  {
    text: "Da dein Abschluss aus dem Ausland kommt, welches Sprachniveau hast du in Deutsch/Englisch?",
    input: true,
    field: "languageLevel",
    placeholder: "z.B. Deutsch C1, Englisch B2",
    showIf: () => form.degreeOrigin === 'Ausland',
    botDelay: 600
  },
  {
    text: "Hast du bereits alle benötigten Credits für den Master?",
    options: ["Ja", "Nein"],
    field: "hasAllCredits",
    botDelay: 700
  },
  {
    text: "In welchen Bereichen fehlen dir Credits? (Mehrfachauswahl möglich)",
    options: missingAreas,
    field: "missingCredits",
    multiSelect: true,
    showIf: () => form.hasAllCredits === 'Nein',
    botDelay: 1200
  },
  {
    text: "Wie viel Zeit hast du etwa für die Informationsrecherche investiert?",
    input: true,
    field: "researchTime",
    placeholder: "z.B. 2 Wochen, 10 Stunden",
    showIf: () => form.hasAllCredits === 'Nein',
    botDelay: 800
  },
  {
    text: "Welche Informationsquellen hast du genutzt?",
    options: ["Hochschulwebsite", "Studienfachberater"],
    field: "infoSource",
    showIf: () => form.hasAllCredits === 'Nein',
    botDelay: 700
  },
  {
    text: "Hast du einen spezifischen Link zur Information? (Falls vorhanden)",
    input: true,
    field: "websiteLink",
    placeholder: "https://...",
    showIf: () => form.hasAllCredits === 'Nein',
    botDelay: 600
  },
  {
    text: "Wie schätzt du den Zeitplan für die benötigten Kurse ein?",
    options: ["Sehr gut", "Gut", "Schlecht"],
    field: "courseTiming",
    showIf: () => form.hasAllCredits === 'Nein',
    botDelay: 900
  },
  {
    text: "Kannst du mir sagen, warum du den Zeitplan als schlecht empfindest?",
    input: true,
    field: "timingReason",
    showIf: () => form.hasAllCredits === 'Nein' && form.courseTiming === 'Schlecht',
    botDelay: 600
  },
  {
    text: "In welchem Semester planst du die Aufbaukurse?",
    options: ["Semester 1", "Semester 2", "Semester 3", "Andere"],
    field: "semester",
    showIf: () => form.hasAllCredits === 'Nein',
    botDelay: 800
  },
  {
    text: "Wie war die Kommunikation mit der Studienberatung?",
    options: ["Sehr gut", "Gut", "Schlecht"],
    field: "communication",
    showIf: () => form.hasAllCredits === 'Nein',
    botDelay: 700
  },
  {
    text: "Was war das Problem mit der Kommunikation?",
    input: true,
    field: "communicationReason",
    showIf: () => form.hasAllCredits === 'Nein' && form.communication === 'Schlecht',
    botDelay: 600
  }
]

function isOptionSelected(option, field) {
  if (field === 'missingCredits') {
    return form.missingCredits.includes(option)
  }
  return form[field] === option
}

function hasSelection(field) {
  if (field === 'missingCredits') {
    return form.missingCredits.length > 0
  }
  return form[field] !== ''
}

function selectOption(option, field) {
  if (field === 'missingCredits') {
    const index = form.missingCredits.indexOf(option)
    if (index === -1) {
      form.missingCredits.push(option)
    } else {
      form.missingCredits.splice(index, 1)
    }
  } else {
    form[field] = option
    if (!questions[currentQuestionIndex.value].multiSelect) {
      nextQuestion()
    }
  }
}

function confirmSelection(field) {
  if (hasSelection(field)) {
    nextQuestion()
  }
}

async function nextQuestion() {
  // Add user's response to chat
  const currentQuestion = questions[currentQuestionIndex.value]
  if (currentQuestion.input) {
    chatMessages.value.push({
      sender: 'user',
      text: form[currentQuestion.field] || '(Keine Angabe)'
    })
  } else if (currentQuestion.multiSelect) {
    chatMessages.value.push({
      sender: 'user',
      text: form.missingCredits.join(', ') || 'Keine Bereiche ausgewählt'
    })
  } else {
    chatMessages.value.push({
      sender: 'user',
      text: form[currentQuestion.field] || '(Keine Auswahl)'
    })
  }

  scrollToBottom()

  // Move to next question
  currentQuestionIndex.value++
  
  // Find next question that should be shown
  while (currentQuestionIndex.value < questions.length) {
    const question = questions[currentQuestionIndex.value]
    if (!question.showIf || question.showIf()) {
      break
    }
    currentQuestionIndex.value++
  }

  if (currentQuestionIndex.value < questions.length) {
    await askQuestion(questions[currentQuestionIndex.value])
  } else {
    surveyComplete.value = true
    scrollToBottom()
  }
}

async function askQuestion(question) {
  isTyping.value = true
  
  // Add bot message with typing indicator
  chatMessages.value.push({
    sender: 'bot',
    text: question.text,
    typing: true
  })
  
  scrollToBottom()
  
  // Simulate typing delay
  await new Promise(resolve => setTimeout(resolve, question.botDelay || 800))
  
  // Replace with final message and show options/input
  chatMessages.value[chatMessages.value.length - 1] = {
    sender: 'bot',
    text: question.text,
    showOptions: question.options !== undefined,
    options: question.options,
    field: question.field,
    multiSelect: question.multiSelect,
    showInput: question.input,
    placeholder: question.placeholder
  }
  
  isTyping.value = false
  scrollToBottom()
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// Start the survey when component mounts
onMounted(async () => {
  await new Promise(resolve => setTimeout(resolve, 1500)) // Initial delay
  await askQuestion(questions[0])
})
</script>

<style scoped>
.chatbot-container {
  max-width: 500px;
  margin: 2rem auto;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  background-color: #f9f9f9;
  font-family: 'Segoe UI', Roboto, sans-serif;
  display: flex;
  flex-direction: column;
  height: 80vh;
}

.chat-header {
  background-color: #4f46e5;
  color: white;
  padding: 1.2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.chatbot-avatar {
  font-size: 1.8rem;
  background-color: #6366f1;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-header h1 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
}

.chat-header p {
  margin: 0.3rem 0 0;
  opacity: 0.9;
  font-size: 0.9rem;
}

.chat-messages {
  flex: 1;
  padding: 1.2rem;
  overflow-y: auto;
  background-color: #f0f2f5;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.message {
  display: flex;
  gap: 0.8rem;
  max-width: 85%;
}

.message.bot {
  align-self: flex-start;
}

.message.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.avatar {
  font-size: 1.2rem;
  flex-shrink: 0;
  margin-top: 0.2rem;
}

.message-content {
  padding: 0.8rem 1.2rem;
  border-radius: 1.2rem;
  line-height: 1.4;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.message.bot .message-content {
  background-color: white;
  color: #333;
  border-top-left-radius: 0;
}

.message.user .message-content {
  background-color: #4f46e5;
  color: white;
  border-top-right-radius: 0;
}

.options-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin: 0.5rem 0 1rem 3rem;
}

.option-button {
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 1.2rem;
  padding: 0.6rem 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.option-button:hover {
  background-color: #f0f0f0;
}

.option-button.selected {
  background-color: #4f46e5;
  color: white;
  border-color: #4f46e5;
}

.confirm-button {
  background-color: #4f46e5;
  color: white;
  border: none;
  border-radius: 1.2rem;
  padding: 0.6rem 1.2rem;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-top: 0.5rem;
}

.confirm-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.input-container {
  display: flex;
  gap: 0.5rem;
  margin: 0.5rem 0 1rem 3rem;
}

.input-field {
  flex: 1;
  padding: 0.8rem 1rem;
  border: 1px solid #ddd;
  border-radius: 1.2rem;
  outline: none;
  font-size: 0.9rem;
}

.input-field:focus {
  border-color: #4f46e5;
}

.send-button {
  background-color: #4f46e5;
  color: white;
  border: none;
  border-radius: 1.2rem;
  padding: 0 1.2rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.send-button:hover {
  background-color: #4338ca;
}

.typing-indicator {
  display: flex;
  gap: 0.3rem;
  margin-top: 0.8rem;
}

.typing-indicator span {
  display: inline-block;
  width: 8px;
  height: 8px;
  background-color: #999;
  border-radius: 50%;
  animation: typingAnimation 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typingAnimation {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-5px); }
}

.typing-status {
  padding: 0.5rem 1.2rem;
  background-color: #f0f2f5;
  border-top: 1px solid #e0e0e0;
  font-size: 0.8rem;
  color: #666;
}

.summary {
  background-color: #f0f4ff;
  border-radius: 0.8rem;
  padding: 0.8rem;
  margin: 0.8rem 0;
}

.summary p {
  margin: 0.4rem 0;
}

.chatbot-container {
  max-width: 100% !important; /* Remove max-width constraint */
  width: 100vw; /* Full viewport width */
  margin: 0 !important; /* Remove any margins */
  border-radius: 0 !important; /* Remove rounded corners */
  height: 100vh; /* Full viewport height */
}

.chat-messages {
  height: calc(100vh - 120px) !important; /* Adjust based on header height */
}

/* Optional: Make message bubbles use more horizontal space */
.message {
  max-width: 90% !important;
}

/* Optional: Adjust header to be full width */
.chat-header {
  border-radius: 0 !important;
}

/* Remove any potential body margins */
body {
  margin: 0;
  padding: 0;
  overflow: hidden; /* Prevent scrollbars if not needed */
}

.contact-info {
  background: #f9fafb;
  color: #111827;
  padding: 2rem;
  border-radius: 1rem;
  max-width: 700px;
  margin: 2rem auto;
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.1);
  font-family: 'Segoe UI', sans-serif;
}

.contact-info h2 {
  font-size: 1.8rem;
  margin-bottom: 1rem;
  color: #2563eb;
  text-align: center;
}

.intro {
  text-align: center;
  margin-bottom: 2rem;
}

.contact-card {
  background: white;
  padding: 1rem 1.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  margin-bottom: 1.25rem;
  transition: box-shadow 0.3s ease;
}

.contact-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.07);
}

.contact-card h3 {
  margin-bottom: 0.75rem;
  color: #1f2937;
}

.contact-card p {
  margin: 0.25rem 0;
}

.contact-card a {
  color: #2563eb;
  text-decoration: none;
}

.contact-card a:hover {
  text-decoration: underline;
}
</style>