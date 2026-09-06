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
      <div className="container py-5">
        <div className="card p-4 text-center">
          <div className="d-flex align-items-center justify-content-center mx-auto mb-4 border rounded">
            <Key className="w-6 h-6" />
          </div>
          <h2 className="fs-4 fw-bold text-white mb-1">Admin & Coach Portal</h2>
          <p className="fs-6 text-muted mb-3">Enter security PIN to access proctoring audits and candidate scorecards.</p>

          {pinError && (
            <div className="alert alert-danger border border-danger rounded mb-3 p-3">
              {pinError}
            </div>
          )}

          <form onSubmit={handleLogin} className="d-grid gap-3">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN (admin123)"
              className="form-control text-center fs-5"
              autoFocus
            />
            <button type="submit" className="btn btn-primary w-100 py-2 fs-6 fw-bold">
              Unlock Dashboard <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      {/* Top Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <div>
          <span className="small fw-bold text-primary text-uppercase">Administration Suite</span>
          <h1 className="fs-2 fw-bold text-white">Live Proctoring & Candidate Leaderboard</h1>
        </div>

        <div className="d-flex align-items-center gap-2">
          <a
            href="/api/admin/export-csv"
            download="scholarship_results.csv"
            className="btn btn-secondary py-2 px-3 fs-6 fw-bold"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </a>
          <button
            onClick={loadCandidates}
            className="btn btn-primary py-2 px-3 fs-6 fw-bold"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* Google Sheets Operating Status Banner */}
      <div className="alert alert-success d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3 p-3 border">
        <div className="d-flex align-items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <div>
            <span className="fs-6 fw-bold text-success">Google Sheets Operating Backend: </span>
            <span className="fs-6 text-muted">
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
            className="btn btn-outline-success py-1 px-2 fs-6 fw-bold"
          >
            Open Live Google Sheet &rarr;
          </a>
        )}
      </div>

      {/* Overview Metric Cards */}
      <div className="row row-cols-2 row-cols-md-5 g-4 mb-3">
        <div className="col">
          <div className="card p-3 mb-3">
            <div className="small text-muted text-uppercase fw-semibold">Total Candidates</div>
            <div className="fs-4 fw-bold text-white mt-1">{total}</div>
          </div>
        </div>

        <div className="col">
          <div className="card p-3 mb-3">
            <div className="small text-muted text-uppercase fw-semibold">Completed Tests</div>
            <div className="fs-4 fw-bold text-success mt-1">{completed.length}</div>
          </div>
        </div>

        <div className="col">
          <div className="card p-3 mb-3">
            <div className="small text-muted text-uppercase fw-semibold">Avg Score</div>
            <div className="fs-4 fw-bold text-info mt-1">{avgScore} / 50</div>
          </div>
        </div>

        <div className="col">
          <div className="card p-3 mb-3">
            <div className="small text-muted text-uppercase fw-semibold">Platinum (100%)</div>
            <div className="fs-4 fw-bold text-primary mt-1">{platinumCount}</div>
          </div>
        </div>

        <div className="col">
          <div className="card p-3 mb-3">
            <div className="small text-muted text-uppercase fw-semibold">Gold + Silver</div>
            <div className="fs-4 fw-bold text-warning mt-1">{goldCount + silverCount}</div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="card p-3 mb-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="d-flex align-items-center gap-2 flex-grow-1">
          <Search className="w-4 h-4 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate by name, email, or phone..."
            className="form-control fs-6 py-2"
          />
        </div>

        <div className="d-flex align-items-center gap-2">
          <div className="d-flex align-items-center gap-1 text-muted fs-6">
            <Filter className="w-3.5 h-3.5" /> Coach:
          </div>
          <select
            value={selectedCoach}
            onChange={(e) => setSelectedCoach(e.target.value)}
            className="form-select form-select-sm w-auto"
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

          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="form-select form-select-sm w-auto"
          >
            <option value="All">All Tiers</option>
            <option value="Platinum">Platinum (100%)</option>
            <option value="Gold">Gold (50%)</option>
            <option value="Silver">Silver (25%)</option>
            <option value="Scholarship">All Scholarship Winners (≥60%)</option>
          </select>
        </div>
      </div>

      {/* Candidates Table */}
      <div className="glass-panel overflow-hidden">
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="bg-light text-dark">
              <tr>
                <th className="p-2">Candidate</th>
                <th className="p-2">Contact & Coach</th>
                <th className="p-2 text-center">Score / Max</th>
                <th className="p-2 text-center">Accuracy</th>
                <th className="p-3">Scholarship Tier</th>
                <th className="p-3 text-center">Security Violations</th>
                <th className="p-3 text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500">
                    No candidate records found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((c) => (
                  <tr key={c.id}>
                    <td className="p-3 font-medium text-white">
                      <div className="fw-bold">{c.fullName}</div>
                      <div className="small text-muted">{c.college || 'N/A'}</div>
                    </td>
                    <td className="p-3 text-muted">
                      <div>{c.email}</div>
                      <div className="small text-muted">{c.phone} • Coach: <strong className="text-info">{c.coach || 'None'}</strong></div>
                    </td>
                    <td className="p-3 text-center fw-bold text-primary">
                      {c.totalScore !== null ? `${c.totalScore} / ${c.maxScore || 50}` : <span className="text-muted">Pending</span>}
                    </td>
                    <td className="p-3 text-center">
                      {c.percentage !== null ? (
                        <span className={`badge bg-${c.percentage >= 90 ? 'primary' : c.percentage >= 75 ? 'warning' : c.percentage >= 60 ? 'info' : 'secondary'} text-white`)}>
                          {c.percentage}%
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="text-xs font-semibold text-slate-200">
                        {c.scholarshipTier || 'Not Completed'}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      {c.violationsCount > 0 ? (
                        <span className="inline-d-flex align-items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold font-mono text-[11px]">
                          <AlertTriangle className="w-3 h-3" /> {c.violationsCount} Flags
                        </span>
                      ) : (
                        <span className="inline-d-flex align-items-center gap-1 text-emerald-400 text-[11px]">
                          <CheckCircle className="w-3 h-3" /> Clean
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-end">
                      <div className="d-flex align-items-center gap-2">
                        <button
                          onClick={() => handleInspectCandidate(c.id)}
                          className="btn btn-outline-secondary btn-sm"
                          title="Inspect candidate audit details and webcam snapshots"
                        >
                          <Eye className="w-3.5 h-3.5" /> Inspect
                        </button>

                        <button
                          onClick={() => handleDeleteCandidate(c)}
                          className="btn btn-outline-danger btn-sm"
                          title="Remove entry and allow candidate to take a retest"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Allow Retest
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md d-flex align-items-center justify-content-center p-4 overflow-y-auto">
          <div className="glass-panel-glow max-w-3xl w-full p-6 my-8 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="d-flex items-start justify-content-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Proctoring & Assessment Audit</span>
                <h3 className="text-xl font-bold text-white mt-0.5">{candidateDetail.candidate?.fullName}</h3>
                <p className="text-xs text-slate-400">
                  {candidateDetail.candidate?.email} &bull; {candidateDetail.candidate?.phone} &bull; Coach: <strong className="text-sky-300">{candidateDetail.candidate?.coach}</strong>
                </p>
              </div>

              <div className="d-flex align-items-center gap-2">
                <button
                  onClick={() => {
                    handleDeleteCandidate(candidateDetail.candidate);
                    setSelectedCandidateId(null);
                    setCandidateDetail(null);
                  }}
                  className="py-1.5 px-3 text-xs font-bold rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 transition-colors d-flex align-items-center gap-1.5"
                  title="Remove candidate record & reset attempt so they can retake the exam"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Allow Retest
                </button>

                <button
                  onClick={() => { setSelectedCandidateId(null); setCandidateDetail(null); }}
                  className="btn-secondary py-1.5 px-3 text-xs"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Scorecard Summary */}
            {candidateDetail.submission ? (
              <div className="my-6 row row-cols-3 g-3 p-4 bg-slate-900/80 rounded-xl border border-slate-800 text-center text-xs">
                <div>
                  <div className="text-slate-400 uppercase font-semibold">Total Score</div>
                  <div className="text-2xl font-extrabold text-sky-400 font-mono mt-1">
                    {candidateDetail.submission.totalScore} / {candidateDetail.submission.maxScore}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 uppercase font-semibold">Accuracy</div>
                  <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
                    {candidateDetail.submission.percentage}%
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 uppercase font-semibold">Tier Award</div>
                  <div className="text-sm font-extrabold text-purple-300 mt-2">
                    {candidateDetail.submission.scholarshipTier}
                  </div>
                </div>
              </div>
            ) : (
              <div className="my-4 p-4 bg-slate-900/60 rounded-xl text-center text-xs text-slate-400">
                Test is either in progress or was not submitted yet.
              </div>
            )}

            {/* Proctoring Violations Log */}
            <div className="my-6">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 d-flex align-items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Security Infraction Timeline ({candidateDetail.violations?.length || 0})
              </h4>
              {candidateDetail.violations?.length === 0 ? (
                <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs">
                  No security infractions detected during this assessment session.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {candidateDetail.violations.map((v, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-xs d-flex align-items-center justify-content-between">
                      <div>
                        <span className="font-bold text-amber-300 uppercase mr-2 font-mono">[{v.violationType}]</span>
                        <span className="text-slate-300">{v.details}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">{new Date(v.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Proctor Snapshots Gallery */}
            {candidateDetail.snapshots?.length > 0 && (
              <div className="my-6">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 d-flex align-items-center gap-1.5">
                  <Camera className="w-4 h-4 text-sky-400" />
                  Webcam Surveillance Snapshots ({candidateDetail.snapshots.length})
                </h4>
                <div className="row row-cols-3 row-cols-sm-4 g-3">
                  {candidateDetail.snapshots.map((s, idx) => (
                    <div key={idx} className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
                      <img
                        src={`/uploads/${s.filename}`}
                        alt="Audit Snapshot"
                        className="w-full aspect-video object-cover"
                      />
                      <div className="p-1 text-[10px] text-slate-400 text-center font-mono">
                        {new Date(s.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


