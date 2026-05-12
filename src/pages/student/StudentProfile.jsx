import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase'; // adjust path as needed
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import {
  HiOutlineEnvelope,
  HiOutlineAcademicCap,
  HiOutlineUserGroup,
  HiOutlineArrowRightOnRectangle,
  HiOutlineUserCircle,
} from 'react-icons/hi2';

function getInitials(name) {
  if (!name || typeof name !== 'string') return 'S';
  return (
    name
      .trim()
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'S'
  );
}

export default function StudentProfile() {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [batchName, setBatchName] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);

  const batchId = userProfile?.batchId;

  // Fetch batch name whenever batchId changes
  useEffect(() => {
    if (!batchId) return;

    setBatchLoading(true);
    getDoc(doc(db, 'batches', batchId))
      .then((snap) => {
        if (snap.exists()) {
          setBatchName(snap.data()?.name || batchId);
        } else {
          setBatchName(null); // doc missing — fall back gracefully
        }
      })
      .catch(() => setBatchName(null))
      .finally(() => setBatchLoading(false));
  }, [batchId]);

  if (!currentUser || !userProfile) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted">Please log in to view your profile.</p>
      </div>
    );
  }

  const name = userProfile?.name || 'Student';
  const email = userProfile?.email || currentUser?.email || '—';
  const grade = userProfile?.grade || '—';
  const initials = getInitials(name);

  // Resolved display value for the Batch row
  const batchDisplay = batchLoading
    ? 'Loading…'
    : batchName
      ? batchName
      : batchId
        ? batchId          // fallback: show raw ID if name not found
        : 'Not assigned';

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Profile Card */}
      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-blue-800 to-blue-600" />

        <div className="px-5 pb-5">
          <div className="-mt-8 mb-4">
            <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold border-4 border-white shadow-md select-none">
              {initials}
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-dark">{name}</h2>
              <Badge variant="primary">Grade {grade}</Badge>
            </div>
            <p className="text-sm text-muted mt-1">Olympiad Maths Student</p>
          </div>

          <div className="space-y-2.5">
            <InfoRow icon={HiOutlineUserCircle} label="Full Name" value={name} />
            <InfoRow icon={HiOutlineEnvelope} label="Email" value={email} />
            <InfoRow
              icon={HiOutlineAcademicCap}
              label="Grade"
              value={grade !== '—' ? `Grade ${grade}` : '—'}
            />
            {/* ✅ Now shows batch name instead of raw ID */}
            <InfoRow
              icon={HiOutlineUserGroup}
              label="Batch"
              value={batchDisplay}
              loading={batchLoading}
            />
          </div>
        </div>
      </Card>

      {/* Logout */}
      <Card className="p-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium transition-colors cursor-pointer"
        >
          <HiOutlineArrowRightOnRectangle className="w-4 h-4" />
          Sign out of your account
        </button>
        <p className="text-[11px] text-faint mt-1">
          You will need to sign in again to access your exams.
        </p>
      </Card>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, loading = false }) {
  const isEmpty = !value || value === '—' || value === 'Not assigned';

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50/70 border border-slate-100">
      <Icon className={`w-4 h-4 shrink-0 ${isEmpty ? 'text-faint' : 'text-muted'}`} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider font-medium text-faint">
          {label}
        </p>
        {loading ? (
          <div className="h-3 w-24 bg-slate-200 rounded animate-pulse mt-1" />
        ) : (
          <p className={`text-[13px] truncate ${isEmpty ? 'text-faint' : 'text-dark font-medium'}`}>
            {value || 'Not available'}
          </p>
        )}
      </div>
    </div>
  );
}