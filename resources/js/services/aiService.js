// resources/js/services/aiService.js

const API_BASE_URL = 'http://localhost:8001/api/ml'; // ← Directo a FastAPI

class AIService {
  async request(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error:', error);
      return { success: false, error: error.message };
    }
  }

  // Naive Bayes
  async classifyQuick(query) {
    return await this.request(`${API_BASE_URL}/classify/quick`, {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  }

  // KNN
  async findSimilar(query, nSimilar = 5) {
    return await this.request(`${API_BASE_URL}/similar`, {
      method: 'POST',
      body: JSON.stringify({ query, n_similar: nSimilar }),
    });
  }

  // MLP
  async predictComplex(query) {
    return await this.request(`${API_BASE_URL}/predict/complex`, {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  }

  // Ensemble
  async predictEnsemble(query) {
    return await this.request(`${API_BASE_URL}/predict/ensemble`, {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  }

  // Comparar
  async compareAll(query, nSimilar = 3) {
    return await this.request(`${API_BASE_URL}/compare`, {
      method: 'POST',
      body: JSON.stringify({ query, n_similar: nSimilar }),
    });
  }

  // Health check
  async healthCheck() {
    return await this.request('http://localhost:8001/health');
  }

  // Tracking (este sí va a Laravel)
  async trackSearch(searchData) {
    return await this.request('/ai/track', {
      method: 'POST',
      body: JSON.stringify(searchData),
    });
  }
}

export default new AIService();
