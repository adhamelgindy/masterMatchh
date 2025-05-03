<script setup>
import { db } from '@/plugins/firebase'
import { collection, addDoc } from 'firebase/firestore'

const form = ref({
  name: '',
  email: '',
  message: ''
})

const submitForm = async () => {
  try {
    await addDoc(collection(db, 'userForms'), {
      ...form.value,
      timestamp: new Date()
    })
    alert('Form submitted successfully!')
  } catch (error) {
    console.error('Error saving data:', error)
    alert('Something went wrong.')
  }
}
</script>

<template>
  <form @submit.prevent="submitForm" class="space-y-4">
    <input v-model="form.name" placeholder="Name" />
    <input v-model="form.email" placeholder="Email" />
    <textarea v-model="form.message" placeholder="Message" />
    <button type="submit">Send</button>
  </form>
</template>
