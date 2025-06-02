<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { zulassungsdaten, Studiengange, pdfText as myBachelorNote  } from './requirements/Wirtschaftsingenieurwesen_Projektmanagement.js';
import emailjs from '@emailjs/browser';
import bachelors from './requirements/bachelorabschluesse_data_cleaned.json';
import module from './requirements/module_data_with_type.json';


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
const selectedCity = ref('');
const userEmail = ref('');
const emailSent = ref(false);
const emailLoading = ref(false);
const selectedLanguage = ref('en'); 



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
  // console.log('Extracting text from PDF:', file.name);
  // return myBachelorNote;
  
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

if (!selectedCity.value) {
  error.value = 'Please select the city where you completed your bachelor’s degree.';
  loading.value = false;
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

  // Stringify only if your data is JSON-like
  const bachelorsStr = typeof bachelors === 'object' ? JSON.stringify(bachelors).slice(0, 2000) : bachelors;
  const zulassungsdatenStr = typeof zulassungsdaten === 'object' ? JSON.stringify(zulassungsdaten).slice(0, 2000) : zulassungsdaten;
  const moduleStr = typeof module === 'object' ? JSON.stringify(module).slice(0, 2000) : module;

  const prompt = ` 
You are an academic advisor. A student has submitted the following bachelor course content: "${text}" and the total number of earned credit points: ${creditInfo} (must be between 180-240 CPs).
The student wishes to apply for the master course: "${selectedCourse.value}".

Here are the admission requirements for all available master courses: "${zulassungsdatenStr}".

The student's bachelor program is: "${bachelorsStr}".

Please do the following:
1. Calculate the missing credit points by subtracting the student's credit points (${creditInfo}) from 210. Show the result as a number.
2. Clearly list the admission requirements for the selected master course: "${selectedCourse.value}".
3. Recommend one suitable module for every 5 missing credit points, selected from this list: "${moduleStr}".
   - For each recommended module, indicate which category it belongs to (Ingenieurwissenschaften, Betriebswirtschaften, Bautechnisch).
   - Format each module like this: "Module Name (Category, X CPs)".

Your response should be in ${selectedLanguage.value === 'de' ? 'German' : 'English'} and follow this format:

**Hello [first name of the student], here is the analysis of your bachelor program:**

**1. Total missing credit points** = [calculated number]

**2. Admission requirements for "${selectedCourse.value}":**
   - [list requirements clearly]

**3. Recommended modules:**
   - [module 1]
   - [module 2]
   - ...

**Good luck! MasterMatch.**
`;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        }
      }
    );

    // Convert Markdown to HTML for better display
    const formattedResponse = response.data.choices[0].message.content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic text
      .replace(/\n/g, '<br>'); // Line breaks

    analysis.value = formattedResponse;
    chatActive.value = true;
    chatHistory.value = [
      { role: 'assistant', content: response.data.choices[0].message.content }
    ];
  } catch (error) {
    console.error('❌ Error during analysis:', error);
    analysis.value = 'An error occurred while analyzing the requirements. Please try again.';
  }
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



async function sendEmail() {
  if (!userEmail.value || !analysis.value) {
    error.value = 'Please enter a valid email.';
    return;
  }

  emailLoading.value = true; // Start loading

  try {
    const result = await emailjs.send(
      import.meta.env.VITE_EMAILJS_SERVICE_ID,
      import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
      {
        to_email: userEmail.value,
        message: analysis.value,
      },
      import.meta.env.VITE_EMAILJS_KEY
    );

    console.log('Email sent!', result.status);
    emailSent.value = true;
  } catch (err) {
    console.error('Email sending failed:', err);
    error.value = 'Failed to send email. Try again later.';
  } finally {
    emailLoading.value = false; // Stop loading
  }
}


</script>

