import logo from './logo.svg';
import './App.css';
import Quiz from "./component/Quiz"
import { Navigate } from 'react-router-dom';
// import count from "./count";

import { useState } from 'react';
import { BrowserRouter as Router, Routes,Route, useNavigate} from "react-router-dom";
// ============= function =================
function SignLogin() {
  const [isLogin,setAsLogin] = useState(true);
  const [error , setError] = useState("");
  const navigate = useNavigate();

  // ---------- Login ---------------
const handleLogin = (e)=>{
    e.preventDefault();

    const email = e.target.email.value;
    const password = e.target.password.value;

    const storedUser = JSON.parse(localStorage.getItem("user"));

    if(!storedUser){
      setError("Account not Found. Please Create acoount first");
      return;
    }

    if(storedUser.email == email && storedUser.password == password){
      setError("");
      navigate("/account");
    }else{
      setError("Invalid email or password");
    }
  };


  // ------ Sign UP ----------------
  const handleSingup = (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    const confirm = e.target.confirm.value;

    if(password != confirm){
      setError("Password do not match");
      return;
    }

    const userData = {email,password};
    localStorage.setItem("user",JSON.stringify(userData));

    setError("Account Creaated Successfully. Please login your account");
    setAsLogin(true);
  };

  return (
    <div className='container'>
      <div className='form-container'>
        <div className='form-toggle'>
          <button onClick={() => setAsLogin(true)}>Login</button>
          <button onClick={() => setAsLogin(false)}>Sign Up</button>
        </div>
        {/*  ERROR MESSAGE */ }
        {error && <p className='error'>{error}</p>}
        
        {isLogin ?

        // --------- loging Form --------------
        
        <form onSubmit={handleLogin}>
        <p> UserName or email address</p>
        <input name='email' className='input' required></input>

        <p>Password</p>
        <input name='password' className='input' required></input> 
        
        <button type='submit'> Login</button>

        <div className='forgot-container '>
            <a href="#" className="forgot-link">Forgot Password?</a>  
        </div>  

        <div className='new-account'>    
          <p>Create New Account? 
          <a href='#' onClick={() => setAsLogin(false)}>Sign Up</a></p>
        </div>
        </form>:
        // --------- singining form ---------------
        <form onSubmit={handleSingup}>

        <p>Username or email address</p>
        <input name='email' className='input' required></input>
        <p>Password</p>
        <input name='password' className='input' required></input>
        <p>comform Password</p>
        <input name='confirm' className='input' required></input>

        <button type='submit' >SignUp</button>
        </form>
        }
      </div>
    </div>
  );
}

function Account(){
  const navigate = useNavigate();
   const startQuiz = () => {
    navigate("/quiz");
  };
  return(
    <div className="go-to-quiz">
    <div className="quiz-box">
      <h1>Welcome to your Starting page of Quiz</h1>
      <h3>press Start Button to Start the Quiz</h3>

      <button type="submit" onClick={startQuiz}>
      Start Quiz
      </button>
    </div>
    </div>

  );
}

function App(){
 
  return(
    <Router>
      <Routes>
        <Route path='/' element={<SignLogin/>}/>
        <Route path="/account" element={<Account />} />
        <Route path="/quiz" element={<Quiz />} /> 
      </Routes>
    </Router>
   
  );
}
export default App;
