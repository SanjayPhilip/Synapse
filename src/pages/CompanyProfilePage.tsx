import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Building2,
  Globe,
  MapPin,
  Users,
  Briefcase,
  CheckCircle2,
  Share2,
  Edit3,
  ExternalLink,
  Award,
  Sparkles,
} from "lucide-react";
import { getCompany, getMyCompany, updateMyCompany, CompanyProfile } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

export default function CompanyProfilePage() {
  const { id: slugOrId } = useParams<{ id?: string }>();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const isEmployer = profile?.role === "employer" || profile?.role === "both";

  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<CompanyProfile>>({});
  const [newPerk, setNewPerk] = useState("");
  const [newCulture, setNewCulture] = useState("");

  useEffect(() => {
    loadCompany();
  }, [slugOrId]);

  const loadCompany = async () => {
    setLoading(true);
    try {
      if (slugOrId) {
        const data = await getCompany(slugOrId);
        setCompany(data);
        setFormData(data);
      } else if (isEmployer) {
        const data = await getMyCompany();
        setCompany(data);
        setFormData(data);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load company", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await updateMyCompany(formData);
      setCompany(updated);
      setEditing(false);
      showToast("Company profile updated successfully!", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to save profile", "error");
    }
  };

  const addPerk = () => {
    if (!newPerk.trim()) return;
    const perks = [...(formData.perks || []), newPerk.trim()];
    setFormData({ ...formData, perks });
    setNewPerk("");
  };

  const removePerk = (index: number) => {
    const perks = (formData.perks || []).filter((_, i) => i !== index);
    setFormData({ ...formData, perks });
  };

  const addCulture = () => {
    if (!newCulture.trim()) return;
    const culture = [...(formData.culture || []), newCulture.trim()];
    setFormData({ ...formData, culture });
    setNewCulture("");
  };

  const removeCulture = (index: number) => {
    const culture = (formData.culture || []).filter((_, i) => i !== index);
    setFormData({ ...formData, culture });
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto" />
        <p className="mt-3 text-slate-400 text-sm">Loading company profile...</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center">
        <Building2 className="h-12 w-12 text-slate-600 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Company Not Found</h2>
        <p className="text-slate-400 text-sm mb-6">The company brand page you are looking for does not exist.</p>
        <Link to="/app/jobs" className="btn-primary">Browse Jobs</Link>
      </div>
    );
  }

  const canEdit = isEmployer && profile?.id === company.employer_id;

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Banner & Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="h-44 sm:h-56 bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950 relative">
          {company.banner_url && (
            <img src={company.banner_url} alt="Banner" className="w-full h-full object-cover opacity-40" />
          )}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => setEditing(!editing)}
                className="btn-secondary text-xs flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md"
              >
                <Edit3 className="h-3.5 w-3.5" />
                {editing ? "Cancel Edit" : "Edit Branding"}
              </button>
            )}
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                showToast("Company link copied to clipboard", "info");
              }}
              className="btn-secondary text-xs flex items-center gap-1 bg-slate-900/80 backdrop-blur-md"
            >
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
          </div>
        </div>

        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between -mt-16 sm:-mt-20 gap-4 mb-4">
            <div className="flex items-end gap-4">
              <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl bg-slate-800 border-4 border-slate-900 flex items-center justify-center overflow-hidden shadow-2xl">
                {company.logo_url ? (
                  <img src={company.logo_url} alt={company.company_name} className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-12 w-12 text-cyan-400" />
                )}
              </div>
              <div className="pb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                  {company.company_name}
                  <CheckCircle2 className="h-5 w-5 text-cyan-400" />
                </h1>
                <p className="text-sm text-cyan-300/90 font-medium mt-0.5">{company.tagline || "Verified Employer on Synapse"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link to={`/app/jobs?q=${encodeURIComponent(company.company_name)}`} className="btn-primary flex items-center gap-1.5 text-xs">
                <Briefcase className="h-3.5 w-3.5" />
                View Open Jobs ({company.active_jobs_count || 0})
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-slate-400 border-t border-slate-800/80 pt-4">
            {company.headquarters && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-500" /> {company.headquarters}
              </div>
            )}
            {company.company_size && (
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-slate-500" /> {company.company_size} employees
              </div>
            )}
            {company.industry && (
              <div className="flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-slate-500" /> {company.industry}
              </div>
            )}
            {company.website && (
              <a
                href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-cyan-400 hover:underline"
              >
                <Globe className="h-3.5 w-3.5" /> Website <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>

      {editing ? (
        /* Edit Form for Employer */
        <form onSubmit={handleSave} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white">Edit Company Brand Page</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Company Name</label>
              <input
                type="text"
                value={formData.company_name || ""}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Tagline</label>
              <input
                type="text"
                value={formData.tagline || ""}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                placeholder="e.g. Building the future of intelligent infrastructure"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Headquarters</label>
              <input
                type="text"
                value={formData.headquarters || ""}
                onChange={(e) => setFormData({ ...formData, headquarters: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                placeholder="e.g. San Francisco, CA / Remote"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Industry</label>
              <input
                type="text"
                value={formData.industry || ""}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                placeholder="e.g. Artificial Intelligence / Cloud"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Website URL</label>
              <input
                type="url"
                value={formData.website || ""}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Company Size</label>
              <select
                value={formData.company_size || "1-50"}
                onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="1-10">1-10 Employees</option>
                <option value="11-50">11-50 Employees</option>
                <option value="51-200">51-200 Employees</option>
                <option value="201-1000">201-1000 Employees</option>
                <option value="1000+">1000+ Employees</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">About & Mission</label>
            <textarea
              rows={4}
              value={formData.overview || ""}
              onChange={(e) => setFormData({ ...formData, overview: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              placeholder="Describe your company, mission, and what makes working with you unique..."
            />
          </div>

          {/* Perks */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Perks & Benefits</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newPerk}
                onChange={(e) => setNewPerk(e.target.value)}
                placeholder="Add perk (e.g. $2,000 Learning Stipend)"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              />
              <button type="button" onClick={addPerk} className="btn-secondary text-xs">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(formData.perks || []).map((p, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 rounded-full text-xs">
                  {p}
                  <button type="button" onClick={() => removePerk(i)} className="hover:text-red-400 font-bold">&times;</button>
                </span>
              ))}
            </div>
          </div>

          {/* Culture */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Company Culture & Values</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newCulture}
                onChange={(e) => setNewCulture(e.target.value)}
                placeholder="Add cultural value (e.g. Asynchronous first)"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              />
              <button type="button" onClick={addCulture} className="btn-secondary text-xs">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(formData.culture || []).map((c, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-950/60 text-purple-300 border border-purple-800/60 rounded-full text-xs">
                  {c}
                  <button type="button" onClick={() => removeCulture(i)} className="hover:text-red-400 font-bold">&times;</button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button type="button" onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Changes</button>
          </div>
        </form>
      ) : (
        /* Public Brand Page View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Overview */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                About {company.company_name}
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                {company.overview || "No overview provided yet."}
              </p>
            </div>

            {/* Perks & Benefits */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Perks & Benefits</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(company.perks && company.perks.length > 0 ? company.perks : ["Competitive Compensation", "Health & Wellness Coverage", "Flexible Schedule", "Annual Offsites"]).map((p, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-200">{p}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Culture */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Culture & Principles</h2>
              <div className="flex flex-wrap gap-2.5">
                {(company.culture && company.culture.length > 0 ? company.culture : ["Impact-Driven", "High Ownership", "Transparent Communication"]).map((c, i) => (
                  <span key={i} className="px-3.5 py-1.5 rounded-xl bg-indigo-950/40 text-indigo-300 border border-indigo-800/50 text-xs font-medium">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar CTA */}
          <div className="space-y-6">
            <div className="bg-gradient-to-b from-cyan-950/40 to-slate-900/80 border border-cyan-900/50 rounded-2xl p-6 text-center space-y-4 shadow-xl">
              <Building2 className="h-10 w-10 text-cyan-400 mx-auto" />
              <div>
                <h3 className="text-base font-semibold text-white">Join Our Team</h3>
                <p className="text-xs text-slate-400 mt-1">Explore open opportunities and match your skills directly.</p>
              </div>
              <Link to={`/app/jobs?q=${encodeURIComponent(company.company_name)}`} className="btn-primary w-full block py-2.5 text-xs">
                View Open Positions
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
