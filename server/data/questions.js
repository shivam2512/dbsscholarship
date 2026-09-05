const questions = [
  {
    id: 1,
    category: "Problem Solving & Logic",
    question: "If you need to find a 'Java' book among 10,000 books in a library, what is the fastest method?",
    options: [
      "Arranging books by category (Programming, History, etc.) and then searching.",
      "Checking every book one by one.",
      "Buying a new book instead.",
      "Searching randomly."
    ],
    correctAnswer: 0,
    points: 5,
    explanation: "Categorizing and indexing data (similar to indexing in databases) drastically reduces search complexity from linear O(N) to rapid lookup."
  },
  {
    id: 2,
    category: "IT Support & Troubleshooting",
    question: "What is the first step an IT Support Engineer should take when a software error occurs?",
    options: [
      "Restart the computer and wait.",
      "Carefully read the error message and identify the root cause.",
      "Ignore the error if the system is still running.",
      "Delete the software immediately."
    ],
    correctAnswer: 1,
    points: 5,
    explanation: "Reading and analyzing error logs and error codes is the critical first step to diagnose and isolate the root cause before taking corrective action."
  },
  {
    id: 3,
    category: "Data & Query Logic",
    question: "If you have a list of 1000 students and you only need to see students from 'Pune', what command would you give the computer?",
    options: [
      "Show only the data where the city is 'Pune'.",
      "Show all data.",
      "Sort the list alphabetically by name.",
      "Delete everyone's name."
    ],
    correctAnswer: 0,
    points: 5,
    explanation: "Filtering records using a conditional clause (equivalent to SQL: SELECT * FROM students WHERE city = 'Pune') isolates the required subset."
  },
  {
    id: 4,
    category: "Syntax & Pattern Recognition",
    question: "In IT, 'Syntax' (the way of writing code) is very important. Which of these patterns is different?\nUSER_123, USER_456, user_789, USER_000",
    options: [
      "USER_456",
      "USER_000",
      "user_789",
      "USER_123"
    ],
    correctAnswer: 2,
    points: 5,
    explanation: "'user_789' is in lowercase, whereas all the other identifiers are in UPPERCASE format."
  },
  {
    id: 5,
    category: "Career Mindset & Problem Solving",
    question: "What is the most essential factor for switching from a Non-IT to an IT career?",
    options: [
      "Memorizing code by heart.",
      "Solving problems using logical steps.",
      "Having a high-end laptop.",
      "Only speaking English."
    ],
    correctAnswer: 1,
    points: 5,
    explanation: "Logical problem-solving and structured algorithmic thinking are the core foundation skills for success in IT."
  },
  {
    id: 6,
    category: "Database & Storage Concepts",
    question: "In a bank, your balance 'Updates' when you withdraw money. Where is this data permanently saved?",
    options: [
      "In a Secure Database (SQL).",
      "In an Excel sheet.",
      "On a physical ledger book only.",
      "In the mobile phone's gallery."
    ],
    correctAnswer: 0,
    points: 5,
    explanation: "Mission-critical financial transactions and ACID-compliant updates are stored permanently and reliably in secure Relational Database Management Systems (SQL)."
  },
  {
    id: 7,
    category: "Career Transition & Growth",
    question: "If you have a 2-3 year career gap, what will an IT company look for in you during hiring?",
    options: [
      "An excuse for the gap.",
      "Your previous salary slip.",
      "A letter of recommendation from a non-IT boss.",
      "Logical thinking and the passion to learn new technologies (SQL/UNIX)."
    ],
    correctAnswer: 3,
    points: 5,
    explanation: "IT hiring managers value strong fundamentals, structured problem-solving skills, and a demonstrated hunger to upskill in technologies like SQL, Linux/Unix, and scripting."
  },
  {
    id: 8,
    category: "IT Support Roles & Operations",
    question: "What does 'L1 Support' mean in the IT industry?",
    options: [
      "Creating software (Coding).",
      "Solving and monitoring customers' technical problems.",
      "Managing the company's marketing.",
      "Repairing laptops physically."
    ],
    correctAnswer: 1,
    points: 5,
    explanation: "L1 (Level 1) Support Engineers provide first-line technical incident resolution, monitoring, ticket triage, and user assistance."
  },
  {
    id: 9,
    category: "Ticketing, SLA & Prioritization",
    question: "If you receive 5 tickets (tasks) at once, which one will you do first?",
    options: [
      "Whichever customer calls the most.",
      "The one that arrived last.",
      "The one that is easiest to do.",
      "The one that is most 'Urgent' and 'Important'."
    ],
    correctAnswer: 3,
    points: 5,
    explanation: "ITIL service management dictates prioritizing incidents based on Impact and Urgency (Severity/SLA) rather than order of arrival."
  },
  {
    id: 10,
    category: "Learning Commitment",
    question: "Are you ready to take SQL and UNIX training for 2-3 hours daily in a disciplined manner for the next 3 months?",
    options: [
      "No, it seems too hard.",
      "I will try.",
      "Yes, I am fully committed.",
      "Only if I find time."
    ],
    correctAnswer: 2,
    points: 5,
    explanation: "Consistent daily effort and structured practice in SQL and UNIX are essential for securing high-paying L1/L2 IT support roles."
  }
];

const coaches = [
  "Sadanand B",
  "Vaishnavi",
  "Vijaykumar P.",
  "Ragini",
  "Dnyneshwari dhamal",
  "Aaryan",
  "Jay Dhumal",
  "Vanshita Pawar",
  "Saurabh Vispute",
  "Himanshu Panchal",
  "Rushikesh Dhanawade",
  "Gokul",
  "Darshan Mahajan",
  "Sivanand",
  "Siddharth"
];

module.exports = {
  questions,
  coaches
};
