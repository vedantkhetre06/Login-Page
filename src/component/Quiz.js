import React, { useState } from "react";
import QuestionList from "./QuestionList";
import QuizCSS from  "./Quiz.css";

function Quiz() {
    const questions = [
  {
    question: "What is React mainly used for?",
    options: [
      "Database management",
      "Building user interfaces",
      "Server configuration",
      "Operating systems"
    ],
    answer: "Building user interfaces"
  },
  {
    question: "React is developed by:",
    options: [
      "Google",
      "Facebook",
      "Microsoft",
      "Amazon"
    ],
    answer: "Facebook"
  },
  {
    question: "What hook is used for state in React?",
    options: [
      "useEffect",
      "useState",
      "useRef",
      "useMemo"
    ],
    answer: "useState"
  },
  {
    question: "JSX stands for:",
    options: [
      "Java Syntax Extension",
      "JavaScript XML",
      "JSON XML",
      "Java Extended Syntax"
    ],
    answer: "JavaScript XML"
  },
  {
    question: "Which method is used to render lists in React?",
    options: [
      "forEach",
      "map",
      "filter",
      "reduce"
    ],
    answer: "map"
  },
  {
    question: "Props in React are:",
    options: [
      "Mutable",
      "Read-only",
      "Functions only",
      "Numbers only"
    ],
    answer: "Read-only"
  },
  {
    question: "Which hook runs side effects in React?",
    options: [
      "useState",
      "useEffect",
      "useContext",
      "useReducer"
    ],
    answer: "useEffect"
  },
  {
    question: "React components must start with:",
    options: [
      "Lowercase letter",
      "Number",
      "Capital letter",
      "Symbol"
    ],
    answer: "Capital letter"
  },
  {
    question: "What is the virtual DOM?",
    options: [
      "Real browser DOM",
      "Lightweight copy of DOM",
      "Database model",
      "CSS engine"
    ],
    answer: "Lightweight copy of DOM"
  },
  {
    question: "Which company maintains React today?",
    options: [
      "Google",
      "Meta",
      "Microsoft",
      "Netflix"
    ],
    answer: "Meta"
  }
];

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [currentanswer, setCurrentanswer] = useState(null);
    const [score,setScore] = useState(0);
    
    const handleClick=(option)=>{
        setCurrentanswer(option);
        if(option === questions[currentQuestionIndex].answer){
            setScore(score + 1);
        }
    }
    const handleNextQuestion= () => {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setCurrentanswer(null);
    }
      
    return (
      <div className="quiz-page">
        {currentQuestionIndex < questions.length ?
          <div className="quiz-box">
            <QuestionList question={questions[currentQuestionIndex].question}
            options={questions[currentQuestionIndex].options} 
            handleClick = {handleClick} 
            currentanswer={currentanswer}/>

            <button disabled={currentanswer === null} 
            className={currentanswer === null ? "button-disable": "button"} 
            onClick={handleNextQuestion}> Submit Question</button>
      
            </div>
             :
             <div className="quize-box"> Your score is {score}</div>
             }
            
        </div>
    );
}
export default Quiz;