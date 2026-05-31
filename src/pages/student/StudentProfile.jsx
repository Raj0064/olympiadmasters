import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { changeStudentPassword } from '../../services/student.service';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { FiEyeOff } from 'react-icons/fi';
import { BsEye } from 'react-icons/bs';
import {
  HiOutlineEnvelope,
  HiOutlineAcademicCap,
  HiOutlineUserGroup,
  HiOutlineArrowRightOnRectangle,
  HiOutlineUserCircle,
  HiOutlineLockClosed,
  HiOutlineXMark,
} from 'react-icons/hi2';

function getInitials(name) {
  if (!name || typeof name !== 'string') return 'S';
  return (
    name.trim().split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'S'
  );
}

// ─── Password Input ───────────────────────────────────────────────────────────
function PasswordInput({ placeholder, value, onChange, required }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full px-3 py-2.5 pr-10 rounded-xl border-2 border-gray-200 text-sm focus:outline-none focus:border-accent transition"
      />
      <button
        type="button"
        onClick={() => setShow((p) => !p)}
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
      >
        {show ? <FiEyeOff size={16} /> : <BsEye size={16} />}
      </button>
    </div>
  );
}

// ─── Change Password Modal ────────────────────────────────────────────────────
function ChangePasswordModal({ currentUser, onClose }) {
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const field = (key) => ({
    value: pwForm[key],
    onChange: (e) => setPwForm((p) => ({ ...p, [key]: e.target.value })),
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);

    if (pwForm.next.length < 6) return setPwError('New password must be at least 6 characters.');
    if (pwForm.next !== pwForm.confirm) return setPwError('Passwords do not match.');
    if (pwForm.current === pwForm.next) return setPwError('New password must be different from current.');

    setPwLoading(true);
    try {
      await changeStudentPassword(currentUser, pwForm.current, pwForm.next);
      setPwSuccess(true);
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      const messages = {
        'auth/wrong-password': 'Current password is incorrect.',
        'auth/invalid-credential': 'Current password is incorrect.',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
        'auth/requires-recent-login': 'Session expired. Please log out and sign back in.',
      };
      setPwError(messages[err.code] ?? 'Failed to change password.');
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <div className="h-screen fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-bold text-dark">Change Password</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-black/5 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <HiOutlineXMark className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-5">Enter your current password to set a new one.</p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Current Password
            </label>
            <PasswordInput placeholder="Enter current password" required {...field('current')} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              New Password
            </label>
            <PasswordInput placeholder="Min. 6 characters" required {...field('next')} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Confirm New Password
            </label>
            <PasswordInput placeholder="Repeat new password" required {...field('confirm')} />
          </div>

          {pwError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {pwError}
            </p>
          )}
          {pwSuccess && (
            <p className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
              Password updated successfully.
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-500 hover:border-gray-300 hover:text-gray-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pwLoading}
              className="flex-1 py-2.5 rounded-xl bg-accent text-white text-sm font-bold hover:bg-primary transition disabled:opacity-50"
            >
              {pwLoading ? 'Updating…' : 'Update'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function StudentProfile() {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [batchName, setBatchName] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);

  const batchId = userProfile?.batchId;

  useEffect(() => {
    if (!batchId) return;
    setBatchLoading(true);
    getDoc(doc(db, 'batches', batchId))
      .then((snap) => setBatchName(snap.exists() ? snap.data()?.name || batchId : null))
      .catch(() => setBatchName(null))
      .finally(() => setBatchLoading(false));
  }, [batchId]);

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

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

  const batchDisplay = batchLoading ? 'Loading…'
    : batchName ? batchName
      : batchId ? batchId
        : 'Not assigned';

  return (
    <div className="max-w-lg mx-auto space-y-6">

      {showPwModal && (
        <ChangePasswordModal
          currentUser={currentUser}
          onClose={() => setShowPwModal(false)}
        />
      )}

      {/* ── Profile Card ─────────────────────────────────────────────── */}
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
            <InfoRow icon={HiOutlineAcademicCap} label="Grade" value={grade !== '—' ? `Grade ${grade}` : '—'} />
            <InfoRow icon={HiOutlineUserGroup} label="Batch" value={batchDisplay} loading={batchLoading} />
          </div>
        </div>
      </Card>

      {/* ── Account Actions ───────────────────────────────────────────── */}
      <Card className="p-4 space-y-1">
        <button
          onClick={() => setShowPwModal(true)}
          className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm text-dark hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <HiOutlineLockClosed className="w-4 h-4 text-muted shrink-0" />
          <span className="font-medium">Change Password</span>
        </button>

        <div className="border-t border-slate-100" />

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
        >
          <HiOutlineArrowRightOnRectangle className="w-4 h-4 shrink-0" />
          <span className="font-medium">Sign Out</span>
        </button>
      </Card>

    </div>
  );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value, loading = false }) {
  const isEmpty = !value || value === '—' || value === 'Not assigned';
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50/70 border border-slate-100">
      <Icon className={`w-4 h-4 shrink-0 ${isEmpty ? 'text-faint' : 'text-muted'}`} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider font-medium text-faint">{label}</p>
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