import { useState, useEffect } from 'react';
import "prismjs/themes/prism-tomorrow.css"; // Base theme
import Editor from "react-simple-code-editor";
import prism from "prismjs";

// Import required languages for Prism.js
import 'prismjs/components/prism-markup-templating.js';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
// Add more languages here as needed

import Markdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css"; // For Markdown code blocks
import axios from 'axios';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import CodeHistory from './CodeHistory'; // Import the new component
import toast from 'react-hot-toast';
import '../App.css';


// Import icons
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { IoLanguageSharp } from "react-icons/io5"; // Language icon
import { MdContentCopy, MdDone, MdErrorOutline, MdSave } from "react-icons/md"; // Copy, Done, Error, Save icons

// Available languages for the editor and AI review
const supportedLanguages = [
  { value: 'javascript', label: 'JavaScript', prismLang: prism.languages.javascript, sample: `function greet(name) {\n  console.log(\`Hello, \${name}!\`);\n}\ngreet('World');` },
  { value: 'jsx', label: 'JSX', prismLang: prism.languages.jsx, sample: `function MyComponent() {\n  return <div>Hello JSX!</div>;\n}\n` },
  { value: 'python', label: 'Python', prismLang: prism.languages.python, sample: `def greet(name):\n  print(f"Hello, {name}!")\n\ngreet('World')` },
  { value: 'java', label: 'Java', prismLang: prism.languages.java, sample: `public class HelloWorld {\n  public static void main(String[] args) {\n    System.out.println("Hello, World!");\n  }\n}` },
  { value: 'c', label: 'C', prismLang: prism.languages.c, sample: `#include <stdio.h>\n\nint main() {\n  printf("Hello, C!\\n");\n  return 0;\n}` },
  { value: 'cpp', label: 'C++', prismLang: prism.languages.cpp, sample: `#include <iostream>\n\nint main() {\n  std::cout << "Hello, C++!" << std::endl;\n  return 0;\n}` },
  { value: 'csharp', label: 'C#', prismLang: prism.languages.csharp, sample: `using System;\n\npublic class Hello {\n  public static void Main(string[] args) {\n    Console.WriteLine("Hello, C#!");\n  }\n}` },
  { value: 'go', label: 'Go', prismLang: prism.languages.go, sample: `package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello, Go!")\n}` },
  { value: 'ruby', label: 'Ruby', prismLang: prism.languages.ruby, sample: `def greet(name)\n  puts "Hello, #{name}!"\nend\n\ngreet('World')` },
  { value: 'php', label: 'PHP', prismLang: prism.languages.php, sample: `<?php\nfunction greet($name) {\n  echo "Hello, " . $name . "!\\n";\n}\ngreet('World');\n?>` },
  { value: 'swift', label: 'Swift', prismLang: prism.languages.swift, sample: `func greet(name: String) {\n  print("Hello, \\(name)!")\n}\ngreet(name: "World")` },
  { value: 'typescript', label: 'TypeScript', prismLang: prism.languages.typescript, sample: `function greet(name: string): void {\n  console.log(\`Hello, \${name}!\`);\n}\ngreet('World');` },
];

