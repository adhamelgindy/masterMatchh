<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { module, zulassungsdaten } from './requirements/Wirtschaftsingenieurwesen_Projektmanagement.js';

const pdfFile = ref(null);
const analysis = ref('');
const selectedCourse = ref('');
const loading = ref(false);
const error = ref('');
const userMessage = ref('');
const chatActive = ref(false);
const chatHistory = ref([]);
const step = ref(1); // 1: Upload PDF, 2: Select Master + Credits, 3: Show Results
const bachelorCredits = ref(0);
const hasTotalCredits = ref(false); // Initialize as false
const pdfText = ref('');


const masterCourses = {
  // Add your master courses object here if needed
};

const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;

async function handleFileUpload(event) {
  pdfFile.value = event.target.files[0];
  resetAnalysis();

  try {
    loading.value = true;
    const extractedText = await extractTextFromPdf(pdfFile.value);

    // Save the extracted text for later analysis
    pdfText.value = extractedText;

    // Check if total credits are in the extracted text
    const regex = /\b(18[0-9]|19[0-9]|2[0-3][0-9]|240)\b/;
    hasTotalCredits.value = regex.test(extractedText);

    step.value = 2; // Go to master + credits input step
  } catch (err) {
    console.error(err);
    error.value = 'Failed to extract text from the PDF. Please try another file.';
  } finally {
    loading.value = false;
  }
}


async function extractTextFromPdf(file) {
  console.log('Extracting text from PDF:', file.name);
  
  const apiKey = import.meta.env.VITE_PDF_ANALYZER_API_KEY;
  
  try {
    const getUrlResponse = await axios.get(
      `https://api.pdf.co/v1/file/upload/get-presigned-url?name=${encodeURIComponent(file.name)}&contenttype=application/octet-stream`,
      { headers: { 'x-api-key': apiKey } }
    );
    const { presignedUrl, url: uploadedFileUrl } = getUrlResponse.data;

    await axios.put(presignedUrl, file, {
      headers: { 'Content-Type': 'application/octet-stream' }
    });

    const extractResponse = await axios.post(
      'https://api.pdf.co/v1/pdf/convert/to/text',
      { name: file.name, password: '', pages: '', url: uploadedFileUrl },
      { headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' } }
    );
    const textFileUrl = extractResponse.data.url;
    const textFileResponse = await axios.get(textFileUrl);
    return textFileResponse.data;
  } catch (err) {
    console.error('PDF Extraction Error:', err.response ? err.response.data : err.message);
    throw new Error('Failed to process PDF.');
  }
}

async function submitMasterAndCredits() {
  if (!selectedCourse.value) {
    error.value = 'Please select a master course.';
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    const text = pdfText.value; // Use already extracted text

    // Validate credits if not detected
    if (!hasTotalCredits.value && bachelorCredits.value === 0) {
      error.value = 'Please enter your total bachelor credits.';
      loading.value = false;
      return;
    }

    step.value = 3;
    await analyzeRequirements(text);
  } catch (err) {
    console.error(err);
    error.value = 'There was an error processing your request.';
  } finally {
    loading.value = false;
  }
}


async function analyzeRequirements(text) {
  let creditInfo = '';
  if (hasTotalCredits.value) {
    creditInfo = 'The credit points were automatically detected from the PDF.';
  } else {
    creditInfo = `The student has reported ${bachelorCredits.value} credit points.`;
    text += `\n\nTotal Credit Points: ${bachelorCredits.value}`;
  }

  const prompt = `
You are an academic advisor. A student has submitted the following bachelor course content:

"${text}"

${creditInfo}

The student wishes to apply for the master course: "${selectedCourse.value}".

Here are the admission requirements for all available master courses:
"${zulassungsdaten}"

Please analyze and compare the student's bachelor content with the requirements of the selected master course.

Your response should be structured in the following way:

1. Total Credit Points: 
   - First, verify the total number of credit points (must be between 180-240 CPs)
#
2. Master Course Requirements: 
   - Clearly list the required credit points and subject distribution for "${selectedCourse.value}"

3. Gap Analysis: 
   - State how many credit points are missing (if any) and in which areas

4. Course Recommendations: 
   - Recommend modules from this list to fulfill missing credits:
     "${module}"
   - For each recommendation, indicate whether it belongs to:
     - Ingenieurwissenschaften
     - Betriebswirtschaften
     - Bautechnisch

Please provide clear, structured advice.
`;

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    },
    {
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      }
    }
  );

  analysis.value = response.data.choices[0].message.content;
  chatActive.value = true;
  chatHistory.value = [
    { role: 'assistant', content: response.data.choices[0].message.content }
  ];
}

