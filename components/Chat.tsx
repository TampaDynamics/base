'use client';
import { useState, useEffect, useRef, FormEvent, JSX } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios, { AxiosResponse } from 'axios';
import { XMarkIcon, PaperAirplaneIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid';

// Define types
interface Message {
  role: 'user' | 'ai';
  content: string | JSX.Element;
}

interface StoredMessage {
  role: 'user' | 'ai';
  content: string;
}

interface ChatProps {
  webhookUrl?: string;
  apiKey?: string;
}

interface WebhookResponse {
  output: string;
}

const generateSessionId = (): string => {
  return [...Array(32)]
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join('');
};

const formatResponse = (text: unknown): JSX.Element => {
  const safeText = typeof text === 'string' ? text : String(text ?? '');
  const lines = safeText.split('\n').filter((line) => line.trim() !== '');
  if (lines.length > 1) {
    return (
      <>
        {lines.map((line, index) => (
          <p key={index} className="mb-2 last:mb-0">
            {line}
          </p>
        ))}
      </>
    );
  }

  const sentences = safeText.split('. ').map((s) => s.trim() + (s.endsWith('.') ? '' : '.'));
  if (sentences.length > 1 || safeText.length > 100) {
    return (
      <>
        {sentences.map((sentence, index) => (
          <p key={index} className="mb-2 last:mb-0">
            {sentence}
          </p>
        ))}
      </>
    );
  }

  return <>{safeText}</>;
};

const Chat: React.FC<ChatProps> = ({
  webhookUrl = 'https://automation.tampadynamics.com/webhook/dynamics-chat',
  apiKey = '',
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const storedMessages = localStorage.getItem('chatMessages');
    if (storedMessages) {
      const parsedMessages: StoredMessage[] = JSON.parse(storedMessages);
      setMessages(
        parsedMessages.map((msg) => ({
          role: msg.role,
          content: msg.role === 'ai' ? formatResponse(msg.content) : msg.content,
        }))
      );
    }

    const storedSessionId = localStorage.getItem('chatSessionId');
    if (storedSessionId) {
      setSessionId(storedSessionId);
    } else {
      const newSessionId = generateSessionId();
      setSessionId(newSessionId);
      localStorage.setItem('chatSessionId', newSessionId);
    }
  }, []);

  useEffect(() => {
    const storableMessages = messages.map((msg) => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : msg.content.props.children,
    }));
    localStorage.setItem('chatMessages', JSON.stringify(storableMessages));
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    try {
      const response: AxiosResponse<WebhookResponse> = await axios.post(
        webhookUrl,
        { message: input, sessionId },
        { headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {} }
      );

      const formattedContent = formatResponse(response.data.output || 'AI response received');
      const aiMessage: Message = { role: 'ai', content: formattedContent };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = axios.isAxiosError(error) && error.response?.status === 404
        ? 'Error: Webhook not found (404). Check n8n setup.'
        : 'Error: Could not reach AI';
      setMessages((prev) => [...prev, { role: 'ai', content: formatResponse(errorMessage) }]);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`${!isOpen ? 'bg-slate-700' : ''} text-white p-3 rounded-full shadow-lg hover:bg-slate-600 transition-colors duration-200`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {!isOpen && <ChatBubbleLeftRightIcon className="h-6 w-6" />}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.15 }}
            className="bg-slate-800 w-96 max-h-[500px] rounded-xl shadow-2xl mt-4 flex flex-col text-white relative"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="absolute top-2 left-2 text-white hover:text-slate-300 transition-colors duration-200"
              onClick={() => setIsOpen(false)}
            >
              <XMarkIcon className="h-4 w-4" />
            </motion.button>

            <div className="flex-1 p-4 pt-8 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-900">
              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`mb-3 p-3 rounded-lg max-w-[80%] ${
                    msg.role === 'user'
                      ? 'bg-slate-700 ml-auto text-white'
                      : 'bg-slate-900 text-gray-200'
                  }`}
                >
                  {msg.content}
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-4 border-t border-slate-700">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 p-2 bg-slate-900 text-gray-200 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 placeholder-gray-400"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="text-white p-2 hover:text-slate-300 transition-colors duration-200"
                >
                  <PaperAirplaneIcon className="h-6 w-6" />
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Chat;