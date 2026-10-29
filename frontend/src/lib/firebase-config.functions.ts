import { createServerFn } from "@tanstack/react-start";

/**
 * Returns the Firebase web (publishable) config for this project.
 * The API key is read from the GOOGLE_API_KEY runtime secret so it is not
 * hard-coded in the client bundle. The remaining values are publishable and
 * safe to return to the browser.
 */
export const getFirebaseConfig = createServerFn({ method: "GET" }).handler(
  async () => {
    const apiKey = process.env["GOOGLE_API_KEY"];
    if (!apiKey) {
      throw new Error(
        "GOOGLE_API_KEY secret is missing. Add your Firebase API key in project secrets.",
      );
    }
    return {
      apiKey,
      authDomain: "guardianai-a57df.firebaseapp.com",
      projectId: "guardianai-a57df",
      storageBucket: "guardianai-a57df.firebasestorage.app",
      messagingSenderId: "748269518133",
      appId: "1:748269518133:web:48c299483b60591242e07c",
    };
  },
);
