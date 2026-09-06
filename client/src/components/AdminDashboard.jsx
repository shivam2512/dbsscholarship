import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Users, Award, ShieldAlert, Download, Search, Filter,
  CheckCircle, XCircle, AlertTriangle, Eye, Camera, Clock, Key, ArrowRight, RotateCcw, Trash2
} from 'lucide-react';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCoach, setSelectedCoach] = useState('All');
  const [selectedTier, setSelectedTier] = useState('All');
  const [coachesList, setCoachesList] = useState([]);
  const [googleSheetStatus, setGoogleSheetStatus] = useState(null);

  // Candidate Detail Inspection Modal
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [candidateDetail, setCandidateDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadCandidates();
      api.fetchCoaches().then(data => {
        if (data.coaches) setCoachesList(data.coaches);
      }).catch(console.warn);
    }
  }, [isAuthenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (pin === 'admin123' || pin === 'admin' || pin === 'scholarship') {
      setIsAuthenticated(true);
      setPinError('');
    } else {
      setPinError('Invalid Admin PIN. (Default PIN is admin123)');
    }
  };

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const res = await api.fetchAdminCandidates();
      setCandidates(res.candidates || []);
      if (res.googleSheets) {
        setGoogleSheetStatus(res.googleSheets);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInspectCandidate = async (candidateId) => {
    setSelectedCandidateId(candidateId);
    setDetailLoading(true);
    try {
      const detail = await api.fetchAdminCandidateDetail(candidateId);
      setCandidateDetail(detail);
    } catch (err) {
      console.error('Error fetching candidate detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteCandidate = async (candidate) => {
    const confirmMsg = `Are you sure you want to delete the record for "${candidate.fullName}" (${candidate.email})?\n\nThis will clear their score and allow them to take a RETEST.`;
    if (window.confirm(confirmMsg)) {
      try {
        const res = await api.deleteAdminCandidate(candidate.id);
        alert(res.message || `Entry removed. Retest is now enabled for ${candidate.fullName}.`);
        loadCandidates();
      } catch (err) {
        console.error('Delete error:', err);
        alert('Failed to remove candidate: ' + (err.error || err.message));
      }
    }
  };

  // Stats
  const total = candidates.length;
  const completed = candidates.filter(c => c.testStatus === 'completed' || c.totalScore !== null);
  const platinumCount = candidates.filter(c => c.scholarshipTier?.includes('Platinum')).length;
  const goldCount = candidates.filter(c => c.scholarshipTier?.includes('Gold')).length;
  const silverCount = candidates.filter(c => c.scholarshipTier?.includes('Silver')).length;

  const avgScore = completed.length > 0
    ? Math.round(completed.reduce((acc, c) => acc + (c.totalScore || 0), 0) / completed.length)
    : 0;

  // Filtered list
  const filteredCandidates = candidates.filter(c => {
    const matchesSearch =
      c.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery);

    const matchesCoach = selectedCoach === 'All' || c.coach === selectedCoach;
    const matchesTier = selectedTier === 'All' ||
      (selectedTier === 'Scholarship' && c.percentage >= 60) ||
      (selectedTier === 'Below 60%' && c.percentage < 60) ||
      c.scholarshipTier?.includes(selectedTier);

    return matchesSearch && matchesCoach && matchesTier;
  });

  if (!isAuthenticated) {
    return (
      <div className="container py-5" style={{ maxWidth: 460 }}>
        <div className="card border-0 shadow-sm rounded-4 p-4 text-center bg-white">
          <div className="d-flex align-items-center justify-content-center mx-auto mb-3 bg-primary bg-opacity-10 text-primary rounded-circle" style={{ width: 56, height: 56 }}>
            <Key className="w-6 h-6" />
          </div>
          <h2 className="fs-4 fw-bold text-dark mb-1">Admin & Coach Portal</h2>
          <p className="small text-muted mb-4">Enter security PIN to access proctoring audits and candidate scorecards.</p>

          {pinError && (
            <div className="alert alert-danger rounded-3 mb-3 p-3 small">
              {pinError}
            </div>
          )}

          <form onSubmit={handleLogin} className="d-grid gap-3">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN (admin123)"
              className="form-control form-control-lg text-center fs-5 rounded-3"
              autoFocus
            />
            <button type="submit" className="btn btn-primary w-100 py-2.5 fs-6 fw-bold rounded-3">
              Unlock Dashboard <ArrowRight className="w-4 h-4 ms-1" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* Top Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <span className="small fw-bold text-primary text-uppercase tracking-wider">Administration Suite</span>
          <h1 className="fs-2 fw-bold text-dark mb-0">Live Proctoring & Candidate Leaderboard</h1>
        </div>

        <div className="d-flex align-items-center gap-2">
          <a
            href="/api/admin/export-csv"
            download="scholarship_results.csv"
            className="btn btn-outline-secondary py-2 px-3 fs-6 fw-bold d-flex align-items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </a>
          <button
            onClick={loadCandidates}
            className="btn btn-primary py-2 px-3 fs-6 fw-bold d-flex align-items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            Refresh Data
          </button>
        </div>
      </div>

      {/* Google Sheets Status Banner */}
      <div className="alert alert-success d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4 p-3 border-0 shadow-sm rounded-3">
        <div className="d-flex align-items-center gap-2">
          <span className="pulse-indicator"></span>
          <div>
            <span className="fw-bold text-success">Google Sheets Operating Backend: </span>
            <span className="small text-muted">
              {googleSheetStatus?.isConfigured 
                ? 'Active Webhook Connected (Registrations & Scorecards auto-sync in real-time)' 
                : 'Zero-Database Mode (Connect Apps Script Webhook in server/.env to sync to Google Sheets)'}
            </span>
          </div>
        </div>
        {googleSheetStatus?.sheetViewUrl && googleSheetStatus.sheetViewUrl.startsWith('http') && (
          <a
            href={googleSheetStatus.sheetViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline-success btn-sm fw-bold"
          >
            Open Live Google Sheet &rarr;
          </a>
        )}
      </div>

      {/* Overview Metric Cards */}
      <div className="row row-cols-2 row-cols-md-5 g-3 mb-4">
        <div className="col">
          <div className="card border-0 shadow-sm p-3 rounded-3 bg-white">
            <div className="small text-muted text-uppercase fw-semibold" style={{ fontSize: 11 }}>Total Candidates</div>
            <div className="fs-3 fw-bold text-dark mt-1">{total}</div>
          </div>
        </div>

        <div className="col">
          <div className="card border-0 shadow-sm p-3 rounded-3 bg-white">
            <div className="small text-muted text-uppercase fw-semibold" style={{ fontSize: 11 }}>Completed Tests</div>
            <div className="fs-3 fw-bold text-success mt-1">{completed.length}</div>
          </div>
        </div>

        <div className="col">
          <div className="card border-0 shadow-sm p-3 rounded-3 bg-white">
            <div className="small text-muted text-uppercase fw-semibold" style={{ fontSize: 11 }}>Avg Score</div>
            <div className="fs-3 fw-bold text-primary mt-1">{avgScore} <span className="fs-6 text-muted font-normal">/ 50</span></div>
          </div>
        </div>

        <div className="col">
          <div className="card border-0 shadow-sm p-3 rounded-3 bg-white">
            <div className="small text-muted text-uppercase fw-semibold" style={{ fontSize: 11 }}>Platinum (100%)</div>
            <div className="fs-3 fw-bold text-primary mt-1">{platinumCount}</div>
          </div>
        </div>

        <div className="col">
          <div className="card border-0 shadow-sm p-3 rounded-3 bg-white">
            <div className="small text-muted text-uppercase fw-semibold" style={{ fontSize: 11 }}>Gold + Silver</div>
            <div className="fs-3 fw-bold text-warning mt-1">{goldCount + silverCount}</div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="card border-0 shadow-sm p-3 mb-4 rounded-3 bg-white">
        <div className="row g-3 align-items-center">
          <div className="col-md-6">
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <Search className="w-4 h-4 text-muted" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by candidate name, email, or phone..."
                className="form-control border-start-0 bg-light py-2"
              />
            </div>
          </div>

          <div className="col-md-3">
            <div className="d-flex align-items-center gap-2">
              <span className="small text-muted fw-bold text-nowrap"><Filter className="w-3.5 h-3.5" /> Coach:</span>
              <select
                value={selectedCoach}
                onChange={(e) => setSelectedCoach(e.target.value)}
                className="form-select form-select-sm"
              >
                <option value="All">All Coaches</option>
                {coachesList.length > 0 ? (
                  coachesList.map((c, i) => (
                    <option key={i} value={c}>{c}</option>
                  ))
                ) : (
                  <>
                    <option value="Sadanand B">Sadanand B</option>
                    <option value="Vaishnavi">Vaishnavi</option>
                    <option value="Vijaykumar P.">Vijaykumar P.</option>
                    <option value="Ragini">Ragini</option>
                    <option value="Dnyneshwari dhamal">Dnyneshwari dhamal</option>
                    <option value="Aaryan">Aaryan</option>
                    <option value="Jay Dhumal">Jay Dhumal</option>
                    <option value="Vanshita Pawar">Vanshita Pawar</option>
                    <option value="Saurabh Vispute">Saurabh Vispute</option>
                    <option value="Himanshu Panchal">Himanshu Panchal</option>
                    <option value="Rushikesh Dhanawade">Rushikesh Dhanawade</option>
                    <option value="Gokul">Gokul</option>
                    <option value="Darshan Mahajan">Darshan Mahajan</option>
                    <option value="Sivanand">Sivanand</option>
                    <option value="Siddharth">Siddharth</option>
                  </>
                )}
                <option value="Direct / None">Direct / None</option>
              </select>
            </div>
          </div>

          <div className="col-md-3">
            <div className="d-flex align-items-center gap-2">
              <span className="small text-muted fw-bold text-nowrap">Tier:</span>
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="form-select form-select-sm"
              >
                <option value="All">All Tiers</option>
                <option value="Platinum">Platinum (100%)</option>
                <option value="Gold">Gold (50%)</option>
                <option value="Silver">Silver (25%)</option>
                <option value="Scholarship">All Winners (≥60%)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Candidates Table */}
      <div className="card border-0 shadow-sm rounded-3 overflow-hidden bg-white">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr className="small text-uppercase text-muted fw-bold">
                <th className="py-3 px-3">Candidate</th>
                <th className="py-3 px-3">Contact & Coach</th>
                <th className="py-3 px-3 text-center">Score</th>
                <th className="py-3 px-3 text-center">Accuracy</th>
                <th className="py-3 px-3">Scholarship Tier</th>
                <th className="py-3 px-3 text-center">Proctor Flags</th>
                <th className="py-3 px-3 text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-5 text-center text-muted">
                    No candidate records found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 px-3">
                      <div className="fw-bold text-dark">{c.fullName}</div>
                      <div className="small text-muted">{c.college || 'N/A'}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="small text-dark fw-medium">{c.email}</div>
                      <div className="small text-muted">{c.phone} • Coach: <strong className="text-primary">{c.coach || 'None'}</strong></div>
                    </td>
                    <td className="py-3 px-3 text-center font-monospace fw-bold text-primary">
                      {c.totalScore !== null ? `${c.totalScore} / ${c.maxScore || 50}` : <span className="badge bg-light text-muted">Pending</span>}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {c.percentage !== null ? (
                        <span className={`badge bg-${c.percentage >= 90 ? 'primary' : c.percentage >= 75 ? 'warning text-dark' : c.percentage >= 60 ? 'info text-dark' : 'secondary'} px-2 py-1`}>
                          {c.percentage}%
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="small fw-semibold text-dark">
                        {c.scholarshipTier || 'Not Completed'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {c.violationsCount > 0 ? (
                        <span className="badge bg-danger bg-opacity-10 text-danger border border-danger-subtle px-2 py-1">
                          <AlertTriangle className="w-3 h-3 me-1" /> {c.violationsCount} Flags
                        </span>
                      ) : (
                        <span className="badge bg-success bg-opacity-10 text-success border border-success-subtle px-2 py-1">
                          <CheckCircle className="w-3 h-3 me-1" /> Clean
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-end">
                      <div className="d-flex align-items-center justify-content-end gap-2">
                        <button
                          onClick={() => handleInspectCandidate(c.id)}
                          className="btn btn-outline-primary btn-sm"
                          title="Inspect candidate audit details and webcam snapshots"
                        >
                          <Eye className="w-3.5 h-3.5 me-1" /> Inspect
                        </button>

                        <button
                          onClick={() => handleDeleteCandidate(c)}
                          className="btn btn-outline-danger btn-sm"
                          title="Remove entry and allow candidate to take a retest"
                        >
                          <RotateCcw className="w-3.5 h-3.5 me-1" /> Retest
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Candidate Audit Detail Modal */}
      {selectedCandidateId && candidateDetail && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }} tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-light py-3 px-4">
                <div>
                  <span className="small fw-bold text-primary text-uppercase tracking-wider">Proctoring & Assessment Audit</span>
                  <h5 className="modal-title fw-bold text-dark mt-0.5">{candidateDetail.candidate?.fullName}</h5>
                  <div className="small text-muted">
                    {candidateDetail.candidate?.email} &bull; {candidateDetail.candidate?.phone} &bull; Coach: <strong className="text-primary">{candidateDetail.candidate?.coach}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => { setSelectedCandidateId(null); setCandidateDetail(null); }}
                  aria-label="Close"
                ></button>
              </div>

              <div className="modal-body p-4">
                {/* Scorecard Summary */}
                {candidateDetail.submission ? (
                  <div className="row row-cols-3 g-3 p-3 bg-light rounded-3 text-center mb-4 border">
                    <div>
                      <div className="small text-muted text-uppercase fw-semibold">Total Score</div>
                      <div className="fs-3 font-monospace fw-bold text-primary mt-1">
                        {candidateDetail.submission.totalScore} / {candidateDetail.submission.maxScore}
                      </div>
                    </div>
                    <div>
                      <div className="small text-muted text-uppercase fw-semibold">Accuracy</div>
                      <div className="fs-3 font-monospace fw-bold text-success mt-1">
                        {candidateDetail.submission.percentage}%
                      </div>
                    </div>
                    <div>
                      <div className="small text-muted text-uppercase fw-semibold">Tier Award</div>
                      <div className="fs-6 fw-bold text-dark mt-2">
                        {candidateDetail.submission.scholarshipTier}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="alert alert-info text-center small mb-4">
                    Test is either in progress or was not submitted yet.
                  </div>
                )}

                {/* Proctoring Violations Log */}
                <div className="mb-4">
                  <h6 className="fw-bold text-dark text-uppercase small tracking-wider mb-2 d-flex align-items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-warning" />
                    Security Infraction Timeline ({candidateDetail.violations?.length || 0})
                  </h6>
                  {candidateDetail.violations?.length === 0 ? (
                    <div className="alert alert-success small mb-0 py-2">
                      No security infractions detected during this assessment session.
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-2 max-vh-25 overflow-y-auto">
                      {candidateDetail.violations.map((v, i) => (
                        <div key={i} className="p-2.5 rounded-3 bg-danger bg-opacity-10 border border-danger-subtle small d-flex align-items-center justify-content-between">
                          <div>
                            <span className="fw-bold text-danger uppercase me-2 font-monospace">[{v.violationType}]</span>
                            <span className="text-dark">{v.details}</span>
                          </div>
                          <span className="small text-muted font-monospace">{new Date(v.timestamp).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Proctor Snapshots Gallery */}
                {candidateDetail.snapshots?.length > 0 && (
                  <div>
                    <h6 className="fw-bold text-dark text-uppercase small tracking-wider mb-2 d-flex align-items-center gap-1.5">
                      <Camera className="w-4 h-4 text-primary" />
                      Webcam Surveillance Snapshots ({candidateDetail.snapshots.length})
                    </h6>
                    <div className="row row-cols-2 row-cols-sm-4 g-2">
                      {candidateDetail.snapshots.map((s, idx) => (
                        <div key={idx} className="rounded-3 overflow-hidden border bg-light">
                          <img
                            src={`/uploads/${s.filename}`}
                            alt="Audit Snapshot"
                            className="w-100 aspect-video object-cover"
                          />
                          <div className="p-1 small text-muted text-center font-monospace" style={{ fontSize: 10 }}>
                            {new Date(s.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer bg-light py-2 px-4 d-flex justify-content-between">
                <button
                  onClick={() => {
                    handleDeleteCandidate(candidateDetail.candidate);
                    setSelectedCandidateId(null);
                    setCandidateDetail(null);
                  }}
                  className="btn btn-outline-danger btn-sm fw-bold d-flex align-items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Allow Retest & Clear Entry
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setSelectedCandidateId(null); setCandidateDetail(null); }}
                >
                  Close Audit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


