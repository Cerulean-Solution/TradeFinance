import React, { useEffect, useState } from 'react';
import { Plus, Search, Eye, Trash2, AlertTriangle, SparklesIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../store/sessionStore';
import { Session } from '../types';

const Sessions: React.FC = () => {
  const navigate = useNavigate();
  const { sessions, loadSessions, isLoading, setCurrentSession } = useSessionStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter] = useState('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const filteredSessions = sessions.filter(session => {
    const matchesSearch =
      session.lc_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.cifno.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.lifecycle.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'reviewing': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'frozen': return 'bg-gray-100 text-gray-800';
      case 'uploading': return 'bg-purple-100 text-purple-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const handleViewSession = (session: Session) => {
    localStorage.setItem(
      "currentSession",
      JSON.stringify({
        cifno: session.cifno,
        lc_number: session.lc_number,
        lifecycle: session.lifecycle,
        sessionID: session.id,
        status: session.status,
        createdAt: session.createdAt,
      })
    );
    setCurrentSession(session);
    navigate(`/tf_genie/discrepancy/ocr-factory/${session.id}`);
  };

  const handleDeleteSession = async () => {
    try {
      const documentId = localStorage.getItem('documentId');
      const response = await fetch(`http://localhost:3000/api/documents/${documentId}`, {
        method: 'DELETE',
      });
      await response.json();
    } catch (err) {
      console.error(err);
    }
  };

  const canDeleteSession = (session: Session) => {
    return session.status !== 'completed';
  };

  if (isLoading) {
    return (
      <div className="p-6 animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-slate-200 rounded"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">

      {/* Header */}
      <div className="bg-white rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <SparklesIcon className="text-blue-400" />
              Sessions
            </h1>
            <p className="text-slate-600 text-sm sm:text-base">
              Manage your document processing sessions
            </p>
          </div>

          <button
            onClick={() => navigate('/tf_genie/discrepancy/create-session')}
            className="w-full sm:w-auto bg-blue-100 text-blue-600 px-4 py-2 rounded-lg flex justify-center items-center gap-2 hover:bg-blue-200 transition"
          >
            <Plus size={18} />
            New Session
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 sm:p-6 rounded-xl border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by LC, CIF, Lifecycle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl border overflow-x-auto">
        <table className="table min-w-full table-auto">
          <thead className="h-16">
            <tr className='text-left'>
              <th className="px-3 py-3 text-left">Session ID</th>
              <th className="px-3 py-3 text-left">LC & CIF</th>
              <th className="px-3 py-3 text-left">Instrument</th>
              <th className="px-3 py-3 text-left">Created</th>
              <th className="px-3 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSessions.map(session => (
              <tr key={session.id} className="text-left h-16  hover:bg-gray-100">
                <td className="px-3 py-3">{session.id}</td>
                <td className="px-3 py-3">
                  <p>LC: {session.lc_number}</p>
                  <p className="text-xs text-slate-500">CIF: {session.cifno}</p>
                </td>
                <td className="px-3 py-3">
                  <p>{session.instrument}</p>
                  <span className="text-xs bg-slate-200 px-2 rounded">
                    {session.lifecycle}
                  </span>
                </td>
                <td className="px-3 py-3">
                  {new Date(session.createdAt).toLocaleString()}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    {/* View */}
                    <button
                      onClick={() => handleViewSession(session)}
                      className="w-8 h-8 flex items-center justify-center rounded-full 
                 text-blue-600 hover:bg-blue-50 transition"
                      title="View"
                    >
                      <Eye size={16} />
                    </button>

                    {/* Delete */}
                    {canDeleteSession(session) && (
                      <button
                        onClick={() => setShowDeleteConfirm(session.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-full 
                   text-red-600 hover:bg-red-50 transition"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {filteredSessions.map(session => (
          <div key={session.id} className="bg-white p-4 rounded-xl border space-y-2">
            <div className="flex justify-between">
              <p className="font-semibold">{session.id}</p>
              <span className={`text-xs px-2 py-1 rounded ${getStatusColor(session.status)}`}>
                {session.status}
              </span>
            </div>
            <p>LC: {session.lc_number}</p>
            <p>CIF: {session.cifno}</p>
            <p>Instrument: {session.instrument}</p>
            <p className="text-xs text-slate-500">
              {new Date(session.createdAt).toLocaleString()}
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => handleViewSession(session)} className="text-blue-600">
                View
              </button>
              {canDeleteSession(session) && (
                <button onClick={() => setShowDeleteConfirm(session.id)} className="text-red-600">
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Delete Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md">
            <div className="flex gap-3 mb-4">
              <AlertTriangle className="text-red-600" />
              <div>
                <h3 className="font-semibold">Delete Session</h3>
                <p className="text-sm text-slate-500">This action cannot be undone</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 border rounded-lg py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSession}
                className="flex-1 bg-red-600 text-white rounded-lg py-2"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sessions;
