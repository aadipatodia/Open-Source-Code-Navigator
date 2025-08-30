import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

export const codeAPI = {
  explainCode: async (code: string, context: string, token: string) => {
    const response = await axios.post(
      `${API_BASE_URL}/api/explain/code`,
      { code, context },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  },

  analyzeStructure: async (code: string, filePath: string, token: string) => {
    const response = await axios.post(
      `${API_BASE_URL}/api/analyze/structure`,
      { code, filePath },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  },

  askQuestion: async (question: string, codeContext: string, token: string) => {
    const response = await axios.post(
      `${API_BASE_URL}/api/ask/code`,
      { question, codeContext },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  },
};

export const userAPI = {
  getProfile: async (token: string) => {
    const response = await axios.get(`${API_BASE_URL}/api/user/profile`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return response.data;
  },

  getAnalysisHistory: async (token: string) => {
    const response = await axios.get(`${API_BASE_URL}/api/user/history`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return response.data;
  },
};