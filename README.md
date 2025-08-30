# 🧭 Code Navigator AI Assistant

The **Code Navigator AI Assistant** is a comprehensive, AI-powered agent designed to tackle a significant real-world problem: the steep learning curve and barriers to entry for developers joining new or complex open-source projects. It acts as a personal guide, providing an **end-to-end workflow** for understanding unfamiliar codebases and making meaningful contributions to open-source projects.

This project was built for a hackathon with the core task of creating an AI-powered agent that solves a real-world problem by integrating with a third-party platform and using Descope for secure authentication.

---

## 🎯 How It Solves a Real-World Problem

For many developers, especially those early in their careers, contributing to open-source can be intimidating. Large codebases are often overwhelming, and finding a suitable first issue can be a challenge. The Code Navigator AI Assistant directly addresses this by providing two core sets of features:

* **Offline Code-to-Codebase Guide**: This allows developers to analyze code locally and privately.
    * **Code Summarization**: Get quick, AI-generated summaries of code snippets.
    * **Visual Code Map**: Explore the repository's structure through an intuitive file explorer.
    * **Intelligent Q&A**: Ask natural language questions about the codebase and get relevant answers from an AI assistant.
* **Open-Source On-Ramp**: A guided platform for new developers to find and contribute to "good first issues" on GitHub.
    * **Intelligent Issue Finder**: Searches for relevant "good first issues" on GitHub based on the user's skills.
    * **AI-Powered Contribution Plan**: Generates a step-by-step plan to guide the user through fixing an issue.
    * **Contributor Dashboard**: Gamifies the contribution journey by tracking and displaying a user's progress on open-source projects.

---

## 🏆 Hackathon Compliance

### Core Task

The Code Navigator AI Assistant is an AI-powered agent that solves the real-world problem of onboarding developers to new codebases. It integrates with **GitHub**, a third-party platform, to perform its actions. The agent can:

* Search for issues on GitHub based on user-provided skills.
* Fetch issue details from GitHub.
* Analyze GitHub repositories.
* Generate a step-by-step plan to contribute to a GitHub issue.

### Descope Requirement

A key requirement of the hackathon was to use **Descope Outbound Apps** for secure authentication, and this project fully complies with that.

* **Secure Authentication**: The application uses Descope Outbound Apps to handle secure authentication with the GitHub API. This means there are **no hardcoded API tokens or custom OAuth logic**. Instead, a Descope Flow is used to securely manage and issue tokens for the agent.
* **Minimal User Effort**: The solution is designed to require minimal user effort after the initial setup. The user logs in with their GitHub account, and Descope handles the token management seamlessly in the background.

### Key Deliverables & Expectations

* **Real-World Problem**: The agent addresses the specific, real-world problem of making open-source contributions more accessible.
* **Descope Outbound Apps**: The project uses Descope Outbound Apps to authenticate securely with at least one external API.
* **No Hardcoded Credentials**: The application avoids hardcoded credentials and manual token exchange.
* **Working Solution**: The final product is a working solution that is stable, complete, and reliable.
* **Thoughtful Architecture**: The project has a thoughtful architecture with clearly defined frontend and backend components.
* **End-to-End Workflow**: The project provides a clear demonstration of the end-to-end workflow, highlighting the security and system interaction.

---

## 🛠️ Technologies Used

### Backend

* **FastAPI**: A modern, high-performance web framework for building APIs.
* **Descope Outbound Apps**: For secure user authentication and managing GitHub access tokens.
* **Ollama**: A local-first Large Language Model (LLM) for code explanation and Q&A. This project uses the `llama2:7b-chat` model.
* **GitPython**: To programmatically clone and interact with Git repositories.
* **Requests**: A simple HTTP library for making API calls.
* **python-multipart**: For handling form data and file uploads.
* **python-dotenv**: For managing environment variables.

### Frontend

* **React**: A JavaScript library for building user interfaces.
* **TypeScript**: Adds static types for better code quality and maintainability.
* **Material-UI (MUI)**: A responsive UI framework for building beautiful and accessible user interfaces.
* **React Router**: For handling page navigation and routing.
* **Descope React SDK**: For seamless integration with Descope for GitHub authentication.

