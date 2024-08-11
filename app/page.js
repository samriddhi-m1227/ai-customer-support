'use client';
import React, { useState } from 'react';
import { Box, Button, Stack, TextField, useTheme, useMediaQuery, Typography } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm the Headstarter support assistant. How can I help you today?",
    },
  ]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const formatResponse = (content) => {
    // Basic formatting example - you can expand this based on your needs
    return content
      .replace(/### (.+)/g, '<strong>$1</strong>') // Bold headers
      .replace(/\*\*(.+?)\*\*/g, '<em>$1</em>')    // Italics for emphasis
      .replace(/- (.+)/g, '<li>$1</li>')            // List items
      .replace(/\n/g, '<br />');                    // Line breaks
  };

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;
    setIsLoading(true);

    setMessages((prevMessages) => [
      ...prevMessages,
      { role: 'user', content: message },
      { role: 'assistant', content: '' },
    ]);

    setMessage('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: [...messages, { role: 'user', content: message }] }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let result = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });

        // Update the assistant's message incrementally and format it
        setMessages((prevMessages) => {
          const lastMessageIndex = prevMessages.length - 1;
          const updatedMessages = [...prevMessages];
          updatedMessages[lastMessageIndex] = { 
            ...updatedMessages[lastMessageIndex], 
            content: formatResponse(result) 
          };
          return updatedMessages;
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: 'assistant', content: "I'm sorry, but I encountered an error. Please try again later." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <Box
      width="100vw"
      height="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      bgcolor="#06091B"
      p={2}
    >
      <Stack
        direction="column"
        width={isMobile ? '95%' : '95%'}
        height={isMobile ? '95%' : '95%'}
        border="1px solid black"
        borderRadius={2}
        boxShadow={3}
        p={2}
        spacing={3}
        bgcolor="whitesmoke"
      >
        <Typography align="center" color= '#030303' fontSize= '24px' fontFamily= 'Roboto Mono' letterSpacing= '-0.6px' lineHeight= '32px' gutterBottom>
          <SmartToyIcon fontSize='small'></SmartToyIcon> HeadstarterAI Support Hub
        </Typography>

        <Stack
          direction="column"
          spacing={2}
          flexGrow={1}
          overflow="auto"
          maxHeight="100%"
          sx={{
            '&::-webkit-scrollbar': {
              width: '0.4em',
            },
            '&::-webkit-scrollbar-track': {
              boxShadow: `inset 0 0 6px ${theme.palette.divider}`,
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: theme.palette.primary.main,
              borderRadius: '10px',
            },
          }}
        >
          {messages.map((message, index) => (
            <Box
              key={index}
              display="flex"
              justifyContent={
                message.role === 'assistant' ? 'flex-start' : 'flex-end'
              }
            >
              <Box
                bgcolor={
                  message.role === 'assistant'
                    ? 'primary.main'
                    : 'secondary.main'
                }
                color="white"
                borderRadius={2}
                p={2}
                maxWidth="80%"
              >
                <Typography dangerouslySetInnerHTML={{ __html: message.content }} />
              </Box>
            </Box>
          ))}
        </Stack>
        
        <Stack direction="row" spacing={2}>
          <TextField
            label="Message"
            fullWidth
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress} 
          />
          <Button 
            variant="contained" 
            onClick={sendMessage}
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
