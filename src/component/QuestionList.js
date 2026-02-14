import React from "react";
// import Quize from  "./Quize.css";

export default function QuestionList({question , options,handleClick,currentanswer}){
    return(
       
        <div>
            <div>
            <h4>{question}</h4>
            <ul>
                {options?.map((option,index) => (  
                    <li key={index} onClick={()=>handleClick(option)} className={currentanswer === option ? "selected" : ""}>{option}</li>
                ))}
            </ul>
            </div>
        </div>
    );
}