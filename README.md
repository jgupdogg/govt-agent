# Government Agent Vector Search

This application provides a vector search interface for government information using Pinecone vector database with a FastAPI backend and React frontend. It also includes the foundation for RAG (Retrieval Augmented Generation) chat capabilities.

## Project Overview

The application consists of two main components:

- **Backend**: A FastAPI server that connects to a Pinecone vector database to search for semantically similar content
- **Frontend**: A React application with a search interface and a chat component for future RAG functionality

## Setup Instructions

### Prerequisites

- Python 3.8+ (for the backend)
- Node.js 14+ (for the frontend)
- Pinecone account with API key
- Anthropic API key (for Claude)
- OpenAI API key (for embeddings)

### Backend Setup

1. Create and activate a virtual environment:

```bash
cd backend
python -m venv venv

# On Windows
venv\Scripts\activate

# On macOS/Linux
source venv/bin/activate
```

2. Install required dependencies:

```bash
pip install fastapi uvicorn langchain-anthropic langchain-pinecone langchain-openai pinecone-client python-dotenv

# Save dependencies to requirements.txt (optional)
pip freeze > requirements.txt
```

3. Create a `.env` file in the backend directory:

```
ANTHROPIC_API_KEY=your_anthropic_api_key
PINECONE_API_KEY=your_pinecone_api_key
OPENAI_API_KEY=your_openai_api_key
```

4. Start the backend server:

```bash
uvicorn app:app --reload
```

The backend should now be running at http://localhost:8000.

### Frontend Setup

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Create a `.env` file in the frontend directory:

```
VITE_API_BASE_URL=http://localhost:8000
```

3. Install dependencies:

```bash
npm install
# or
yarn
```

4. Start the development server:

```bash
npm run dev
# or
yarn dev
```

The frontend should now be running at http://localhost:5173 (or similar).

## Pinecone Configuration

This application uses a Pinecone vector database with the following configuration:

- **Index Name**: govt-scrape-index
- **Metric**: cosine
- **Dimensions**: 1536
- **Host**: https://govt-scrape-index-284b01c.svc.aped-4627-b74a.pinecone.io
- **Cloud**: AWS
- **Region**: us-east-1
- **Type**: Dense
- **Capacity Mode**: Serverless

## Project Structure

```
govt-agent/
├── backend/               # Backend code
│   ├── venv/              # Virtual environment (not tracked in git)
│   ├── .env               # Environment variables (not tracked in git)
│   ├── app.py             # FastAPI application
│   ├── core.py            # Core functionality
│   └── requirements.txt   # Python dependencies
├── frontend/              # Frontend code
│   ├── node_modules/      # Node.js dependencies (not tracked in git)
│   ├── public/            # Static files
│   ├── src/               # Source code
│   │   ├── contexts/      # React contexts
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── App.tsx        # Main application component
│   ├── .env               # Frontend environment variables (not tracked in git)
│   ├── index.html         # HTML entry point
│   ├── package.json       # Node.js dependencies and scripts
│   └── tailwind.config.js # Tailwind CSS configuration
└── README.md              # Project documentation
```

## Features

- **Vector Search**: Search for relevant government information using semantic similarity
- **Dark/Light Mode**: Toggle between dark and light themes
- **Responsive Design**: Works on desktop and mobile devices
- **RAG Chat**: Foundation for retrieval-augmented generation chat (upcoming)

## Troubleshooting

### Backend Issues

- **Import errors**: Make sure all packages are installed in your virtual environment
- **API key errors**: Check that your `.env` file contains the correct API keys
- **Pinecone connection issues**: Verify your Pinecone API key and index name

### Frontend Issues

- **API connection errors**: Ensure your backend is running and CORS is properly configured
- **Styling issues**: Make sure Tailwind CSS is properly set up

## Development Notes

- The backend includes a fallback to mock data if the Pinecone connection fails
- The frontend will automatically try to connect to a local backend if the remote URL fails

## Future Enhancements

- Implement full RAG chat functionality using LangChain and Anthropic's Claude
- Add user authentication
- Enhance search capabilities with filters
- Add analytics and usage tracking