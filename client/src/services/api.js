const BASE_URL = '/api';

export const api = {
  async fetchCoaches() {
    const res = await fetch(`${BASE_URL}/coaches`);
    if (!res.ok) throw new Error('Failed to fetch coaches');
    return res.json();
  },

  async registerCandidate(data) {
    const res = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) {
      throw result;
    }
    return result;
  },

  async startTest(token, testId) {
    const res = await fetch(`${BASE_URL}/start-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, testId })
    });
    const result = await res.json();
    if (!res.ok) throw result;
    return result;
  },

  async saveProgress(token, testId, answers, timeSpentSeconds) {
    try {
      const res = await fetch(`${BASE_URL}/save-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, testId, answers, timeSpentSeconds })
      });
      return res.json();
    } catch (e) {
      console.warn('Autosave warning:', e);
    }
  },

  async recordViolation(token, testId, violationType, details) {
    const res = await fetch(`${BASE_URL}/violation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, testId, violationType, details })
    });
    return res.json();
  },

  async uploadSnapshot(testId, candidateId, blob, reason) {
    try {
      const formData = new FormData();
      formData.append('snapshot', blob, 'webcam.jpg');
      formData.append('testId', testId);
      formData.append('candidateId', candidateId);
      formData.append('reason', reason || 'proctor_audit');

      const res = await fetch(`${BASE_URL}/upload-snapshot`, {
        method: 'POST',
        body: formData
      });
      return res.json();
    } catch (e) {
      console.warn('Snapshot upload error:', e);
    }
  },

  async submitTest(payload) {
    const res = await fetch(`${BASE_URL}/submit-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (!res.ok) throw result;
    return result;
  },

  async fetchScorecard(id) {
    const res = await fetch(`${BASE_URL}/scorecard/${id}`);
    const result = await res.json();
    if (!res.ok) throw result;
    return result;
  },

  async fetchAdminCandidates() {
    const res = await fetch(`${BASE_URL}/admin/candidates`);
    const result = await res.json();
    if (!res.ok) throw result;
    return result;
  },

  async fetchAdminCandidateDetail(candidateId) {
    const res = await fetch(`${BASE_URL}/admin/candidate-detail/${candidateId}`);
    const result = await res.json();
    if (!res.ok) throw result;
    return result;
  },

  async deleteAdminCandidate(candidateId) {
    const res = await fetch(`${BASE_URL}/admin/candidate/${candidateId}`, {
      method: 'DELETE'
    });
    const result = await res.json();
    if (!res.ok) throw result;
    return result;
  }
};
