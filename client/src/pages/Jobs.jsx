import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../configs/api";
import toast from "react-hot-toast";

const Jobs = () => {
  const { resumeId } = useParams();
  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiData, setAiData] = useState(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchText, setSearchText] = useState("");

  const hasFetchedRef = useRef(false);

  const loadJobs = useCallback(async () => {
    if (!resumeId) return;

    if (!token) {
      toast.error("Please login first");
      navigate("/login");
      return;
    }

    try {
      setLoading(true);

      const { data } = await api.get(`/api/jobs/ai-match/${resumeId}`, {
        headers: {
          Authorization: token,
        },
        params: {
          t: Date.now(),
        },
      });

      setJobs(Array.isArray(data?.jobs) ? data.jobs : []);
      setAiData(data?.ai || null);
      setQuery(data?.query || "");
      setSelectedIndex(0);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to fetch jobs"
      );
    } finally {
      setLoading(false);
    }
  }, [resumeId, token, navigate]);

  useEffect(() => {
    if (!resumeId || !token) return;

    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    loadJobs();
  }, [resumeId, token, loadJobs]);

  const handleRefresh = async () => {
    await loadJobs();
  };

  const filteredJobs = useMemo(() => {
    if (!searchText.trim()) return jobs;

    const text = searchText.toLowerCase();

    return jobs.filter((job) => {
      const title = job?.title?.toLowerCase() || "";
      const company = job?.company_name?.toLowerCase() || "";
      const location = job?.location?.toLowerCase() || "";
      const description = job?.description?.toLowerCase() || "";

      return (
        title.includes(text) ||
        company.includes(text) ||
        location.includes(text) ||
        description.includes(text)
      );
    });
  }, [jobs, searchText]);

  const selectedJob = filteredJobs[selectedIndex] || null;

  useEffect(() => {
    if (selectedIndex >= filteredJobs.length) {
      setSelectedIndex(0);
    }
  }, [filteredJobs.length, selectedIndex]);

  // Same logic (no change)
  const applyLink =
    selectedJob?.related_links?.[0]?.link || selectedJob?.share_link || "";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
              AI Matched Jobs
            </h1>

            {query && (
              <p className="text-sm text-slate-500 mt-1">
                Search query:{" "}
                <span className="font-medium text-slate-700">{query}</span>
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-60"
            >
              {loading ? "Loading..." : "Refresh Jobs"}
            </button>

            <button
              onClick={() => navigate("/app")}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-white transition"
            >
              Back
            </button>
          </div>
        </div>

        {/* AI Analysis */}
        {aiData && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              AI Analysis
            </h2>

            <p className="text-sm text-slate-700 mb-3">
              <span className="font-semibold">Suggested role:</span>{" "}
              {aiData?.jobTitle || "Not available"}
            </p>

            {Array.isArray(aiData?.keywords) && aiData.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {aiData.keywords.map((keyword, index) => (
                  <span
                    key={`${keyword}-${index}`}
                    className="px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700 border border-blue-100"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6">
          <input
            type="text"
            placeholder="Search jobs, company, location..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Jobs */}
        {loading ? (
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <p>Loading jobs...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <p>No matching jobs found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Job List */}
            <div className="lg:col-span-5 xl:col-span-4">
              <div className="space-y-4 max-h-[75vh] overflow-y-auto">
                {filteredJobs.map((job, index) => {
                  const active = index === selectedIndex;

                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedIndex(index)}
                      className={`w-full text-left border rounded-xl p-4 transition shadow-sm ${
                        active
                          ? "border-blue-600 bg-blue-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <h3 className="font-semibold">{job.title}</h3>
                      <p className="text-sm">{job.company_name}</p>
                      <p className="text-sm text-slate-500">{job.location}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Job Detail */}
            <div className="lg:col-span-7 xl:col-span-8">
              {selectedJob && (
                <div className="bg-white border rounded-xl p-6 shadow-sm">
                  <h2 className="text-xl font-bold">
                    {selectedJob.title}
                  </h2>

                  <p className="mt-1">{selectedJob.company_name}</p>
                  <p className="text-slate-500">
                    {selectedJob.location}
                  </p>

                  {/* ✅ Only Apply Button (Google removed) */}
                  <div className="mt-5">
                    {applyLink && (
                      <a
                        href={applyLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 hover:shadow-md transition"
                      >
                        Apply Now
                      </a>
                    )}
                  </div>

                  <div className="mt-6">
                    <h3 className="font-semibold mb-2">
                      Job Description
                    </h3>
                    <p className="text-slate-600 whitespace-pre-line">
                      {selectedJob.description}
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default Jobs;