function MainApp() {
  const [selectedLanguage, setSelectedLanguage] = useState(supportedLanguages[0]);
  const [code, setCode] = useState(supportedLanguages[0].sample);
  const [review, setReview] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [copyCodeFeedback, setCopyCodeFeedback] = useState('Copy Code');
  const [copyReviewFeedback, setCopyReviewFeedback] = useState('Copy Review');

  const { currentUser } = useAuth();

  const handleLoadCode = (newCode, langValue) => {
    const foundLang = supportedLanguages.find(l => l.value === langValue) || supportedLanguages[0];
    setCode(newCode);
    setSelectedLanguage(foundLang);
    setReview('');
    toast.dismiss(); // Dismiss any active toasts
  };

  const saveCode = async () => {
    if (!code.trim()) {
      toast.error("Cannot save empty code.");
      return;
    }
    if (!currentUser) {
      toast.error("You must be logged in to save code.");
      return;
    }

    const promise = addDoc(collection(db, "codeSnippets"), {
      userId: currentUser.uid,
      code: code,
      language: selectedLanguage.value,
      createdAt: serverTimestamp()
    });

    toast.promise(promise, {
       loading: 'Saving your code...',
       success: <b>Code saved to your history!</b>,
       error: <b>Could not save your code.</b>,
     });
  };

  const reviewCode = async () => {
    if (!code.trim()) {
      toast.error("Code cannot be empty. Please enter some code to review.");
      return;
    }
    setIsLoading(true);
    setReview('');

    const backendURL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

    try {
      const response = await axios.post(`${backendURL}/ai/get-review`, {
        code,
        language: selectedLanguage.value,
      });
      setReview(response.data);
    } catch (err) {
      console.error("Error fetching review:", err);
      const errorMessage = err.response?.data?.message || 'Failed to fetch review. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const clearCode = () => {
    setCode(selectedLanguage.sample || `// ${selectedLanguage.label} code`);
    setReview('');
    toast.dismiss();
  };

  const handleLanguageChange = (event) => {
    const langValue = event.target.value;
    const foundLang = supportedLanguages.find(l => l.value === langValue) || supportedLanguages[0];
    setSelectedLanguage(foundLang);
    setCode(foundLang.sample || `// Start typing your ${foundLang.label} code here`);
    setReview('');
  };

  const copyToClipboard = (text, type) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      const feedback = 'Copied!';
      if (type === 'code') setCopyCodeFeedback(feedback);
      else setCopyReviewFeedback(feedback);
      toast.success('Copied to clipboard!');
      setTimeout(() => {
        if (type === 'code') setCopyCodeFeedback('Copy Code');
        else setCopyReviewFeedback('Copy Review');
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      toast.error('Failed to copy to clipboard.');
    });
  };

  return (
    <>
      <main className="main-content">
        <div className="editor-pane">
          <div className="editor-toolbar">
            <div className="language-selector-wrapper" title="Select programming language">
              <IoLanguageSharp className="toolbar-icon language-icon" />
              <select
                value={selectedLanguage.value}
                onChange={handleLanguageChange}
                className="language-select"
                aria-label="Select programming language"
              >
                {supportedLanguages.map(lang => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="toolbar-buttons-group">
              <button
                onClick={() => copyToClipboard(code, 'code')}
                className={`toolbar-button copy-button ${copyCodeFeedback === 'Copied!' ? 'copied' : ''}`}
                title="Copy code to clipboard"
                disabled={!code.trim()}
              >
                {copyCodeFeedback === 'Copied!' ? <MdDone /> : <MdContentCopy />}
                {copyCodeFeedback}
              </button>
              <button
                onClick={clearCode}
                className="toolbar-button clear-button"
                title="Clear code editor and reset to sample"
              >
                Clear Code
              </button>
            </div>
          </div>
          <div className="code-editor-wrapper">
            <Editor
              value={code}
              onValueChange={newCode => setCode(newCode)}
              highlight={codeContent => {
                if (selectedLanguage.prismLang) {
                  return prism.highlight(codeContent, selectedLanguage.prismLang, selectedLanguage.value);
                }
                return codeContent;
              }}
              padding={12}
              style={{
                fontFamily: '"Fira code", "Fira Mono", monospace',
                fontSize: 15,
                color: "#d4d4d4",
                minHeight: "350px",
              }}
              textareaClassName="editor-textarea"
              preClassName="editor-pre"
            />
          </div>
          <div className="action-buttons">
            <button
              onClick={reviewCode}
              className="review-button"
              disabled={isLoading || !code.trim()}
              title={!code.trim() ? "Please enter some code to review" : "Get AI code review"}
            >
              {isLoading ? (
                <>
                  <AiOutlineLoading3Quarters className="loading-icon" /> Reviewing...
                </>
              ) : (
                'Review Code'
              )}
            </button>
            <button
              onClick={saveCode}
              className="toolbar-button save-button"
              disabled={!code.trim()}
              title="Save code to your account"
            >
              <MdSave />
              Save Code
            </button>
          </div>
        </div>
        <div className="review-pane">
          <CodeHistory onLoadCode={handleLoadCode} />
          <div className="review-toolbar">
            <h3 style={{'margin': 0}}>AI Review</h3>
            {review && (
              <button
                onClick={() => copyToClipboard(review, 'review')}
                className={`toolbar-button copy-button ${copyReviewFeedback === 'Copied!' ? 'copied' : ''}`}
                title="Copy review to clipboard"
                disabled={!review.trim()}
              >
                {copyReviewFeedback === 'Copied!' ? <MdDone /> : <MdContentCopy />}
                {copyReviewFeedback}
              </button>
            )}
          </div>
          {isLoading && !review && (
            <div className="loading-placeholder">
              <AiOutlineLoading3Quarters className="loading-icon-large" />
              <p>Fetching your code review for {selectedLanguage.label} code...</p>
              <p className="loading-subtext">This might take a few moments.</p>
            </div>
          )}
          {review && (
            <div className="markdown-display">
              <Markdown
                rehypePlugins={[rehypeHighlight]}
              >
                {review}
              </Markdown>
            </div>
          )}
          {!isLoading && !review && (
            <div className="empty-review-placeholder">
              <p>Your code review will appear here. <br/>Type or paste your code on the left, select the language, and click "Review Code".</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export default MainApp;
