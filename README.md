# LuxMail Agent 📬🤖

LuxMail Agent is a desktop-native, open-source email monitor and notification client. It polls local mailboxes securely via IMAP, classifies incoming emails using AI (Gemini 1.5 Flash, OpenAI GPT, or DeepSeek), and automatically forwards high-priority alerts (such as job interview invitations or offers) directly to your WhatsApp.

Built with absolute privacy in mind (**Zero-Trust / Edge-native**), LuxMail Agent runs 100% locally on your machine. This eliminates third-party server hosting costs, prevents data exposure, and bypasses the strict and expensive security audits required by Google OAuth for reading mailboxes on web-based SaaS platforms.

---

## ✨ Features

- **Local IMAP Monitoring**: Listen for new incoming emails via IMAP/SSL securely (works with Gmail App Passwords, Outlook, Yahoo, and custom corporate email).
- **Multi-AI Engine Support**: 
  - **Google Gemini 1.5 Flash** (Recommended; fast & high context free tier).
  - **DeepSeek API** (Extremely cost-effective reasoning model).
  - **OpenAI GPT** (GPT-4o-mini).
- **Local WhatsApp Automation**: Integrates a virtual, headless WhatsApp Web client inside Electron. No Meta Business API fees. Simply scan the QR code to link your phone.
- **Cupertino OLED Dark Aesthetic**: Premium visual user interface following the signature **Luxnode iOS** dark tactical palette (Obsidian base, gold/indigo borders).
- **Docker-Ready**: Modular engine ready to be built as a standalone service container for deployment on Home Servers (Raspberry Pi/Mini-PC) or integration into Home Assistant.

---

## 🏗️ Architecture

```
                                      +---------------------------------------------+
                                      |                 YOUR DEVICE                 |
                                      |                                             |
  +------------------+   IMAP (SSL)   |   +------------------+                      |
  |   Email Server   | -------------> |   |   Mail Monitor   |                      |
  |  (Gmail/Outlook) |                |   +------------------+                      |
  +------------------+                |            |                                |
                                      |            v                                |
  +------------------+   https post   |   +------------------+                      |
  |      AI API      | <------------> |   |   AI Classifier  | (Gemini/DeepSeek/GPT)|
  | (Gemini/OpenAI)  |                |   +------------------+                      |
  +------------------+                |            | (If Urgent)                    |
                                      |            v                                |
  +------------------+   Headless Web |   +------------------+                      |
  |   WhatsApp Web   | <------------> |   | WhatsApp Engine  | (whatsapp-web.js)    |
  |     Servers      |                |   +------------------+                      |
  +------------------+                +---------------------------------------------+
```

---

## 🛠️ Tech Stack

- **Desktop Framework**: Electron + TypeScript
- **Frontend**: React 18 + Vite + Tailwind CSS
- **IMAP Client**: `imapflow` (Promise-based client with IDLE connection support)
- **WhatsApp Bridge**: `whatsapp-web.js` (Headless browser orchestration)
- **AI Integration**: Official `@google/generativeai` and `openai` Node SDKs

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18.x or later)
- npm (v9.x or later)
- An API Key from [Google AI Studio](https://aistudio.google.com/) (Gemini), [OpenAI Platform](https://platform.openai.com/), or [DeepSeek Console](https://platform.deepseek.com/).

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/13CraZy/luxmail-agent.git
   cd luxmail-agent
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Setup environment variables:
   Create a `.env` file in the root folder for testing configuration (optional, as the UI saves configurations securely in your local system user directory).

4. Start development server:
   ```bash
   npm run dev
   ```

---

## 🐳 Docker Deployment (For Home Server / Self-Hosting)

You can run the LuxMail Agent engine in headless service mode inside Docker. Refer to the `Dockerfile` and `docker-compose.yml` configs in the project root directory.

Run the service:
```bash
docker-compose up -d
```
Once initialized, access the logs or terminal CLI to scan the WhatsApp linking QR code.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
