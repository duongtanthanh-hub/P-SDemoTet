import { GoogleGenAI, Modality } from "@google/genai";

// Helper function to convert a File object to a base64 string
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

/**
 * Generates a composite family image using Gemini 2.5 Flash Image model.
 * @param files - An array of File objects (user-uploaded portraits).
 * @returns A promise that resolves to the base64 encoded string of the generated image.
 */
export const generateFamilyImage = async (files: File[]): Promise<string> => {
  // IMPORTANT: The API key must be available as an environment variable.
  // The user's request for a hardcoded key is against security best practices.
  // This implementation follows the secure method of using `process.env`.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const imageParts = await Promise.all(
    files.map(async (file) => {
      const base64Data = await fileToBase64(file);
      return {
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      };
    })
  );

  const prompt = `Create a new, single, composite image featuring the people from all the uploaded photos. The scene should be a warm, happy family gathered around a table, enjoying a festive Tet meal together. All family members should be dressed in beautiful, traditional Vietnamese Ao Dai outfits in vibrant Tet colors like red and gold. The overall atmosphere must be joyful and celebratory. In the bottom right corner, please subtly integrate a simple, elegant 'P/S' logo. The final output should be a single image.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { text: prompt },
        ...imageParts,
      ],
    },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });

  const firstPart = response.candidates?.[0]?.content?.parts[0];
  if (firstPart && 'inlineData' in firstPart && firstPart.inlineData) {
    return firstPart.inlineData.data;
  }

  throw new Error("No image data returned from the API.");
};

/**
 * Generates an animated video from an image using the Veo model.
 * @param imageBase64 - The base64 encoded string of the starting image.
 * @returns A promise that resolves to the object URL of the generated video.
 */
export const generateFamilyVideo = async (imageBase64: string): Promise<string> => {
    // A new instance is created here to ensure it uses the latest API key selected by the user.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `An 8-second animated video based on the provided image of a family celebrating Tet. The family members should show subtle, realistic motion: gently laughing, smiling, and interacting warmly with each other while enjoying their meal. The atmosphere is festive and joyful. Include a background of gentle, happy Tet music and soft ambient sounds of a family gathering. Towards the very end of the video (last 2 seconds), apply a magical, noticeable sparkling effect to everyone's teeth to highlight their bright smiles. A 'P/S' logo should be visible in the bottom right corner throughout the video.`;

    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        image: {
            imageBytes: imageBase64,
            mimeType: 'image/png',
        },
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '16:9',
        },
    });

    // Poll for the result, waiting 10 seconds between checks.
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }
    
    // Check for errors in the completed operation before proceeding.
    if (operation.error) {
        throw new Error(`Video generation failed: ${operation.error.message} (Code: ${operation.error.code})`);
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error("Video generation completed, but no download link was found.");
    }

    // Fetch the video data from the URI, which requires the API key.
    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!videoResponse.ok) {
        const errorText = await videoResponse.text();
        throw new Error(`Failed to download the generated video. Status: ${videoResponse.status}. Details: ${errorText}`);
    }

    const videoBlob = await videoResponse.blob();
    return URL.createObjectURL(videoBlob);
};