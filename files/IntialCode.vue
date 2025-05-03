<template>

    <div class="form-container">
  
      <link>AI Voice Generator & Text to Speech | ElevenLabs</link>
  
      <h1 class="form-title">Master Studiengang Umfrage</h1>
  
      <form @submit.prevent="handleSubmit" class="form">
  
        <!-- Master Program -->
  
        <div class="form-group">
  
          <label>Welchen Master Studiengang möchtest du studieren?</label>
  
          <select v-model="form.masterProgram" class="form-control">
  
            <option disabled value="">Bitte auswählen</option>
  
            <option>Berufs- und Technikpädagogik (M.A.)</option>
  
            <option>Management und Consulting</option>
  
            <option>Wirtschaftsingenieurwesen/Bautechnik und -management</option>
  
            <option>Wirtschaftsingenieurwesen/Maschinenbau</option>
  
            <option>Wirtschaftsingenieurwesen/Projektmanagement</option>
  
          </select>
  
        </div>
  
  
        <!-- Bachelor Degree -->
  
        <div class="form-group">
  
          <label>Welchen Bachelor Abschluss (inkl. Credits)?</label>
  
          <input v-model="form.bachelorDegree" type="text" class="form-control" />
  
        </div>
  
  
  
        <!-- Degree Origin -->
  
        <div class="form-group">
  
          <label>Bachelorabschluss Inland oder Ausland?</label>
  
          <select v-model="form.degreeOrigin" class="form-control">
  
            <option>Inland</option>
  
            <option>Ausland</option>
  
          </select>
  
        </div>
  
  
  
        <!-- Language Level -->
  
        <div v-if="form.degreeOrigin === 'Ausland'" class="form-group">
  
          <label>Sprachniveau (Deutsch/Englisch)</label>
  
          <input v-model="form.languageLevel" type="text" class="form-control" />
  
        </div>
  
  
  
        <!-- All Credits -->
  
        <div class="form-group">
  
          <label>Hattet ihr alle benötigten Credits?</label>
  
          <select v-model="form.hasAllCredits" class="form-control">
  
            <option>Ja</option>
  
            <option>Nein</option>
  
          </select>
  
        </div>
  
  
  
        <!-- Missing Areas -->
  
        <div v-if="form.hasAllCredits === 'Nein'" class="form-group">
  
          <label>In welchem Bereich fehlende Credits:</label>
  
          <div v-for="area in missingAreas" :key="area" class="checkbox-group">
  
            <label>
  
              <input type="checkbox" v-model="form.missingCredits" :value="area" />
  
              {{ area }}
  
            </label>
  
          </div>
  
        </div>
  
  
  
        <!-- Thank you -->
  
        <div v-if="form.hasAllCredits === 'Ja'" class="form-group success-message">
  
          <p>Danke für deine Teilnahme, Tschüssi!</p>
  
        </div>
  
  
  
        <!-- Additional Questions -->
  
        <template v-if="form.hasAllCredits === 'Nein'">
  
          <div class="form-group">
  
            <label>Wie viel Zeit hast du für die Info-Recherche investiert?</label>
  
            <input v-model="form.researchTime" type="text" class="form-control" />
  
          </div>
  
  
  
          <div class="form-group">
  
            <label>Welche Infoquelle hast du verwendet?</label>
  
            <select v-model="form.infoSource" class="form-control">
  
              <option>Hochschulwebsite</option>
  
              <option>Studienfachberater</option>
  
            </select>
  
          </div>
  
  
  
          <div class="form-group">
  
            <label>Link (wenn vorhanden)</label>
  
            <input v-model="form.websiteLink" type="text" class="form-control" />
  
          </div>
  
  
  
          <div class="form-group">
  
            <label>Wann müssen die Kurse absolviert werden?</label>
  
            <select v-model="form.courseTiming" class="form-control">
  
              <option>Sehr gut</option>
  
              <option>Gut</option>
  
              <option>Schlecht</option>
  
            </select>
  
          </div>
  
  
  
          <div v-if="form.courseTiming === 'Schlecht'" class="form-group">
  
            <label>Warum schlecht?</label>
  
            <input v-model="form.timingReason" type="text" class="form-control" />
  
          </div>
  
  
  
          <div class="form-group">
  
            <label>Wann machst du die Aufbaukurse?</label>
  
            <select v-model="form.semester" class="form-control">
  
              <option>Semester 1</option>
  
              <option>Semester 2</option>
  
              <option>Semester 3</option>
  
              <option>Andere</option>
  
            </select>
  
          </div>
  
  
  
          <div class="form-group">
  
            <label>Wie war die Kommunikation?</label>
  
            <select v-model="form.communication" class="form-control">
  
              <option>Sehr gut</option>
  
              <option>Gut</option>
  
              <option>Schlecht</option>
  
            </select>
  
          </div>
  
  
  
          <div v-if="form.communication === 'Schlecht'" class="form-group">
  
            <label>Warum schlecht?</label>
  
            <input v-model="form.communicationReason" type="text" class="form-control" />
  
          </div>
  
        </template>
  
  
  
        <button type="submit" class="submit-button">Absenden</button>
  
      </form>
  
  
  
      <div v-if="submitted" class="result">
  
        <h2>Auswertung</h2>
  
        <p><strong>Studiengang:</strong> {{ form.masterProgram }}</p>
  
        <p><strong>Fehlende Credits:</strong> {{ form.missingCredits.join(', ') || 'Keine' }}</p>
  
        <p><strong>Empfohlene Aufbaukurse in:</strong> {{ form.missingCredits.join(', ') || 'Keine notwendig' }}</p>
  
      </div>
  
    </div>
  
  </template>
  
  
  
  <script setup>
  
  import { ref } from 'vue'
  
  
  
  const form = ref({
  
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
  
  
  
  const submitted = ref(false)
  
  
  
  function handleSubmit() {
  
    submitted.value = true
  
  }
  
  </script>
  
  
  
  <style scoped>
  .form-container {
  
    background-color: #1f2937;
  
    color: #f3f4f6;
  
    padding: 2rem;
  
    border-radius: 1rem;
  
    max-width: 800px;
  
    margin: auto;
  
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.4);
  
  }
  
  
  
  .form-title {
  
    font-size: 2rem;
  
    font-weight: bold;
  
    margin-bottom: 1.5rem;
  
    text-align: center;
  
  }
  
  
  
  .form-group {
  
    margin-bottom: 1.25rem;
  
  }
  
  
  
  label {
  
    display: block;
  
    font-weight: 600;
  
    margin-bottom: 0.5rem;
  
  }
  
  
  
  .form-control {
  
    width: 100%;
  
    padding: 0.6rem;
  
    background-color: #374151;
  
    border: 1px solid #4b5563;
  
    border-radius: 0.5rem;
  
    color: #f9fafb;
  
    outline: none;
  
  }
  
  
  
  .form-control:focus {
  
    border-color: #60a5fa;
  
  }
  
  
  
  .checkbox-group {
  
    margin: 0.3rem 0;
  
  }
  
  
  
  .success-message {
  
    color: #10b981;
  
    font-weight: 600;
  
  }
  
  
  
  .submit-button {
  
    background-color: #2563eb;
  
    color: white;
  
    padding: 0.7rem 1.2rem;
  
    border: none;
  
    border-radius: 0.6rem;
  
    cursor: pointer;
  
    transition: background-color 0.3s ease;
  
    margin-top: 1rem;
  
  }
  
  
  
  .submit-button:hover {
  
    background-color: #1d4ed8;
  
  }
  
  
  
  .result {
  
    margin-top: 2rem;
  
    border-top: 1px solid #4b5563;
  
    padding-top: 1.5rem;
  
  }
  </style>