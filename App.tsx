import React, { useState, useEffect, useCallback } from 'react';
import FileUpload from './components/FileUpload';
import Loader from './components/Loader';
import { generateFamilyImage, generateFamilyVideo } from './services/geminiService';

// A simple text-based logo for P/S
const PsLogo = ({ className }: { className?: string }) => (
  <div className={`font-bold text-4xl lg:text-5xl ${className}`}>
    <span className="text-blue-800">P</span>
    <span className="text-blue-800">/</span>
    <span className="text-blue-800">S</span>
  </div>
);

// Loading messages for the video generation process
const videoLoadingMessages = [
  "Gathering the Tet decorations...",
  "Setting the festive table...",
  "Animating your family's smiles...",
  "Adding the final sparkle...",
  "This can take a few minutes...",
];

export default function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState<boolean>(false);
  const [isLoadingVideo, setIsLoadingVideo] = useState<boolean>(false);
  const [videoMessageIndex, setVideoMessageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [apiKeySelected, setApiKeySelected] = useState(false);

  // Check if a Veo API key has been selected on component mount
  useEffect(() => {
    const checkApiKey = async () => {
      // @ts-ignore
      if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
        setApiKeySelected(true);
      }
    };
    checkApiKey();
  }, []);

  // Cycle through video loading messages
  useEffect(() => {
    let interval: number;
    if (isLoadingVideo) {
      interval = window.setInterval(() => {
        setVideoMessageIndex((prevIndex) => (prevIndex + 1) % videoLoadingMessages.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isLoadingVideo]);

  const handleFilesChange = (selectedFiles: File[]) => {
    setError(null);
    setGeneratedImage(null);
    setGeneratedVideoUrl(null);
    setFiles(selectedFiles);
  };

  const handleGenerateImage = useCallback(async () => {
    if (files.length === 0) {
      setError("Please upload at least one photo.");
      return;
    }
    setIsLoadingImage(true);
    setError(null);
    setGeneratedImage(null);
    setGeneratedVideoUrl(null);

    try {
      const imageB64 = await generateFamilyImage(files);
      setGeneratedImage(`data:image/png;base64,${imageB64}`);
    } catch (err) {
      console.error("Image generation failed:", err);
      setError("Failed to generate the family image. Please try again.");
    } finally {
      setIsLoadingImage(false);
    }
  }, [files]);

  const handleSelectApiKey = async () => {
    try {
        // @ts-ignore
        if (window.aistudio) {
            // @ts-ignore
            await window.aistudio.openSelectKey();
            setApiKeySelected(true); // Assume success
            setError(null); // Clear the error message
        }
    } catch (e) {
        setError("API Key selection is required for video generation.");
        console.error("API Key selection failed:", e);
    }
};

  const handleGenerateVideo = useCallback(async () => {
    if (!generatedImage) return;

    // The Veo model requires the user to select an API key via a dialog.
    // This flow handles checking and prompting for key selection.
    try {
      // @ts-ignore
      if (!apiKeySelected && window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        // Assume key selection is successful to avoid race conditions.
        setApiKeySelected(true);
      }
    } catch (e) {
      setError("API Key selection is required for video generation.");
      console.error("API Key selection failed:", e);
      return;
    }

    setIsLoadingVideo(true);
    setError(null);
    setGeneratedVideoUrl(null);
    setVideoMessageIndex(0);

    try {
      const videoUrl = await generateFamilyVideo(generatedImage.split(',')[1]);
      setGeneratedVideoUrl(videoUrl);
    } catch (err: any) {
        console.error("Video generation failed:", err);
        let errorMessage = `Failed to generate the video: ${err.message}. Please try again.`;
        if (err.message && err.message.includes("Requested entity was not found")) {
            errorMessage = "API Key not found or invalid. Please select a valid key and try again.";
            setApiKeySelected(false); // Reset key state to re-trigger selection
        }
        setError(errorMessage);
    } finally {
      setIsLoadingVideo(false);
    }
  }, [generatedImage, apiKeySelected]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-800 to-yellow-600 p-4 sm:p-6 lg:p-8 font-sans">
      <main className="max-w-4xl mx-auto bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 space-y-8">
        <header className="text-center space-y-4">
          <div className="flex justify-center items-center gap-4">
             <PsLogo />
             <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-yellow-300 tracking-tight">
                Tet Family Moment
             </h1>
          </div>
          <p className="text-yellow-100 max-w-2xl mx-auto">
            Upload up to 5 photos of your family members to create a beautiful Tet portrait, then bring it to life with a magical animated video!
          </p>
        </header>

        {error && (
          <div className="bg-red-500/80 border border-red-700 text-white px-4 py-3 rounded-lg relative flex flex-col sm:flex-row justify-between items-center gap-4" role="alert">
            <div>
              <strong className="font-bold">Oops! </strong>
              <span className="block sm:inline">{error}</span>
            </div>
            {error.includes("API Key not found or invalid") && (
              <button 
                onClick={handleSelectApiKey}
                className="px-4 py-2 bg-white/20 text-white font-bold rounded-md shadow-md hover:bg-white/30 transition-colors duration-200 flex-shrink-0"
              >
                Re-select API Key
              </button>
            )}
          </div>
        )}

        {/* Step 1: File Upload and Image Generation */}
        <div className="bg-white/10 p-6 rounded-xl space-y-6">
          <h2 className="text-2xl font-semibold text-yellow-200 border-b-2 border-yellow-400/50 pb-2">Step 1: Create Your Family Portrait</h2>
          <FileUpload onFilesChange={handleFilesChange} />
          <div className="text-center">
            <button
              onClick={handleGenerateImage}
              disabled={files.length === 0 || isLoadingImage || isLoadingVideo}
              className="px-8 py-3 bg-yellow-400 text-red-900 font-bold rounded-full shadow-lg hover:bg-yellow-300 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed transform hover:scale-105 disabled:scale-100"
            >
              {isLoadingImage ? 'Creating Portrait...' : 'Generate Photo'}
            </button>
          </div>
        </div>

        {isLoadingImage && <Loader text="Generating your family portrait..." />}

        {/* Step 2: Display Image and Generate Video */}
        {generatedImage && (
          <div className="bg-white/10 p-6 rounded-xl space-y-6 animate-fade-in">
             <h2 className="text-2xl font-semibold text-yellow-200 border-b-2 border-yellow-400/50 pb-2">Step 2: Bring Your Portrait to Life</h2>
            <img src={generatedImage} alt="Generated family portrait" className="rounded-lg shadow-md w-full max-w-xl mx-auto"/>
             <div className="text-center">
                <button
                    onClick={handleGenerateVideo}
                    disabled={isLoadingVideo}
                    className="px-8 py-3 bg-blue-500 text-white font-bold rounded-full shadow-lg hover:bg-blue-400 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed transform hover:scale-105 disabled:scale-100"
                >
                    {isLoadingVideo ? 'Creating Video...' : 'Generate 8s Video'}
                </button>
             </div>
          </div>
        )}

        {isLoadingVideo && <Loader text={videoLoadingMessages[videoMessageIndex]} />}
        
        {/* Step 3: Display Video */}
        {generatedVideoUrl && (
          <div className="bg-white/10 p-6 rounded-xl space-y-4 animate-fade-in">
            <h2 className="text-2xl font-semibold text-yellow-200 text-center">Your Tet Family Moment is Ready!</h2>
            <video controls src={generatedVideoUrl} className="w-full max-w-xl mx-auto rounded-lg shadow-md"></video>
            <div className="text-center">
                <a
                  href={generatedVideoUrl}
                  download="ps-tet-family-moment.mp4"
                  className="inline-block mt-4 px-8 py-3 bg-green-500 text-white font-bold rounded-full shadow-lg hover:bg-green-400 transition-all duration-300 transform hover:scale-105"
                >
                  Download Video
                </a>
            </div>
          </div>
        )}

        <footer className="text-center text-yellow-200/70 text-sm pt-4">
          A P/S Tet Celebration powered by Google AI.
        </footer>
      </main>
    </div>
  );
}