async function sendMessage() {
  if (!userMessage.value.trim()) return;

  const userInput = userMessage.value.trim();
  chatHistory.value.push({ role: 'user', content: userInput });
  userMessage.value = '';

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: chatHistory.value,
      },
      {
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        }
      }
    );
    chatHistory.value.push({ role: 'assistant', content: response.data.choices[0].message.content });
  } catch (err) {
    console.error(err);
    error.value = 'There was an error during chatting.';
  }
}

function resetAnalysis() {
  analysis.value = '';
  error.value = '';
  chatActive.value = false;
  chatHistory.value = [];
}
</script>

<template>
  <div style="max-width: 600px; margin: 50px auto; padding: 30px; border-radius: 15px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); background: linear-gradient(135deg, #f9f9f9, #e0e0e0); font-family: 'Arial', sans-serif; text-align: center;">
    
    <!-- Step 1: PDF Upload -->
    <div v-if="step === 1">
      <h2 style="margin-bottom: 20px; color: #333;">Upload Your Course Notes (PDF)</h2>
      <input type="file" @change="handleFileUpload" accept="application/pdf" :disabled="loading"
        style="margin-bottom: 20px; padding: 10px; border: 1px solid #ccc; border-radius: 8px; width: 100%; background-color: #fff;" />
    </div>

    <!-- Loading Spinner -->
    <div v-if="loading" style="margin-top: 20px;">
      <div class="spinner"></div>
      <p style="margin-top: 10px; color: #555;">Uploading and processing PDF...</p>
    </div>


    <!-- Step 2: Master Selection and Credits Input -->
    <div v-if="step === 2">
      <h2 style="margin-bottom: 20px; color: #333;">Select Your Desired Master's Program</h2>

      <select v-model="selectedCourse"
        style="margin-bottom: 20px; padding: 10px; border: 1px solid #ccc; border-radius: 8px; width: 100%; background-color: #fff;">
        <option disabled value="">Select a course</option>
        <option value="Berufs- und Technikpädagogik (M.A.) 210KP">Berufs- und Technikpädagogik (M.A.) 210KP</option>
        <option value="Wirtschaftsingenieurwesen/Bautechnik und -management">Wirtschaftsingenieurwesen/Bautechnik und -management</option>
        <option value="Wirtschaftsingenieurwesen/Maschinenbau">Wirtschaftsingenieurwesen/Maschinenbau</option>
        <option value="Wirtschaftsingenieurwesen/Projektmanagement">Wirtschaftsingenieurwesen/Projektmanagement</option>
      </select>

      <!-- Only show credits input if hasTotalCredits is false -->
      <div v-if="!hasTotalCredits">
        <h3 style="margin-bottom: 15px; color: #333;">Enter Your Total Bachelor Credits</h3>
        <input
          type="number"
          v-model.number="bachelorCredits"
          placeholder="Enter Bachelor Credits (180-240)"
          min="180"
          max="240"
          style="margin-bottom: 20px; padding: 10px; border: 1px solid #ccc; border-radius: 8px; width: 100%; background-color: #fff;"
        />
      </div>

      <button @click="submitMasterAndCredits" :disabled="loading"
        style="margin-bottom: 30px; padding: 12px 25px; background: linear-gradient(135deg, #4caf50, #81c784); border: none; border-radius: 25px; color: white; font-size: 16px; cursor: pointer; transition: background 0.3s;">
        {{ loading ? 'Processing...' : 'Continue to Analysis' }}
      </button>
    </div>

    <!-- Step 3: Results Display -->
    <div v-if="step === 3">
      <div v-if="loading" style="margin-top: 20px;">
        <div style="border: 4px solid #f3f3f3; border-top: 4px solid #4caf50; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
      </div>

      <div v-if="analysis" style="text-align: left; background: #fff; padding: 20px; border-radius: 10px; margin-top: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); color: #333;">
        <strong>Analysis Result:</strong>
        <p style="white-space: pre-wrap;">{{ analysis }}</p>

        <div v-if="chatActive" style="margin-top: 20px;">
          <h3>Ask Follow-up Questions 📚</h3>
          <div v-for="(msg, index) in chatHistory" :key="index"
            style="background-color: #f0f0f0; padding: 10px; border-radius: 10px; margin-bottom: 10px;">
            <strong v-if="msg.role === 'user'">You:</strong>
            <strong v-else>Advisor:</strong>
            {{ msg.content }}
          </div>

          <input v-model="userMessage" @keyup.enter="sendMessage" placeholder="Type your question here..."
            style="width: 100%; padding: 10px; margin-top: 10px; border-radius: 10px; border: 1px solid #ccc;" />
          <button @click="sendMessage"
            style="margin-top: 10px; padding: 10px 20px; border-radius: 10px; background-color: #4caf50; color: white; border: none;">Send</button>
        </div>
      </div>
    </div>

    <p v-if="error" style="color: red; margin-top: 20px;">⚠️ {{ error }}</p>
  </div>
</template>

<style scoped>
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>

<style scoped>
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4caf50;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>