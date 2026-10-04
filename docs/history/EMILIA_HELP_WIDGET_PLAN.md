# Emilia Help Widget Implementation Plan

**Version:** 1.0
**Last Updated:** January 28, 2026
**Document ID:** LS-EMILIA-001
**Priority:** HIGH

---

## Executive Summary

This document outlines the implementation plan for Emilia, a new AI-powered help assistant for LifeScore. Emilia will be accessible via a floating widget on all pages, providing users with instant access to documentation and interactive support.

**Key Features:**
- Floating help bubble (lower-left corner)
- Modal with documentation tabs (CSM, Tech Support, User Manual)
- AI chatbot with voice capabilities
- Knowledge base covering all documentation
- Available to ALL users (including free tier)

---

## Table of Contents

1. [Feature Overview](#1-feature-overview)
2. [UI/UX Design](#2-uiux-design)
3. [Technical Architecture](#3-technical-architecture)
4. [Component Breakdown](#4-component-breakdown)
5. [API Endpoints](#5-api-endpoints)
6. [OpenAI Assistant Setup](#6-openai-assistant-setup)
7. [Voice Integration](#7-voice-integration)
8. [Knowledge Base](#8-knowledge-base)
9. [Implementation Phases](#9-implementation-phases)
10. [File Structure](#10-file-structure)
11. [Detailed Code Specifications](#11-detailed-code-specifications)
12. [Testing Plan](#12-testing-plan)
13. [Deployment Checklist](#13-deployment-checklist)

---

## 1. Feature Overview

### 1.1 What is Emilia?

Emilia is a help assistant that provides:
- **Documentation Access:** Quick access to all user manuals
- **Interactive Support:** AI-powered Q&A with voice
- **Self-Service:** Users can find answers without contacting support

### 1.2 Availability

| User Tier | Access Level |
|-----------|--------------|
| FREE | Full access |
| NAVIGATOR | Full access |
| SOVEREIGN | Full access |

### 1.3 Emilia vs Olivia

| Feature | Olivia | Emilia |
|---------|--------|--------|
| **Purpose** | Comparison insights & advice | Help & documentation |
| **Position** | Lower-right | Lower-left |
| **Knowledge** | Comparison data, city insights | Manuals, how-to, troubleshooting |
| **Voice** | Yes | Yes |
| **Tier Limit** | Yes (messages limited) | No (unlimited for all) |

---

## 2. UI/UX Design

### 2.1 Floating Widget Bubble

```
Position: Fixed, bottom-left
Size: 60px × 60px (same as Olivia)
Icon: Question mark (?) or Emilia avatar
Color: Distinct from Olivia (suggest: teal/cyan #14B8A6)
Hover: Slight scale up + glow
Click: Opens Help Modal
```

**Visual Mockup:**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                         [App Content]                            │
│                                                                  │
│                                                                  │
│                                                                  │
│                                                                  │
│  ┌──────┐                                              ┌──────┐ │
│  │  ?   │                                              │  🎙️  │ │
│  │EMILIA│                                              │OLIVIA│ │
│  └──────┘                                              └──────┘ │
│   ▲                                                       ▲     │
│   │                                                       │     │
│   Lower-Left (NEW)                              Lower-Right     │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Help Modal (Documentation View)

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌──────────┐  ┌──────────────┐  ┌─────────────┐               │
│  │   CSM    │  │ Tech Support │  │ User Manual │          ✕    │
│  └──────────┘  └──────────────┘  └─────────────┘               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Scrollable content area displaying selected manual]           │
│                                                                  │
│  ## Section Title                                                │
│  Content from the selected manual...                            │
│                                                                  │
│  ## Another Section                                              │
│  More content...                                                 │
│                                                                  │
│                                                                  │
│                     ┌─────────────────────┐                     │
│                     │         ?           │                     │
│                     │   Ask Emilia        │                     │
│                     │   for Help          │                     │
│                     └─────────────────────┘                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Width: 800px max (responsive)
Height: 80vh max
Tabs: Styled similar to existing app tabs
Content: Rendered Markdown
```

### 2.3 Emilia Chat Interface

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌─────┐                                                        │
│  │ 👩 │  Emilia - Help Assistant                          ✕    │
│  └─────┘  "I'm here to help!"                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 👤 How do I run an enhanced comparison?                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 👩 To run an enhanced comparison:                       │   │
│  │                                                          │   │
│  │ 1. Select two cities from the dropdown menus            │   │
│  │ 2. Toggle "Enhanced Mode" on                            │   │
│  │ 3. Click "Compare Cities"                               │   │
│  │                                                          │   │
│  │ Enhanced mode uses 5 AI providers for more accurate     │   │
│  │ results. It requires SOVEREIGN tier.                    │   │
│  │                                                  🔊      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────┐  ┌────┐  ┌────┐ │
│  │ Type your question...                      │  │ 🎤 │  │ ➤  │ │
│  └───────────────────────────────────────────┘  └────┘  └────┘ │
├─────────────────────────────────────────────────────────────────┤
│  🔄 Replay  │  📥 Download  │  🖨️ Print  │  🗑️ Clear          │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4 Color Scheme

| Element | Color | Hex |
|---------|-------|-----|
| Emilia Bubble | Teal | #14B8A6 |
| Bubble Hover | Teal Light | #2DD4BF |
| Modal Header | Dark | #1F2937 |
| Active Tab | Teal | #14B8A6 |
| Emilia Messages | Teal Light BG | #CCFBF1 |
| User Messages | Gray BG | #F3F4F6 |

---

## 3. Technical Architecture

### 3.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ HelpBubble  │  │ HelpModal   │  │ EmiliaChat              │ │
│  │ Component   │─▶│ Component   │─▶│ Component               │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                                              │                   │
└──────────────────────────────────────────────┼───────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND (API)                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ /api/emilia/    │  │ /api/emilia/    │  │ /api/emilia/    │ │
│  │ thread          │  │ message         │  │ speak           │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                              │                   │
└──────────────────────────────────────────────┼───────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                           │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │ OpenAI          │  │ ElevenLabs      │                       │
│  │ Assistants API  │  │ TTS API         │                       │
│  └─────────────────┘  └─────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow

**Chat Message Flow:**
```
User types question
        │
        ▼
EmiliaChat component
        │
        ▼
POST /api/emilia/message
        │
        ▼
OpenAI Assistants API (with thread)
        │
        ▼
Response returned
        │
        ▼
POST /api/emilia/speak (if voice enabled)
        │
        ▼
ElevenLabs TTS
        │
        ▼
Audio played in browser
```

---

## 4. Component Breakdown

### 4.1 New Components to Create

| Component | File | Purpose |
|-----------|------|---------|
| HelpBubble | `src/components/HelpBubble.tsx` | Floating button (lower-left) |
| HelpModal | `src/components/HelpModal.tsx` | Modal with tabs + content |
| EmiliaChat | `src/components/EmiliaChat.tsx` | Chat interface |
| EmiliaMessage | `src/components/EmiliaMessage.tsx` | Individual message bubble |
| ManualViewer | `src/components/ManualViewer.tsx` | Markdown renderer for manuals |

### 4.2 New Hooks to Create

| Hook | File | Purpose |
|------|------|---------|
| useEmilia | `src/hooks/useEmilia.ts` | Chat state, messages, thread |
| useEmiliaVoice | `src/hooks/useEmiliaVoice.ts` | TTS playback control |
| useManualContent | `src/hooks/useManualContent.ts` | Load/cache manual content |

### 4.3 New CSS Files

| File | Purpose |
|------|---------|
| `src/components/HelpBubble.css` | Bubble styling |
| `src/components/HelpModal.css` | Modal styling |
| `src/components/EmiliaChat.css` | Chat interface styling |

---

## 5. API Endpoints

### 5.1 POST /api/emilia/thread

**Purpose:** Create new conversation thread

**Request:**
```typescript
{
  // No body required - creates fresh thread
}
```

**Response:**
```typescript
{
  success: true,
  threadId: "thread_abc123",
  message: "Hello! I'm Emilia, your LifeScore help assistant. How can I help you today?"
}
```

### 5.2 POST /api/emilia/message

**Purpose:** Send message and get response

**Request:**
```typescript
{
  threadId: string,
  message: string
}
```

**Response:**
```typescript
{
  success: true,
  response: {
    id: "msg_xyz789",
    content: "To run an enhanced comparison...",
    createdAt: "2026-01-28T12:00:00Z"
  }
}
```

### 5.3 POST /api/emilia/speak

**Purpose:** Generate TTS audio for response

**Request:**
```typescript
{
  text: string,
  voiceId?: string  // Optional, defaults to Emilia's voice
}
```

**Response:**
```typescript
{
  success: true,
  audioUrl: "data:audio/mpeg;base64,..."
  // OR
  audioUrl: "https://..."
}
```

### 5.4 GET /api/emilia/manuals/:type

**Purpose:** Fetch manual content

**Parameters:**
- `type`: "csm" | "tech" | "user"

**Response:**
```typescript
{
  success: true,
  content: "# Customer Service Manual\n\n...",
  lastUpdated: "2026-01-28"
}
```

---

## 6. OpenAI Assistant Setup

### 6.1 Create Emilia Assistant

**Go to:** https://platform.openai.com/assistants

**Configuration:**
```
Name: Emilia - LifeScore Help Assistant
Model: gpt-4o (or gpt-4-turbo)
Instructions: [See below]
Tools: File Search (enabled)
Files: Upload all 7 manual files
```

### 6.2 Assistant Instructions

```
You are Emilia, the friendly and knowledgeable help assistant for LifeScore.

## Your Role
- Help users understand how to use LifeScore
- Answer questions about features, subscriptions, and troubleshooting
- Provide clear, step-by-step guidance
- Be warm, helpful, and concise

## Your Knowledge
You have access to:
1. Customer Service Manual - Support procedures, FAQs, billing
2. Technical Support Manual - Architecture, APIs, debugging
3. User Manual - How to use all features
4. Caching Implementation Guide - Backend performance (for technical questions)
5. Performance Fix Guide - Known issues and solutions
6. Final Schema Requirements - Database information
7. Tavily API Analysis - Search integration details

## Response Guidelines
- Keep responses concise but complete
- Use bullet points and numbered lists for steps
- Reference specific manual sections when helpful
- If you don't know something, say so honestly
- For billing/refund issues, direct to support email

## Personality
- Friendly and approachable
- Patient with confused users
- Professional but not robotic
- Use "I" and speak naturally

## Examples
User: "How do I compare cities?"
Emilia: "To compare cities in LifeScore:

1. Select your first city from the left dropdown
2. Select your second city from the right dropdown
3. Click 'Compare Cities'

The comparison takes 2-3 minutes for Standard mode or 5-8 minutes for Enhanced mode. Would you like to know the difference between these modes?"

User: "Why is it taking so long?"
Emilia: "Enhanced comparisons analyze 100 metrics using multiple AI providers, which takes 5-8 minutes. This thorough analysis gives you more accurate results.

If it's taking longer than 10 minutes, try refreshing the page. Would you like tips on using Standard mode for faster results?"
```

### 6.3 Upload Knowledge Files

Upload these files to the assistant:
1. `CUSTOMER_SERVICE_MANUAL.md`
2. `TECHNICAL_SUPPORT_MANUAL.md`
3. `USER_MANUAL.md`
4. `CACHING_IMPLEMENTATION_GUIDE.md`
5. `PERFORMANCE_FIX_GUIDE.md`
6. `FINAL_SCHEMA_REQUIREMENTS.md`
7. `TAVILY_API_ANALYSIS.md`

### 6.4 Store Assistant ID

After creating, store in Vercel environment variables:
```
EMILIA_ASSISTANT_ID=asst_xxxxxxxxxx
```

---

## 7. Voice Integration

### 7.1 ElevenLabs Voice for Emilia

**Create or select a voice:**
- Go to: https://elevenlabs.io/voice-library
- Choose a friendly, helpful female voice
- Or clone/create a custom "Emilia" voice

**Recommended voices:**
- "Rachel" - Warm, professional
- "Bella" - Friendly, approachable
- Custom clone for unique brand voice

### 7.2 Environment Variable

```
ELEVENLABS_EMILIA_VOICE_ID=xxxxxxxxxx
```

### 7.3 TTS Parameters

```typescript
{
  model_id: 'eleven_multilingual_v2',
  voice_settings: {
    stability: 0.7,        // Slightly more stable than Olivia
    similarity_boost: 0.8,
    style: 0.2,            // Subtle expressiveness
    use_speaker_boost: true
  }
}
```

### 7.4 Voice Controls

| Control | Function |
|---------|----------|
| 🔊 Speaker icon | Play/replay last response |
| 🎤 Microphone | Voice input (future) |
| Auto-speak toggle | Automatically speak responses |

---

## 8. Knowledge Base

### 8.1 Files to Include

| File | Category | Size |
|------|----------|------|
| CUSTOMER_SERVICE_MANUAL.md | User-facing tab | ~15KB |
| TECHNICAL_SUPPORT_MANUAL.md | User-facing tab | ~20KB |
| USER_MANUAL.md | User-facing tab | ~12KB |
| CACHING_IMPLEMENTATION_GUIDE.md | Backend (chat only) | ~18KB |
| PERFORMANCE_FIX_GUIDE.md | Backend (chat only) | ~15KB |
| FINAL_SCHEMA_REQUIREMENTS.md | Backend (chat only) | ~12KB |
| TAVILY_API_ANALYSIS.md | Backend (chat only) | ~10KB |

### 8.2 Knowledge Sync Strategy

When manuals are updated:
1. Re-upload files to OpenAI Assistant
2. Files can be uploaded via API or dashboard
3. Consider automated sync on deploy

---

## 9. Implementation Phases

### Phase 1: Foundation (Day 1-2)
**Time Estimate:** 6-8 hours

- [ ] Create HelpBubble component
- [ ] Create HelpModal component with tabs
- [ ] Create ManualViewer component
- [ ] Add manual content loading
- [ ] Style all components
- [ ] Test modal open/close

**Deliverables:**
- Floating bubble visible on all pages
- Modal opens with 3 tabs
- Manual content displays in tabs

### Phase 2: OpenAI Assistant (Day 2-3)
**Time Estimate:** 4-6 hours

- [ ] Create Emilia assistant in OpenAI
- [ ] Upload all knowledge files
- [ ] Write and test instructions
- [ ] Create /api/emilia/thread endpoint
- [ ] Create /api/emilia/message endpoint
- [ ] Test chat responses

**Deliverables:**
- Emilia assistant configured
- API endpoints working
- Chat returns intelligent responses

### Phase 3: Chat Interface (Day 3-4)
**Time Estimate:** 6-8 hours

- [ ] Create EmiliaChat component
- [ ] Create EmiliaMessage component
- [ ] Implement useEmilia hook
- [ ] Wire up to API endpoints
- [ ] Add loading states
- [ ] Add error handling
- [ ] Style chat interface

**Deliverables:**
- Full chat interface working
- Messages display correctly
- Loading/error states handled

### Phase 4: Voice Integration (Day 4-5)
**Time Estimate:** 4-6 hours

- [ ] Create /api/emilia/speak endpoint
- [ ] Select/configure Emilia voice in ElevenLabs
- [ ] Implement useEmiliaVoice hook
- [ ] Add audio playback controls
- [ ] Add auto-speak toggle
- [ ] Test voice responses

**Deliverables:**
- Emilia speaks responses
- Audio controls work
- Voice quality acceptable

### Phase 5: Conversation Features (Day 5-6)
**Time Estimate:** 4-6 hours

- [ ] Implement conversation download (JSON/TXT)
- [ ] Implement conversation print
- [ ] Add replay functionality
- [ ] Add clear conversation
- [ ] Persist thread ID in session
- [ ] Test all features

**Deliverables:**
- Download works (JSON/TXT formats)
- Print works
- Replay works
- All conversation management features complete

### Phase 6: Polish & Testing (Day 6-7)
**Time Estimate:** 4-6 hours

- [ ] Responsive design testing
- [ ] Cross-browser testing
- [ ] Accessibility review
- [ ] Performance optimization
- [ ] Error edge cases
- [ ] Final styling tweaks

**Deliverables:**
- Fully polished feature
- Works on all devices
- No bugs

---

## 10. File Structure

### New Files to Create

```
src/
├── components/
│   ├── HelpBubble.tsx          # Floating bubble
│   ├── HelpBubble.css
│   ├── HelpModal.tsx           # Modal container
│   ├── HelpModal.css
│   ├── EmiliaChat.tsx          # Chat interface
│   ├── EmiliaChat.css
│   ├── EmiliaMessage.tsx       # Message bubbles
│   └── ManualViewer.tsx        # Markdown renderer
│
├── hooks/
│   ├── useEmilia.ts            # Chat state management
│   ├── useEmiliaVoice.ts       # TTS control
│   └── useManualContent.ts     # Manual loading
│
└── types/
    └── emilia.ts               # TypeScript types

api/
├── emilia/
│   ├── thread.ts               # Create thread
│   ├── message.ts              # Send/receive messages
│   ├── speak.ts                # TTS generation
│   └── manuals.ts              # Fetch manual content
```

### Files to Modify

```
src/
├── App.tsx                     # Add HelpBubble to layout
└── App.css                     # Ensure no z-index conflicts
```

---

## 11. Detailed Code Specifications

### 11.1 HelpBubble Component

```typescript
// src/components/HelpBubble.tsx

interface HelpBubbleProps {
  onClick: () => void;
}

const HelpBubble: React.FC<HelpBubbleProps> = ({ onClick }) => {
  return (
    <button
      className="help-bubble"
      onClick={onClick}
      aria-label="Open help"
      title="Need help? Click to open Emilia"
    >
      <span className="help-bubble-icon">?</span>
      <span className="help-bubble-label">Help</span>
    </button>
  );
};
```

**CSS:**
```css
.help-bubble {
  position: fixed;
  bottom: 24px;
  left: 24px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #14B8A6 0%, #0D9488 100%);
  border: none;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(20, 184, 166, 0.4);
  transition: transform 0.2s, box-shadow 0.2s;
  z-index: 1000;
}

.help-bubble:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(20, 184, 166, 0.5);
}

.help-bubble-icon {
  font-size: 24px;
  font-weight: bold;
  color: white;
}

.help-bubble-label {
  font-size: 10px;
  color: white;
  margin-top: 2px;
}
```

### 11.2 HelpModal Component

```typescript
// src/components/HelpModal.tsx

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'csm' | 'tech' | 'user';

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('user');
  const [showChat, setShowChat] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="help-modal-overlay" onClick={onClose}>
      <div className="help-modal" onClick={e => e.stopPropagation()}>
        <div className="help-modal-header">
          <div className="help-modal-tabs">
            <button
              className={`help-tab ${activeTab === 'csm' ? 'active' : ''}`}
              onClick={() => setActiveTab('csm')}
            >
              Customer Service
            </button>
            <button
              className={`help-tab ${activeTab === 'tech' ? 'active' : ''}`}
              onClick={() => setActiveTab('tech')}
            >
              Tech Support
            </button>
            <button
              className={`help-tab ${activeTab === 'user' ? 'active' : ''}`}
              onClick={() => setActiveTab('user')}
            >
              User Manual
            </button>
          </div>
          <button className="help-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="help-modal-content">
          {showChat ? (
            <EmiliaChat onBack={() => setShowChat(false)} />
          ) : (
            <>
              <ManualViewer type={activeTab} />
              <button
                className="ask-emilia-button"
                onClick={() => setShowChat(true)}
              >
                <span className="ask-emilia-icon">?</span>
                <span>Ask Emilia for Help</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
```

### 11.3 useEmilia Hook

```typescript
// src/hooks/useEmilia.ts

interface EmiliaMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audioUrl?: string;
}

interface UseEmiliaReturn {
  messages: EmiliaMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  clearConversation: () => void;
  downloadConversation: (format: 'json' | 'txt') => void;
  printConversation: () => void;
}

export function useEmilia(): UseEmiliaReturn {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<EmiliaMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize thread
  useEffect(() => {
    const initThread = async () => {
      try {
        const response = await fetch('/api/emilia/thread', {
          method: 'POST'
        });
        const data = await response.json();
        setThreadId(data.threadId);

        // Add welcome message
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: data.message,
          timestamp: new Date()
        }]);
      } catch (err) {
        setError('Failed to initialize Emilia');
      }
    };

    initThread();
  }, []);

  const sendMessage = async (text: string) => {
    if (!threadId) return;

    // Add user message
    const userMessage: EmiliaMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/emilia/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, message: text })
      });
      const data = await response.json();

      // Add assistant message
      const assistantMessage: EmiliaMessage = {
        id: data.response.id,
        role: 'assistant',
        content: data.response.content,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setThreadId(null);
    // Re-initialize will happen via useEffect
  };

  const downloadConversation = (format: 'json' | 'txt') => {
    const content = format === 'json'
      ? JSON.stringify(messages, null, 2)
      : messages.map(m => `${m.role}: ${m.content}`).join('\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emilia-conversation.${format}`;
    a.click();
  };

  const printConversation = () => {
    const printContent = messages
      .map(m => `<p><strong>${m.role}:</strong> ${m.content}</p>`)
      .join('');

    const printWindow = window.open('', '_blank');
    printWindow?.document.write(`
      <html>
        <head><title>Emilia Conversation</title></head>
        <body>${printContent}</body>
      </html>
    `);
    printWindow?.print();
  };

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearConversation,
    downloadConversation,
    printConversation
  };
}
```

### 11.4 API Endpoint - Thread

```typescript
// api/emilia/thread.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const EMILIA_ASSISTANT_ID = process.env.EMILIA_ASSISTANT_ID;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create new thread
    const thread = await openai.beta.threads.create();

    // Send welcome message
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: 'Hello, I need help with LifeScore.'
    });

    // Run assistant to get welcome response
    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: EMILIA_ASSISTANT_ID!
    });

    // Get the response
    const messages = await openai.beta.threads.messages.list(thread.id);
    const welcomeMessage = messages.data[0]?.content[0];

    const welcomeText = welcomeMessage?.type === 'text'
      ? welcomeMessage.text.value
      : "Hello! I'm Emilia, your LifeScore help assistant. How can I help you today?";

    res.json({
      success: true,
      threadId: thread.id,
      message: welcomeText
    });
  } catch (error) {
    console.error('[EMILIA] Thread creation error:', error);
    res.status(500).json({
      error: 'Failed to create conversation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

### 11.5 API Endpoint - Message

```typescript
// api/emilia/message.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const EMILIA_ASSISTANT_ID = process.env.EMILIA_ASSISTANT_ID;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { threadId, message } = req.body;

  if (!threadId || !message) {
    return res.status(400).json({ error: 'threadId and message required' });
  }

  try {
    // Add user message to thread
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: message
    });

    // Run assistant
    const run = await openai.beta.threads.runs.createAndPoll(threadId, {
      assistant_id: EMILIA_ASSISTANT_ID!
    });

    if (run.status !== 'completed') {
      throw new Error(`Run failed with status: ${run.status}`);
    }

    // Get latest message
    const messages = await openai.beta.threads.messages.list(threadId, {
      limit: 1,
      order: 'desc'
    });

    const latestMessage = messages.data[0];
    const content = latestMessage?.content[0];

    const responseText = content?.type === 'text'
      ? content.text.value
      : "I'm sorry, I couldn't generate a response. Please try again.";

    res.json({
      success: true,
      response: {
        id: latestMessage?.id || `msg-${Date.now()}`,
        content: responseText,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[EMILIA] Message error:', error);
    res.status(500).json({
      error: 'Failed to get response',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

### 11.6 API Endpoint - Speak

```typescript
// api/emilia/speak.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';

const EMILIA_VOICE_ID = process.env.ELEVENLABS_EMILIA_VOICE_ID || 'Rachel';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'text required' });
  }

  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  if (!elevenLabsKey) {
    return res.status(500).json({ error: 'TTS not configured' });
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${EMILIA_VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': elevenLabsKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.7,
            similarity_boost: 0.8,
            style: 0.2,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs error: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    res.json({
      success: true,
      audioUrl: `data:audio/mpeg;base64,${base64}`
    });
  } catch (error) {
    console.error('[EMILIA] TTS error:', error);
    res.status(500).json({
      error: 'Failed to generate speech',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

---

## 12. Testing Plan

### 12.1 Unit Tests

| Test | Component | Expected |
|------|-----------|----------|
| Bubble renders | HelpBubble | Visible, clickable |
| Modal opens | HelpModal | Opens on bubble click |
| Tabs switch | HelpModal | Content changes per tab |
| Chat loads | EmiliaChat | Thread created, welcome shown |
| Message sends | EmiliaChat | User message appears |
| Response received | EmiliaChat | Emilia response appears |
| Voice plays | EmiliaChat | Audio plays on click |
| Download works | EmiliaChat | File downloads |
| Print works | EmiliaChat | Print dialog opens |

### 12.2 Integration Tests

| Test | Flow | Expected |
|------|------|----------|
| Full chat flow | Open → Chat → Get response | Works end-to-end |
| Voice flow | Chat → Speak response | Audio plays correctly |
| Tab + Chat | View manual → Open chat → Return | State preserved |
| Session persist | Chat → Close → Reopen | Thread continues |

### 12.3 Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| API timeout | Show error, allow retry |
| Empty message | Prevent send |
| Very long message | Handle gracefully |
| Network offline | Show offline message |
| Multiple rapid messages | Queue and process in order |

---

## 13. Deployment Checklist

### Pre-Deployment

- [ ] Create Emilia assistant in OpenAI
- [ ] Upload all 7 knowledge files to assistant
- [ ] Configure Emilia voice in ElevenLabs
- [ ] Add environment variables to Vercel:
  - [ ] `EMILIA_ASSISTANT_ID`
  - [ ] `ELEVENLABS_EMILIA_VOICE_ID`
- [ ] Test locally end-to-end
- [ ] Review all styling

### Deployment

- [ ] Push all code to GitHub
- [ ] Verify Vercel deployment succeeds
- [ ] Test production bubble appears
- [ ] Test production chat works
- [ ] Test production voice works
- [ ] Monitor for errors

### Post-Deployment

- [ ] Gather user feedback
- [ ] Monitor OpenAI usage costs
- [ ] Monitor ElevenLabs usage
- [ ] Track common questions (for manual updates)

---

## Environment Variables Summary

| Variable | Description | Required |
|----------|-------------|----------|
| `EMILIA_ASSISTANT_ID` | OpenAI Assistant ID | Yes |
| `ELEVENLABS_EMILIA_VOICE_ID` | Voice ID for Emilia | Yes |
| `OPENAI_API_KEY` | OpenAI API key (existing) | Yes |
| `ELEVENLABS_API_KEY` | ElevenLabs key (existing) | Yes |

---

## Estimated Timeline

| Phase | Days | Hours |
|-------|------|-------|
| Phase 1: Foundation | 1-2 | 6-8 |
| Phase 2: OpenAI Setup | 1 | 4-6 |
| Phase 3: Chat Interface | 1-2 | 6-8 |
| Phase 4: Voice | 1 | 4-6 |
| Phase 5: Features | 1 | 4-6 |
| Phase 6: Polish | 1 | 4-6 |
| **Total** | **6-7 days** | **28-40 hours** |

---

## Summary

Emilia is a comprehensive help system that will:

1. **Improve user self-service** - Users find answers without support tickets
2. **Reduce support load** - Common questions answered instantly
3. **Provide voice interaction** - Accessible and modern experience
4. **Work for all users** - No tier restrictions on help access

The implementation follows the same patterns as Olivia, ensuring code consistency and maintainability.

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-28 | AI Assistant | Initial creation |
