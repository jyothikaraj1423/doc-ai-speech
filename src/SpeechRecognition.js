import React, { useState, useEffect, useRef } from 'react';
import './SpeechRecognition.css';

function SpeechRecognition() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState('');
  const [finalTranscription, setFinalTranscription] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [accumulatedText, setAccumulatedText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const recognition = useRef(null);
  const lastFinalText = useRef('');

  // Language options
  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'Hindi' },
    { value: 'ta', label: 'Tamil' },
    { value: 'te', label: 'Telugu' },
    { value: 'mr', label: 'Marathi' },
    { value: 'kn', label: 'Kannada' }
  ];

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in your browser');
      return;
    }

    recognition.current = new SpeechRecognition();
    recognition.current.continuous = true;
    recognition.current.interimResults = true;
    recognition.current.maxAlternatives = 1;
    recognition.current.lang = 'en-US';
    recognition.current.onend = () => {
      // Restart immediately if we're recording
      if (isRecording) {
        recognition.current.start();
      }
    };
    
    recognition.current.onresult = (event) => {
      let currentText = '';
      
      // Get all results and combine them
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        currentText += result[0].transcript;
      }

      // Accumulate text continuously
      setAccumulatedText(prev => {
        // Always add new text
        return prev + currentText;
      });
      setTranscript(prev => [
        { 
          text: accumulatedText + currentText, 
          isFinal: false 
        }
      ]);

      // Update lastFinalText only when we get a final result
      if (event.results[event.results.length - 1].isFinal) {
        lastFinalText.current = currentText;
      }
    };
    recognition.current.onstart = () => {
      setIsRecording(true);
      setError('');
      setTranscript([]);
      setFinalTranscription('');
    };
    recognition.current.onerror = (event) => {
      setError(`Speech recognition error: ${event.error}`);
      // Try to restart on error
      if (isRecording) {
        recognition.current.start();
      }
    };

    return () => {
      if (recognition.current) {
        recognition.current.stop();
      }
    };
  }, []);

  const startRecording = () => {
    if (recognition.current) {
      recognition.current.start();
    }
  };

  const stopRecording = () => {
    if (recognition.current) {
      recognition.current.stop();
    }
  };

  const submitTranscription = () => {
    const currentText = transcript[0]?.text || '';
    setFinalTranscription(currentText);
    setTranscript([]);
  };

  const convertToLanguage = async (text, targetLanguage) => {
    try {
      const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(text)}`);
      const data = await response.json();
      return data[0][0][0];
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  };

  const convertFinalTranscription = async () => {
    if (!finalTranscription) return;
    
    const convertedText = await convertToLanguage(finalTranscription, selectedLanguage);
    setTranslatedText(convertedText);
  };

  return (
    <div className="speech-recognition-container">
      <div className="controls">
        <button 
          onClick={startRecording}
          disabled={isRecording || error !== ''}
          className={`record-btn ${error !== '' ? 'disabled' : ''}`}
          title={error}
        >
          Start Recording
        </button>
        <button 
          onClick={stopRecording}
          disabled={!isRecording || error !== ''}
          className={`record-btn ${isRecording ? 'recording' : ''} ${error !== '' ? 'disabled' : ''}`}
          title={error}
        >
          Stop Recording
        </button>
        <button 
          onClick={submitTranscription}
          disabled={transcript.length === 0 || error !== ''}
          className={`record-btn ${error !== '' ? 'disabled' : ''}`}
          title={error}
        >
          Submit
        </button>
        <select
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
          className="language-selector"
        >
          {languageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button 
          onClick={convertFinalTranscription}
          disabled={!finalTranscription || error !== ''}
          className={`record-btn ${error !== '' ? 'disabled' : ''}`}
          title={error}
        >
          Convert Language
        </button>
        {error && <div className="error">{error}</div>}
      </div>
      <div className="transcript-container">
        {transcript.map((item, index) => (
          <div key={index} className={`transcript-line ${item.isFinal ? 'final' : ''}`}>
            {item.text}
          </div>
        ))}
      </div>
      {finalTranscription && (
        <div className="transcription-display">
          <div className="english-transcription">
            <h3>English Transcript:</h3>
            <p>{finalTranscription}</p>
          </div>
          {translatedText && (
            <div className="translated-text">
              <h3>Translation ({selectedLanguage.toUpperCase()}):</h3>
              <p>{translatedText}</p>
            </div>
          )}
        </div>
      )}
      {finalTranscription && (
        <div className="final-transcription">
          <h3>Final Transcription:</h3>
          <p>{finalTranscription}</p>
        </div>
      )}
    </div>
  );
}

export default SpeechRecognition;