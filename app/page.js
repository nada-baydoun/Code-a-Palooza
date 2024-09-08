'use client';

import { Box, Button, TextField, createTheme, ThemeProvider, CssBaseline, Typography } from '@mui/material';
import { useState } from 'react';

const theme = createTheme({
  palette: {
    primary: {
      main: '#4C9A2A',
      light: '#77B255',
      dark: '#3B7A1A',
    },
    secondary: {
      main: '#A5D6A7',
      light: '#C8E6C9',
      dark: '#4CAF50',
    },
    background: {
      default: '#F0F7EC',
      paper: '#E0E8D5',
    },
    text: {
      primary: '#2F4F4F',
      secondary: '#4C9A2A',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.2rem',
      fontWeight: 700,
      color: '#3B7A1A',
      '@media (max-width:600px)': {
        fontSize: '1.8rem',
      },
    },
    body1: {
      fontSize: '1rem',
      color: '#2F4F4F',
      fontWeight: 300, // Lighter text
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 25,
          textTransform: 'none',
          fontWeight: 600,
          padding: '12px 24px', // Increased padding
          backgroundColor: '#4C9A2A',
          transition: 'background-color 0.3s ease', // Smooth hover effect
          '&:hover': {
            backgroundColor: '#3B7A1A',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 25,
            backgroundColor: '#FFFFFF',
          },
        },
      },
    },
    MuiBox: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          backgroundColor: '#E0E8D5',
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)', // Enhanced shadow
        },
      },
    },
  },
});

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Welcome to the code-a-palooza, your Computer Science assistant! Let's get to know you!`,
    },
  ]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [technicalLevel, setTechnicalLevel] = useState('');
  const [goal, setGoal] = useState('');
  const [quizVisible, setQuizVisible] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [quizQuestion, setQuizQuestion] = useState(''); // State for quiz question
  const [aiAnalysis, setAiAnalysis] = useState(''); // State for AI analysis of the answer
  const [initialQuestion, setInitialQuestion] = useState(''); // State for the first question
  const [showAddQuestionButton, setShowAddQuestionButton] = useState(false); // State for showing Add Question button
  const [studyPlan, setStudyPlan] = useState('');

  const sendMessage = async () => {
    if (!message.trim()) return;

    setMessage('');
    setLoading(true);
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: 'user', content: message },
      { role: 'assistant', content: '' },
    ]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([...messages, { role: 'user', content: message }]),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        setMessages((prevMessages) => {
          const updatedMessages = [...prevMessages];
          updatedMessages[updatedMessages.length - 1].content += text;
          return updatedMessages;
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: 'assistant', content: 'I apologize, there was an error processing your request. Can you please try again?' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInfo = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          {
            name,
            technicalLevel,
            goal,
          },
        ]),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let result = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
      }

      const questions = result.split('\n');
      setInitialQuestion(questions[0]); // Store the first question
      setQuizQuestion(questions[0]); // Set the first AI-generated quiz question
      setQuizVisible(true); // Show quiz after saving the information
    } catch (error) {
      console.error('Error fetching quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuizSubmit = async () => {
    setLoading(true);
    try {
      const analysisResponse = await fetch('/api/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentInfo: { technicalLevel, goal },
          question: quizQuestion,
          userAnswer: quizAnswer
        }),
      });
      
      if (!analysisResponse.ok) {
        throw new Error(`HTTP error! status: ${analysisResponse.status}`);
      }
      
      const aiAnalysis = await analysisResponse.text();
      setAiAnalysis(aiAnalysis);

      // Generate study plan
      const studyPlanResponse = await fetch('/api/studyplan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentInfo: { technicalLevel, goal },
          aiAnalysis: aiAnalysis
        }),
      });

      if (!studyPlanResponse.ok) {
        throw new Error(`HTTP error! status: ${studyPlanResponse.status}`);
      }

      const studyPlanData = await studyPlanResponse.text();
      setStudyPlan(studyPlanData);

      setShowAddQuestionButton(true);
    } catch (error) {
      console.error('Error analyzing quiz answer or generating study plan:', error);
      setAiAnalysis('An error occurred. Please try again.');
      setStudyPlan('');
    } finally {
      setLoading(false);
    }
  };

  const handleNextQuestion = () => {
    setQuizQuestion(initialQuestion); // Load the initial question again
    setQuizAnswer(''); // Clear the answer input
    setAiAnalysis(''); // Clear the previous analysis
  };

  const handleAddQuestion = () => {
    setQuizQuestion(initialQuestion); // Load the initial question again
    setQuizAnswer(''); // Clear the answer input
    setAiAnalysis(''); // Clear the previous analysis
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        width="100%"
        minHeight="100vh"
        bgcolor="background.default"
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        gap={4}
        p={3}
        overflow="auto"
      >
        {/* Title and Input Form */}
        <Box
          width="100%"
          maxWidth="700px"
          bgcolor="background.paper"
          borderRadius={12}
          p={3}
          boxShadow={2}
        >
          <Typography variant="h1" component="h1" align="center" color="primary.main" gutterBottom>
            Let&apos;s get to know you
          </Typography>

          <TextField
            label="Current Technical Level"
            variant="outlined"
            value={technicalLevel}
            onChange={(e) => setTechnicalLevel(e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Goal"
            variant="outlined"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            fullWidth
            margin="normal"
          />
          <Button
            variant="contained"
            fullWidth
            sx={{ mt: 2 }}
            onClick={handleSaveInfo}
            disabled={loading}
          >
            {loading ? 'Generating Quiz...' : 'Get tested NOW'}
          </Button>
        </Box>

        {/* Conditional Quiz Box */}
        {quizVisible && (
          <Box
            width="100%"
            maxWidth="700px"
            bgcolor="background.paper"
            borderRadius={12}
            p={3}
            boxShadow={2}
            mt={2}
          >
            <Typography variant="h6" align="center" gutterBottom>
              {quizQuestion || 'Loading quiz question...'}
            </Typography>
            <TextField
              label="Your Answer"
              variant="outlined"
              value={quizAnswer}
              onChange={(e) => setQuizAnswer(e.target.value)}
              fullWidth
              margin="normal"
            />
            <Button
              variant="contained"
              fullWidth
              sx={{ mt: 2 }}
              onClick={handleQuizSubmit}
            >
              Submit Answer
            </Button>

            {/* AI Analysis Block */}
            {aiAnalysis && (
              <Box mt={2} p={2} bgcolor="background.paper" borderRadius={4} boxShadow={1}>


                <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                  {aiAnalysis}
                </Typography>
              </Box>
            )}

            {/* Study Plan Block */}
            {studyPlan && (
  <Box
    mt={4}
    p={4}
    bgcolor="background.paper"
    borderRadius={8}
    boxShadow={6}
    border="2px solid"
    borderColor="primary.light"
    sx={{
      backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.9) 30%, rgba(245,245,245,0.5) 100%)',
    }}
  >
    <Typography
      variant="h4"
      component="h2"
      align="center"
      color="primary.dark"
      fontWeight={600}
      gutterBottom
    >
      Personalized Study Plan
    </Typography>
    
    <Typography
      variant="body1"
      style={{
        whiteSpace: 'pre-wrap',
        lineHeight: 1.6,
        letterSpacing: '0.02rem',
      }}
    >
      {studyPlan}
    </Typography>
  </Box>
)}

          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
}