<template>
  <div style="max-width: 600px; margin: 50px auto; padding: 30px; border-radius: 15px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); background: linear-gradient(135deg, #f0f8ff, #e6f2ff); font-family: 'Segoe UI', Arial, sans-serif; text-align: center;">
   
    <!-- Header -->
    <div style="margin-bottom: 25px;">
      <h1 style="color: #2c5282; font-size: 24px; margin-bottom: 5px;">Course Credit Analysis Tool</h1>
      <p style="color: #4a5568; font-size: 14px; margin-top: 0;">Discover Your Master's Program Eligibility</p>
    </div>
    
    <!-- Progress Bar -->
    <div style="margin-bottom: 30px; position: relative;">
      <div style="height: 6px; background-color: #cbd5e0; border-radius: 3px; width: 100%;">
        <div :style="`width: ${(step/3)*100}%; height: 6px; background: linear-gradient(90deg, #3182ce, #63b3ed); border-radius: 3px; transition: width 0.5s ease;`"></div>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 8px;">
        <span style="color: #4a5568; font-size: 12px;">Upload</span>
        <span style="color: #4a5568; font-size: 12px;">Program</span>
        <span style="color: #4a5568; font-size: 12px;">Results</span>
      </div>
    </div>

    <!-- Step 1: PDF Upload -->
    <div v-if="step === 1" style="transition: all 0.3s ease;">
      <div style="background-color: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
        <div style="margin-bottom: 20px;">
           <img src="/logoMM.png" alt="logo" style="width: 10rem; margin-bottom: 20px; border-radius: 10%;" />
        </div>
        <h2 style="margin-bottom: 15px; color: #2c5282; font-size: 18px;">Upload Your Course Notes</h2>
        
        <label for="fileUpload" style="display: block; cursor: pointer; padding: 15px; background: linear-gradient(135deg, #ebf4ff, #bee3f8); border: 1px dashed #3182ce; border-radius: 8px; transition: all 0.3s ease;">
          <span style="color: #2b6cb0; font-weight: 500;">Click to upload PDF here</span>
          <input id="fileUpload" type="file" @change="handleFileUpload" accept="application/pdf" :disabled="loading"
            style="opacity: 0; position: absolute; z-index: -1;" />
        </label>
      </div>
    </div>

    <!-- Loading Spinner -->
    <div v-if="loading" style="margin-top: 20px;">
      <div style="border: 3px solid #ebf8ff; border-top: 3px solid #3182ce; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
      <p style="margin-top: 10px; color: #4a5568; font-size: 14px;">Processing your document...</p>
    </div>

    <!-- Step 2: Master Selection and Credits Input -->
    <div v-if="step === 2" style="transition: all 0.3s ease;">
      <div style="background-color: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
        <div style="margin-bottom: 20px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3182ce" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            <line x1="12" y1="11" x2="12" y2="17"></line>
            <line x1="9" y1="14" x2="15" y2="14"></line>
          </svg>
        </div>
        <h2 style="margin-bottom: 15px; color: #2c5282; font-size: 18px;">Select Your Desired Master's Program</h2>
        
        <div style="margin-bottom: 20px; text-align: left;">
          <label style="display: block; margin-bottom: 8px; color: #4a5568; font-size: 14px; font-weight: 500;">Program:</label>
          <div style="position: relative;">
            <select v-model="selectedCourse"
              style="display: block; width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #fff; color: #2d3748; font-size: 14px; appearance: none; outline: none; transition: border-color 0.2s ease;">
              <option disabled value="">Select a Master's program</option>
              <option value="Berufs- und Technikpädagogik (M.A.) 210KP">Berufs- und Technikpädagogik</option>
              <option value="Wirtschaftsingenieurwesen/Bautechnik und -management">Wirtschaftsingenieurwesen/Bautechnik und -management</option>
              <option value="Wirtschaftsingenieurwesen/Maschinenbau">Wirtschaftsingenieurwesen/Maschinenbau</option>
              <option value="Wirtschaftsingenieurwesen/Projektmanagement">Wirtschaftsingenieurwesen/Projektmanagement</option>
            </select>
            <div style="position: absolute; right: 12px; top: 14px; pointer-events: none;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4a5568" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
        </div>

        <!-- Select German City of Bachelor Degree -->
<div style="margin-bottom: 20px; text-align: left;">
  <label for="city" style="display: block; margin-bottom: 5px; color: #2c5282; font-weight: 500;">German City of Your Bachelor's Degree</label>
  <select id="city" v-model="selectedCity" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #cbd5e0;">
    <option value="" disabled>Select a city</option>
    <option>Berlin</option>
    <option>Hamburg</option>
    <option>Munich</option>
    <option>Frankfurt</option>
    <option>Cologne</option>
    <option>Stuttgart</option>
    <option>Dresden</option>
    <option>Leipzig</option>
    <option>Hannover</option>
    <option>Düsseldorf</option>
    <!-- Add more as needed -->
  </select>
</div>


       
          <label style="display: block; margin-bottom: 8px; color: #4a5568; font-size: 14px; font-weight: 500;">Your Bachelor Credits:</label>
          <input
            type="number"
            v-model.number="bachelorCredits"
            placeholder="Enter Bachelor Credits (180-240)"
            min="180"
            max="240"
            style="display: block; width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #fff; color: #2d3748; font-size: 14px; outline: none; transition: border-color 0.2s ease;"
          />
<br/>
           <!-- Only show credits input if hasTotalCredits is false -->
        <div v-if="!hasTotalCredits" style="margin-bottom: 20px; text-align: left;">
           <div style="background-color: #ebf8ff; border-left: 4px solid #3182ce; padding: 12px; border-radius: 8px; margin-bottom: 12px; color: #2c5282; font-size: 14px;">
    💡 You can find the number of credits you have earned in your study documentation. If you have completed your Bachelor's degree, you have received 30 credits per semester.
  </div>
        </div>


        <!-- Language Selector -->
<div style="margin-bottom: 20px; text-align: left;">
  <label style="display: block; margin-bottom: 8px; color: #4a5568; font-size: 14px; font-weight: 500;">
    Language / Sprache:
  </label>
  <select v-model="selectedLanguage"
    style="width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #fff; color: #2d3748;">
    <option value="en">English</option>
    <option value="de">Deutsch</option>
  </select>
