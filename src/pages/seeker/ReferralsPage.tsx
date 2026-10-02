import React, { useEffect, useState } from "react";
import { Gift, Copy, Check, Send, Users, Award, Sparkles, TrendingUp } from "lucide-react";
import { getReferralStats, inviteFriend, claimReferral, ReferralStats } from "@/lib/api";
import { useToast } from "@/context/ToastContext";

export default function ReferralsPage() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [claimCode, setClaimCode] = useState("");
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await getReferralStats();
      setStats(data);
    } catch (err: any) {
      showToast(err.message || "Failed to load referral stats", "error");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (!stats) return;
    const fullUrl = `${window.location.origin}${stats.referral_link}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    showToast("Referral link copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setSendingInvite(true);
    try {
      await inviteFriend(inviteEmail.trim());
      showToast(`Invite recorded for ${inviteEmail}!`, "success");
      setInviteEmail("");
      await loadStats();
    } catch (err: any) {
      showToast(err.message || "Failed to send invite", "error");
    } finally {
      setSendingInvite(false);
    }
  };

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimCode.trim()) return;
    setClaiming(true);
    try {
      const res = await claimReferral(claimCode.trim());
      showToast(res.message || "Referral reward claimed!", "success");
      setClaimCode("");
      await loadStats();
    } catch (err: any) {
      showToast(err.message || "Claim failed", "error");
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto" />
        <p className="mt-3 text-slate-400 text-sm">Loading referral program...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Hero card */}
      <div className="bg-gradient-to-r from-cyan-950/70 via-slate-900 to-indigo-950/70 border border-cyan-800/40 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" /> Synapse Ambassador Program
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Invite Friends, Accelerate Careers & Earn Credits
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Give your peers access to AI resume optimization and job matchmaking. For every friend who signs up using your link, you both receive 100 Synapse reward points.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="flex-1 bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-3 flex items-center justify-between text-xs text-slate-300 font-mono">
              <span className="truncate">{stats ? `${window.location.origin}${stats.referral_link}` : ""}</span>
            </div>
            <button
              onClick={copyLink}
              className="btn-primary flex items-center justify-center gap-2 py-3 px-6 text-xs whitespace-nowrap"
            >
              {copied ? <Check className="h-4 w-4 text-white" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Invites Sent</span>
            <Users className="h-5 w-5 text-cyan-400" />
          </div>
          <p className="text-3xl font-bold text-white">{stats?.total_invites || 0}</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Joined & Verified</span>
            <TrendingUp className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-white">{stats?.successful_referrals || 0}</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Reward Points</span>
            <Award className="h-5 w-5 text-amber-400" />
          </div>
          <p className="text-3xl font-bold text-white">{stats?.total_rewards_earned || 0} pts</p>
        </div>
      </div>

      {/* Actions: Send Email Invite + Claim a code */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Send Email Invite */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-cyan-400" />
            <h2 className="text-base font-semibold text-white">Direct Email Invite</h2>
          </div>
          <p className="text-xs text-slate-400">
            Enter your friend's email address to send them a direct invitation.
          </p>
          <form onSubmit={handleSendInvite} className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="friend@example.com"
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              required
            />
            <button type="submit" disabled={sendingInvite} className="btn-primary text-xs py-2 px-4">
              {sendingInvite ? "Sending..." : "Invite"}
            </button>
          </form>
        </div>

        {/* Claim Referral Code */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-purple-400" />
            <h2 className="text-base font-semibold text-white">Have a Referral Code?</h2>
          </div>
          <p className="text-xs text-slate-400">
            Paste a referral code given by a colleague or friend to claim your 100 bonus credits.
          </p>
          <form onSubmit={handleClaim} className="flex gap-2">
            <input
              type="text"
              value={claimCode}
              onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
              placeholder="SYN-XXXX-XXXX"
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white uppercase font-mono"
              required
            />
            <button type="submit" disabled={claiming} className="btn-secondary text-xs py-2 px-4">
              {claiming ? "Claiming..." : "Apply Code"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