---

## 📁 Project Structure

.
├── backend/
│   ├── .env
│   ├── main.py
│   ├── requirements.txt
│   ├── start_server.bat
│   ├── test_ollama.py
│   └── users.json
├── frontend/
│   ├── public/
│   │   ├── favicon.ico
│   │   ├── index.html
│   │   ├── logo192.png
│   │   ├── logo512.png
│   │   ├── manifest.json
│   │   └── robots.txt
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatComponent.tsx
│   │   │   ├── CodebaseAnalysis.tsx
│   │   │   ├── CodeInput.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── FileExplorer.tsx
│   │   │   ├── GuidedContribution.tsx
│   │   │   ├── IssueFinder.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Navbar.tsx
│   │   │   └── RepositoryInput.tsx
│   │   ├── theme/
│   │   │   └── theme.ts
│   │   ├── App.css
│   │   ├── App.test.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── index.tsx
│   │   ├── logo.svg
│   │   ├── react-app-env.d.ts
│   │   ├── reportWebVitals.ts
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── setupTests.ts
│   │   └── types.ts
│   ├── package.json
│   ├── package-lock.json
│   └── tsconfig.json
├── shared/
│   └── types/
│       └── index.ts
├── .gitignore
└── README.md

---

## 🚀 Setup Instructions

### Prerequisites

* Python **3.9+**
* Node.js
* [Ollama](https://ollama.ai) installed and running locally with the **llama2:7b-chat** model.
* A **Descope account** with:
    * An active project.
    * A configured **GitHub Outbound App**.
    * The redirect URL set to `http://localhost:3001`.

### Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```
2.  **Create and activate a virtual environment:**
    * **Windows:**
        ```bash
        python -m venv venv
        venv\Scripts\activate
        ```
    * **macOS/Linux:**
        ```bash
        python -m venv venv
        source venv/bin/activate
        ```
3.  **Install the required dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
4.  **Create a `.env` file** in the `backend` directory and add the following, replacing the placeholder values with your actual credentials:
    ```env
    DESCOPE_PROJECT_ID="your_project_id"
    OLLAMA_BASE_URL="http://localhost:11434"
    OLLAMA_MODEL="llama2:7b-chat"
    GITHUB_PAT="your_github_pat"
    ```
5.  **Run the backend server:**
    ```bash
    uvicorn main:app --reload
    ```
    For Windows users, you can also use the provided batch script:
    ```bash
    start_server.bat
    ```

### Frontend Setup

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```
2.  **Install the required npm packages:**
    ```bash
    npm install
    ```
3.  **Run the React application:**
    ```bash
    npm start
    ```
    > ⚠️ To match your **Descope redirect URL**, you may need to run the frontend on port `3001`:
    * **Windows:**
        ```bash
        set PORT=3001 && npm start
        ```
    * **macOS/Linux:**
        ```bash
        export PORT=3001 && npm start
        ```

The frontend will be running at [http://localhost:3001](http://localhost:3001).

---

## ⚙️ How to Use

1.  **Open the application** in your browser at [http://localhost:3001](http://localhost:3001).
2.  **Log in with GitHub**: The application uses Descope for secure authentication.
3.  **Explore the Dashboard**:
    * **Analyze a Repository**: Enter a GitHub repository URL to view its file structure.
    * **View File Content**: Click on a file in the file explorer to see its contents.
    * **AI Assistant Q&A**: Ask natural language questions about the codebase in the chat interface.
    * **Find Issues**: Search for "good first issues" based on your skills and start contributing to open-source projects.
    * **Get a Contribution Plan**: Select an issue to get an AI-generated step-by-step plan on how to contribute a fix.

---

## ✨ Why This Project is a Game-Changer

The **Code Navigator AI Assistant** is more than just a tool; it's a comprehensive platform that empowers developers to confidently navigate and contribute to the open-source community. By leveraging the power of AI and secure authentication, it removes the barriers to entry and fosters a more inclusive and collaborative environment for developers of all skill levels. This project not only meets the requirements of the hackathon but also provides a valuable and practical solution to a real-world problem faced by the developer community.