</div>


        <button @click="submitMasterAndCredits" :disabled="loading || !selectedCourse"
          style="width: 100%; padding: 12px; background: linear-gradient(135deg, #3182ce, #63b3ed); border: none; border-radius: 8px; color: white; font-size: 16px; font-weight: 500; cursor: pointer; transition: all 0.3s ease; display: flex; justify-content: center; align-items: center;">
          <span>Continue to Analysis</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 8px;">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </button>
      </div>
    </div>

    <!-- Step 3: Results Display -->
    <div v-if="step === 3" style="transition: all 0.3s ease;">
      <div style="background-color: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
        <div v-if="!analysis && loading" style="margin: 30px 0;">
          <div style="border: 3px solid #ebf8ff; border-top: 3px solid #3182ce; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
          <p style="margin-top: 15px; color: #4a5568;">Analyzing your eligibility...</p>
        </div>

        <div v-if="analysis" style="text-align: left;">
          <div style="display: flex; align-items: center; margin-bottom: 20px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3182ce" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 10px;">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <h2 style="color: #2c5282; font-size: 18px; margin: 0;">Analysis Results</h2>
          </div>
          
          <div style="background-color: #ebf8ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3182ce;">
            <h3 style="color: #2b6cb0; font-size: 16px; margin-top: 0; margin-bottom: 10px;">Selected Program</h3>
            <p style="color: #4a5568; margin: 0;">{{ selectedCourse }}</p>
          </div>
          
          <div style="background-color: #f7fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
  <h3 style="color: #2c5282; font-size: 16px; margin-top: 0; margin-bottom: 10px;">Eligibility Assessment</h3>
  <p style="color: #4a5568; white-space: pre-wrap; margin: 0; line-height: 1.6;" v-html="analysis"></p>
</div>

          <!-- Email input and send button -->
<div style="margin-top: 20px;">
  <h3 style="color: #2c5282;">Would you like to receive this analysis by email?</h3>

  <input
    v-model="userEmail"
    type="email"
    placeholder="Enter your email"
    style="margin-top: 10px; padding: 8px; border-radius: 6px; border: 1px solid #ccc; width: 100%;"
    :disabled="emailLoading || emailSent"
  />

  <button
    @click="sendEmail"
    :disabled="emailLoading || emailSent"
    style="margin-top: 10px; padding: 10px 20px; background-color: #3182ce; color: white; border: none; border-radius: 6px; cursor: pointer;"
  >
    <span v-if="emailLoading">Sending... 🌐</span>
    <span v-else-if="emailSent">Email Sent ✅</span>
    <span v-else>Send Result by Email</span>
  </button>

  <p v-if="error" style="color: red; margin-top: 5px;">{{ error }}</p>
</div>


          <div v-if="chatActive" style="margin-top: 30px;">
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3182ce" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <h3 style="color: #2c5282; font-size: 16px; margin: 0;">Ask Follow-up Questions</h3>
            </div>
            
            <div style="max-height: 300px; overflow-y: auto; margin-bottom: 15px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
              <div v-for="(msg, index) in chatHistory" :key="index"
                style="padding: 10px; border-radius: 8px; margin-bottom: 10px;"
                :style="msg.role === 'user' ? 'background-color: #ebf8ff; text-align: right;' : 'background-color: #f7fafc; text-align: left;'">
                <p style="margin: 0; color: #4a5568; font-size: 14px;">
                  <strong style="color: #2c5282;">{{ msg.role === 'user' ? 'You' : 'Advisor' }}:</strong>
                  {{ msg.content }}
                </p>
              </div>
            </div>

            <div style="display: flex; align-items: center;">
              <input v-model="userMessage" @keyup.enter="sendMessage" placeholder="Type your question here..."
                style="flex: 1; padding: 12px; border-radius: 8px 0 0 8px; border: 1px solid #e2e8f0; outline: none;" />
              <button @click="sendMessage"
                style="padding: 12px 15px; border-radius: 0 8px 8px 0; background-color: #3182ce; color: white; border: none; cursor: pointer;">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <p v-if="error" style="color: #e53e3e; margin-top: 15px; background-color: #fff5f5; padding: 10px; border-radius: 8px; font-size: 14px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: -2px; margin-right: 5px;">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      {{ error }}
    </p>
  </div>
</template>

<style>
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Adding subtle animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

div[v-if="step === 1"], 
div[v-if="step === 2"], 
div[v-if="step === 3"] {
  animation: fadeIn 0.5s ease-out;
}

select:hover, input:hover {
  border-color: #90cdf4 !important;
}

select:focus, input:focus {
  border-color: #3182ce !important;
  box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.2);
}

button:hover {
  background: linear-gradient(135deg, #2b6cb0, #4299e1) !important;
  transform: translateY(-1px);
}

button:active {
  transform: translateY(0);
}

label:hover {
  background: linear-gradient(135deg, #e6f7ff, #bfdbfe) !important;
  border-color: #4299e1 !important;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>