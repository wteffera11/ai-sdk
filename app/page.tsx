'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputMessage,
} from '@/components/ai-elements/prompt-input';
import { MessageSquare } from 'lucide-react';
import { Response } from '@/components/ai-elements/response';

export default function Chat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat();

  const handleSubmit = (message: PromptInputMessage, event: React.FormEvent) => {
    event.preventDefault();
    console.log('message', message);
    if (!message?.text?.trim()) return;
    sendMessage({ text: message.text });
    setInput('');
  };

  return (
    <div className="flex flex-col max-w-3xl mx-auto h-[80vh] border rounded-xl overflow-hidden">
      {/* Conversation panel */}
      <Conversation className="flex-1">
        <ConversationContent className="p-4">
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<MessageSquare className="w-12 h-12 text-gray-400" />}
              title="Start a conversation"
              description="Type a message below to begin chatting"
            />
          ) : (
            messages.map((msg) => (
              <Message from={msg.role} key={msg.id}>
                <MessageContent>
                  {msg.parts.map((part, i) => {
                    switch (part.type) {
                      case 'text':
                        return <Response key={i}>{part.text}</Response>;
                      case 'tool-addResource':
                      case 'tool-getInformation':
                        return (
                          <pre key={i} className="bg-gray-100 p-2 rounded my-1">
                            {part.state === 'output-available' ? 'Tool output:' : 'Calling tool:'}{' '}
                            {part.type}
                            {'\n'}
                            {JSON.stringify(part.input, null, 2)}
                          </pre>
                        );
                      default:
                        return null;
                    }
                  })}
                </MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Input */}
      <PromptInput onSubmit={(message, event) => handleSubmit(message, event)} className="p-4 border-t bg-white">
        <PromptInputTextarea
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          placeholder="Type your message..."
          className="pr-12"
        />
        <PromptInputSubmit
          disabled={!input.trim() || status === 'streaming'}
          status={status === 'streaming' ? 'streaming' : 'ready'}
          className="absolute bottom-1 right-1"
        />
      </PromptInput>
    </div>
  );
}
